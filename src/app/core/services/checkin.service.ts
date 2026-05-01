import { Injectable, inject, signal } from '@angular/core';
import { CheckIn } from '../models/checkin.model';
import { AuthService } from './auth.service';
import { SupabaseService } from './supabase.service';

export type DensityLevel = 'empty' | 'chill' | 'moderate' | 'busy' | 'packed';

export interface ActiveCheckIn {
    userId: string;
    displayName: string;
    photoURL: string;
    cafeId: string;
    timestamp: string;
}

export interface CafeDensity {
    cafeId: string;
    count: number;
    level: DensityLevel;
}

function getDensityLevel(count: number): DensityLevel {
    if (count === 0) return 'empty';
    if (count <= 3) return 'chill';
    if (count <= 8) return 'moderate';
    if (count <= 15) return 'busy';
    return 'packed';
}

const ACTIVE_WINDOW_MS = 2 * 60 * 60 * 1000; // 2 hours

@Injectable({ providedIn: 'root' })
export class CheckInService {
    private supabase = inject(SupabaseService);
    private authService = inject(AuthService);

    densityMap = signal<Map<string, CafeDensity>>(new Map());
    activePeopleAtCafe = signal<ActiveCheckIn[]>([]);

    private realtimeChannel: any = null;
    private densityChannel: any = null;

    async checkIn(cafeId: string, cafeName: string): Promise<void> {
        const user = this.authService.currentUser();
        if (!user) throw new Error('Not authenticated');

        // Guard: prevent duplicate check-ins within the 2-hour window
        const alreadyCheckedIn = await this.hasCheckedInToday(cafeId);
        if (alreadyCheckedIn) throw new Error('Already checked in at this cafe recently.');

        const pointsEarned = 25;

        const checkin = {
            userId: user.uid,
            cafeId,
            cafeName,
            timestamp: new Date().toISOString(),
            pointsEarned,
        };

        await this.supabase.client.from('checkins').insert(checkin);

        // Update live_checkins (upsert)
        await this.supabase.client.from('live_checkins').upsert({
            userId: user.uid,
            displayName: user.displayName,
            photoURL: user.photoURL || '',
            cafeId,
            timestamp: new Date().toISOString(),
        });

        // Streak calculation
        const today = new Date().toISOString().split('T')[0];
        const { data: userData } = await this.supabase.client
            .from('users')
            .select('streak, lastCheckinDate, points, totalCheckins, badges')
            .eq('uid', user.uid)
            .single();

        const lastDate = userData?.lastCheckinDate;
        const currentStreak = userData?.streak || 0;

        let newStreak: number;
        if (!lastDate) {
            newStreak = 1;
        } else if (lastDate === today) {
            newStreak = currentStreak;
        } else {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split('T')[0];
            newStreak = lastDate === yesterdayStr ? currentStreak + 1 : 1;
        }

        await this.supabase.client
            .from('users')
            .update({
                points: (userData?.points || 0) + pointsEarned,
                totalCheckins: (userData?.totalCheckins || 0) + 1,
                streak: newStreak,
                lastCheckinDate: today,
            })
            .eq('uid', user.uid);

        // Check and award badges
        await this.checkBadges(user.uid, newStreak);

        // Refresh user data
        await this.authService.refreshCurrentUser();
    }

