import { Injectable, inject, signal } from '@angular/core';
import { RealtimeChannel } from '@supabase/supabase-js';
import { Broadcast } from '../models/broadcast.model';
import { AuthService } from './auth.service';
import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class BroadcastService {
    private supabase = inject(SupabaseService);
    private authService = inject(AuthService);

    activeBroadcasts = signal<Broadcast[]>([]);
    private realtimeChannel: RealtimeChannel | null = null;

    constructor() {
        this.listenToActiveBroadcasts();
    }

    private listenToActiveBroadcasts() {
        const now = new Date().toISOString();

        // Initial load
        this.supabase.client
            .from('broadcasts')
            .select('*')
            .gt('expiresAt', now)
            .order('createdAt', { ascending: false })
            .then(({ data }) => {
                this.activeBroadcasts.set((data || []) as Broadcast[]);
            });

        // Realtime subscription
        this.realtimeChannel = this.supabase.client
            .channel('broadcasts_live')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'broadcasts' }, () => {
                // Re-fetch on any change
                const refreshNow = new Date().toISOString();
                this.supabase.client
                    .from('broadcasts')
                    .select('*')
                    .gt('expiresAt', refreshNow)
                    .order('createdAt', { ascending: false })
                    .then(({ data }) => {
                        this.activeBroadcasts.set((data || []) as Broadcast[]);
                    });
            })
            .subscribe();
    }

    async createBroadcast(cafeId: string, cafeName: string, message: string, hoursValid = 3) {
        const user = this.authService.currentUser();
        if (!user) throw new Error('Must be logged in to broadcast');

        const now = new Date();
        const expiresAt = new Date(now.getTime() + hoursValid * 60 * 60 * 1000);

        const newBroadcast = {
            hostId: user.uid,
            hostName: user.displayName || 'Anonymous',
            cafeId,
            cafeName,
            message,
            expiresAt: expiresAt.toISOString(),
            createdAt: now.toISOString(),
            attendees: [user.uid],
        };

        const { data, error } = await this.supabase.client
            .from('broadcasts')
            .insert(newBroadcast)
            .select('id')
            .single();

        if (error) throw error;
        return data!.id;
    }

    async joinBroadcast(broadcastId: string) {
        const user = this.authService.currentUser();
        if (!user) throw new Error('Must be logged in to join');

        // Get current attendees
        const { data } = await this.supabase.client
            .from('broadcasts')
            .select('attendees')
            .eq('id', broadcastId)
            .single();

        if (data) {
            const attendees = (data.attendees as string[]) || [];
            if (!attendees.includes(user.uid)) {
                attendees.push(user.uid);
                await this.supabase.client
                    .from('broadcasts')
                    .update({ attendees })
                    .eq('id', broadcastId);
            }
        }
    }

    async deleteBroadcast(broadcastId: string) {
        const user = this.authService.currentUser();
        if (!user) throw new Error('Must be logged in to delete');

        await this.supabase.client
            .from('broadcasts')
            .delete()
            .eq('id', broadcastId);
    }
}
