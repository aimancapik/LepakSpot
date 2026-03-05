import { Injectable, inject, signal } from '@angular/core';
import { CafeList } from '../models/cafe-list.model';
import { AuthService } from './auth.service';
import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class CafeListService {
    private supabase = inject(SupabaseService);
    private authService = inject(AuthService);

    myLists = signal<CafeList[]>([]);
    sharedLists = signal<CafeList[]>([]);

    loadMyLists() {
        const user = this.authService.currentUser();
        if (!user) return;

        this.supabase.client
            .from('cafe_lists')
            .select('*')
            .eq('ownerId', user.uid)
            .order('updatedAt', { ascending: false })
            .then(({ data }) => {
                this.myLists.set((data || []) as CafeList[]);
            });
    }

    loadSharedLists() {
        const user = this.authService.currentUser();
        if (!user) return;

        this.supabase.client
            .from('cafe_lists')
            .select('*')
            .contains('collaboratorIds', [user.uid])
            .order('updatedAt', { ascending: false })
            .then(({ data }) => {
                this.sharedLists.set((data || []) as CafeList[]);
            });
    }

    async createList(title: string, description: string = '', isPublic: boolean = false) {
        const user = this.authService.currentUser();
        if (!user) throw new Error('Must be logged in to create a list');

        const now = new Date().toISOString();
        const newList = {
            title,
            description,
            ownerId: user.uid,
            collaboratorIds: [],
            cafeIds: [],
            isPublic,
            createdAt: now,
            updatedAt: now,
        };

        const { data, error } = await this.supabase.client
            .from('cafe_lists')
            .insert(newList)
            .select('id')
            .single();

        if (error) throw error;
        return data!.id;
    }

    async getListById(listId: string): Promise<CafeList | null> {
        const { data } = await this.supabase.client
            .from('cafe_lists')
            .select('*')
            .eq('id', listId)
            .single();

        return (data as CafeList) || null;
    }

    async addCafeToList(listId: string, cafeId: string) {
        const { data } = await this.supabase.client
            .from('cafe_lists')
            .select('cafeIds')
            .eq('id', listId)
            .single();

        if (data) {
            const cafeIds = (data.cafeIds as string[]) || [];
            if (!cafeIds.includes(cafeId)) {
                cafeIds.push(cafeId);
                await this.supabase.client
                    .from('cafe_lists')
                    .update({ cafeIds, updatedAt: new Date().toISOString() })
                    .eq('id', listId);
            }
        }
    }

    async removeCafeFromList(listId: string, cafeId: string) {
        const { data } = await this.supabase.client
            .from('cafe_lists')
            .select('cafeIds')
            .eq('id', listId)
            .single();

        if (data) {
            const cafeIds = ((data.cafeIds as string[]) || []).filter(id => id !== cafeId);
            await this.supabase.client
                .from('cafe_lists')
                .update({ cafeIds, updatedAt: new Date().toISOString() })
                .eq('id', listId);
        }
    }

    async addCollaborator(listId: string, userId: string) {
        const { data } = await this.supabase.client
            .from('cafe_lists')
            .select('collaboratorIds')
            .eq('id', listId)
            .single();

        if (data) {
            const collaboratorIds = (data.collaboratorIds as string[]) || [];
            if (!collaboratorIds.includes(userId)) {
                collaboratorIds.push(userId);
                await this.supabase.client
                    .from('cafe_lists')
                    .update({ collaboratorIds, updatedAt: new Date().toISOString() })
                    .eq('id', listId);
            }
        }
    }

    async removeCollaborator(listId: string, userId: string) {
        const { data } = await this.supabase.client
            .from('cafe_lists')
            .select('collaboratorIds')
            .eq('id', listId)
            .single();

        if (data) {
            const collaboratorIds = ((data.collaboratorIds as string[]) || []).filter(id => id !== userId);
            await this.supabase.client
                .from('cafe_lists')
                .update({ collaboratorIds, updatedAt: new Date().toISOString() })
                .eq('id', listId);
        }
    }

    async deleteList(listId: string) {
        await this.supabase.client
            .from('cafe_lists')
            .delete()
            .eq('id', listId);
    }

    async quickSave(cafeId: string) {
        const user = this.authService.currentUser();
        if (!user) return;

        const { data } = await this.supabase.client
            .from('cafe_lists')
            .select('id')
            .eq('ownerId', user.uid)
            .eq('title', 'Quick Saves')
            .single();

        const listId = data?.id ?? await this.createList('Quick Saves');
        await this.addCafeToList(listId, cafeId);
    }
}