    watchCafe(cafeId: string): () => void {
        const twoHoursAgo = new Date(Date.now() - ACTIVE_WINDOW_MS).toISOString();

        // Initial load
        this.supabase.client
            .from('live_checkins')
            .select('*')
            .eq('cafeId', cafeId)
            .gte('timestamp', twoHoursAgo)
            .then(({ data }) => {
                this.activePeopleAtCafe.set((data || []) as ActiveCheckIn[]);
            });

        // Realtime subscription
        this.realtimeChannel = this.supabase.client
            .channel(`live_checkins_${cafeId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'live_checkins', filter: `cafeId=eq.${cafeId}` }, () => {
                // Recompute the window fresh on every change event
                const freshTwoHoursAgo = new Date(Date.now() - ACTIVE_WINDOW_MS).toISOString();
                this.supabase.client
                    .from('live_checkins')
                    .select('*')
                    .eq('cafeId', cafeId)
                    .gte('timestamp', freshTwoHoursAgo)
                    .then(({ data }) => {
                        this.activePeopleAtCafe.set((data || []) as ActiveCheckIn[]);
                    });
            })
            .subscribe();

        return () => {
            if (this.realtimeChannel) {
                this.supabase.client.removeChannel(this.realtimeChannel);
                this.realtimeChannel = null;
            }
        };
    }

    watchAllDensity(): () => void {
        const refreshDensity = () => {
            const twoHoursAgo = new Date(Date.now() - ACTIVE_WINDOW_MS).toISOString();
            this.supabase.client
                .from('live_checkins')
                .select('*')
                .gte('timestamp', twoHoursAgo)
                .then(({ data }) => {
                    const countMap = new Map<string, number>();
                    (data || []).forEach((d: any) => {
                        countMap.set(d.cafeId, (countMap.get(d.cafeId) || 0) + 1);
                    });
                    const densityMap = new Map<string, CafeDensity>();
                    countMap.forEach((count, cafeId) => {
                        densityMap.set(cafeId, { cafeId, count, level: getDensityLevel(count) });
                    });
                    this.densityMap.set(densityMap);
                });
        };

        refreshDensity();

        this.densityChannel = this.supabase.client
            .channel('live_checkins_all')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'live_checkins' }, () => {
                refreshDensity();
            })
            .subscribe();

        return () => {
            if (this.densityChannel) {
                this.supabase.client.removeChannel(this.densityChannel);
                this.densityChannel = null;
            }
        };
    }

    getDensityForCafe(cafeId: string): CafeDensity {
        return this.densityMap().get(cafeId) ?? { cafeId, count: 0, level: 'empty' };
    }

    private async checkBadges(uid: string, currentStreak: number) {
        const { data: userData } = await this.supabase.client
            .from('users')
            .select('badges, totalCheckins')
            .eq('uid', uid)
            .single();

        if (!userData) return;

        const currentBadges: string[] = userData.badges || [];
        const totalCheckins: number = userData.totalCheckins || 0;
        const newBadges: string[] = [];

        if (totalCheckins >= 50 && !currentBadges.includes('Caffeine King')) {
            newBadges.push('Caffeine King');
        }
        if (totalCheckins >= 20 && !currentBadges.includes('Explorer')) {
            newBadges.push('Explorer');
        }

        const hour = new Date().getHours();
        if (hour < 9 && !currentBadges.includes('Early Bird')) {
            newBadges.push('Early Bird');
        }
        if (hour >= 22 && !currentBadges.includes('Night Owl')) {
            newBadges.push('Night Owl');
        }

        if (currentStreak >= 7 && !currentBadges.includes('Streak Master')) {
            newBadges.push('Streak Master');
        }

        // Halal Hunter: check if user has visited 10+ halal cafes
        if (!currentBadges.includes('Halal Hunter')) {
            const { data: checkinData } = await this.supabase.client
                .from('checkins')
                .select('cafeId')
                .eq('userId', uid);
            const uniqueCafeIds = [...new Set((checkinData || []).map((c: any) => c.cafeId))];
            if (uniqueCafeIds.length > 0) {
                const { data: halalCafes } = await this.supabase.client
                    .from('cafes')
                    .select('id')
                    .contains('tags', ['halal'])
                    .in('id', uniqueCafeIds);
                if ((halalCafes || []).length >= 10) {
                    newBadges.push('Halal Hunter');
                }
            }
        }

        if (newBadges.length > 0) {
            await this.supabase.client
                .from('users')
                .update({ badges: [...currentBadges, ...newBadges] })
                .eq('uid', uid);
        }
    }

    async checkOut(): Promise<void> {
        const user = this.authService.currentUser();
        if (!user) throw new Error('Not authenticated');
        const { error } = await this.supabase.client
            .from('live_checkins')
            .delete()
            .eq('userId', user.uid);
        if (error) throw error;
    }

    async isCurrentlyPresent(cafeId: string): Promise<boolean> {
        const user = this.authService.currentUser();
        if (!user) return false;
        const twoHoursAgo = new Date(Date.now() - ACTIVE_WINDOW_MS).toISOString();
        const { data } = await this.supabase.client
            .from('live_checkins')
            .select('userId')
            .eq('userId', user.uid)
            .eq('cafeId', cafeId)
            .gte('timestamp', twoHoursAgo)
            .limit(1);
        return !!(data && data.length > 0);
    }

    async hasCheckedInToday(cafeId: string): Promise<boolean> {
        const user = this.authService.currentUser();
        if (!user) return false;

        const twoHoursAgo = new Date(Date.now() - ACTIVE_WINDOW_MS).toISOString();
        const { data } = await this.supabase.client
            .from('checkins')
            .select('id')
            .eq('userId', user.uid)
            .eq('cafeId', cafeId)
            .gte('timestamp', twoHoursAgo)
            .limit(1);

        return !!(data && data.length > 0);
    }

    async getUserCheckins(uid: string, limit = 10): Promise<CheckIn[]> {
        const { data } = await this.supabase.client
            .from('checkins')
            .select('*')
            .eq('userId', uid)
            .order('timestamp', { ascending: false })
            .limit(limit);

        return (data || []) as CheckIn[];
    }
}
