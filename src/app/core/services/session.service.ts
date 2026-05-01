import { Injectable, inject, signal } from '@angular/core';
import { RealtimeChannel } from '@supabase/supabase-js';
import { Session } from '../models/session.model';
import { AuthService } from './auth.service';
import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class SessionService {
    private supabase = inject(SupabaseService);
    private authService = inject(AuthService);

    activeSession = signal<Session | null>(null);
    private realtimeChannel: RealtimeChannel | null = null;

    private generateCode(): string {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }

    async createSession(cafeIds: string[], options?: { meetInMiddle?: boolean }): Promise<string> {
        const user = this.authService.currentUser();
        if (!user) throw new Error('Not authenticated');

        const code = this.generateCode();

        const session = {
            code,
            createdBy: user.uid,
            members: [user.uid],
            cafeOptions: cafeIds,
            votes: {},
            status: 'waiting',
            winnerId: null,
            createdAt: new Date().toISOString(),
            meetInMiddle: options?.meetInMiddle ?? true,
            memberLocations: {},
        };

        const { data, error } = await this.supabase.client
            .from('sessions')
            .insert(session)
            .select('*')
            .single();

        if (error) throw error;

        const created = data as Session;
        this.activeSession.set(created);
        this.listenSession(created.id);
        return created.id;
    }

    async joinSession(code: string): Promise<string | null> {
        const user = this.authService.currentUser();
        if (!user) throw new Error('Not authenticated');

        const { data } = await this.supabase.client
            .from('sessions')
            .select('*')
            .eq('code', code.toUpperCase())
            .single();

        if (!data) return null;

        const session = data as Session;
        if (session.status === 'voting') throw new Error('This session has already started. Ask the host for the next one!');
        if (session.status === 'done') throw new Error('This session has already ended.');

        const members = session.members || [];
        if (!members.includes(user.uid)) {
            members.push(user.uid);
            await this.supabase.client
                .from('sessions')
                .update({ members })
                .eq('id', session.id);
        }

        this.listenSession(session.id);
        return session.id;
    }

    async joinSessionById(sessionId: string): Promise<void> {
        const user = this.authService.currentUser();
        if (!user) throw new Error('Not authenticated');

        const { data } = await this.supabase.client
            .from('sessions')
            .select('*')
            .eq('id', sessionId)
            .single();

        if (!data) throw new Error('Session not found.');

        const session = data as Session;
        if (session.status === 'voting') throw new Error('This session has already started.');
        if (session.status === 'done') throw new Error('This session has already ended.');

        const members = session.members || [];
        if (!members.includes(user.uid)) {
            members.push(user.uid);
            await this.supabase.client
                .from('sessions')
                .update({ members })
                .eq('id', session.id);
        }

        this.listenSession(sessionId);
    }

    listenSession(id: string) {
        if (this.realtimeChannel) {
            this.supabase.client.removeChannel(this.realtimeChannel);
        }

        // Initial load
        this.supabase.client
            .from('sessions')
            .select('*')
            .eq('id', id)
            .single()
            .then(({ data }) => {
                if (data) this.activeSession.set(data as Session);
            });

        this.realtimeChannel = this.supabase.client
            .channel(`session_${id}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'sessions',
                filter: `id=eq.${id}`
            }, (payload) => {
                if (payload.new) {
                    this.activeSession.set(payload.new as Session);
                }
            })
            .subscribe();
    }

    async castVote(sessionId: string, cafeId: string) {
        const user = this.authService.currentUser();
        if (!user) return;

        const { data: sessionData } = await this.supabase.client
            .from('sessions')
            .select('*')
            .eq('id', sessionId)
            .single();

        if (!sessionData) return;

        const votes = sessionData.votes || {};
        votes[user.uid] = cafeId;

        await this.supabase.client
            .from('sessions')
            .update({ votes })
            .eq('id', sessionId);

        await this.checkCompletion(sessionId);
    }

    async abstain(sessionId: string) {
        const user = this.authService.currentUser();
        if (!user) return;

        const { data: sessionData } = await this.supabase.client
            .from('sessions')
            .select('*')
            .eq('id', sessionId)
            .single();

        if (!sessionData) return;

        const votes = sessionData.votes || {};
        if (!votes[user.uid]) {
            votes[user.uid] = '__abstain__';
            await this.supabase.client
                .from('sessions')
                .update({ votes })
                .eq('id', sessionId);
        }

        await this.checkCompletion(sessionId);
    }

    private async checkCompletion(sessionId: string) {
        const { data: freshData } = await this.supabase.client
            .from('sessions')
            .select('*')
            .eq('id', sessionId)
            .single();

        if (!freshData) return;
        if (freshData.winnerId) return; // Race condition guard: first writer wins

        const totalMembers = (freshData.members as string[]).length;
        const totalVotes = Object.keys(freshData.votes || {}).length;

        if (totalVotes >= totalMembers) {
            const realVotes = Object.entries(freshData.votes as Record<string, string>)
                .filter(([, v]) => v !== '__abstain__');

            if (realVotes.length === 0) {
                const fallbackWinner = (freshData.cafeOptions as string[])[0] ?? null;
                await this.supabase.client
                    .from('sessions')
                    .update({ status: 'done', winnerId: fallbackWinner })
                    .eq('id', sessionId);
                return;
            }

            const voteCounts: Record<string, number> = {};
            realVotes.forEach(([, cId]) => {
                voteCounts[cId] = (voteCounts[cId] || 0) + 1;
            });
            const winnerId = Object.entries(voteCounts).sort((a, b) => b[1] - a[1])[0][0];

            await this.supabase.client
                .from('sessions')
                .update({ status: 'done', winnerId })
                .eq('id', sessionId);
        }
    }

    async leaveSession(sessionId: string) {
        const user = this.authService.currentUser();
        if (!user) return;

        const { data } = await this.supabase.client
            .from('sessions')
            .select('members')
            .eq('id', sessionId)
            .single();

        if (data) {
            const members = (data.members as string[]).filter(uid => uid !== user.uid);
            await this.supabase.client
                .from('sessions')
                .update({ members })
                .eq('id', sessionId);
        }
        this.cleanup();
    }

    async startVoting(sessionId: string) {
        await this.supabase.client
            .from('sessions')
            .update({ status: 'voting' })
            .eq('id', sessionId);
    }

    async updateSessionCafes(sessionId: string, cafeIds: string[]) {
        await this.supabase.client
            .from('sessions')
            .update({ cafeOptions: cafeIds })
            .eq('id', sessionId);
    }

    cleanup() {
        if (this.realtimeChannel) {
            this.supabase.client.removeChannel(this.realtimeChannel);
            this.realtimeChannel = null;
        }
        this.activeSession.set(null);
    }
}
