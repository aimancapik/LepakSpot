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
            .then(async ({ data }) => {
                const lists = (data || []) as CafeList[];
                const validLists = [];
                for (const list of lists) {
                    if (!list.cafeIds || list.cafeIds.length === 0) {
                        await this.deleteList(list.id);
                    } else {
                        validLists.push(list);
                    }
                }
                this.myLists.set(validLists);
            });
    }

    loadSharedLists() {
        const user = this.authService.currentUser();
        if (!user) return;

        this.supabase.client
            .from('cafe_lists')
            .select('*')
            .filter('collaboratorIds', 'cs', JSON.stringify([user.uid]))
            .order('updatedAt', { ascending: false })
            .then(({ data }) => {
                const lists = (data || []) as CafeList[];
                this.sharedLists.set(lists.filter(l => l.cafeIds && l.cafeIds.length > 0));
            });
    }

    async createList(title: string, description = '', isPublic = false) {
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
            
            if (cafeIds.length === 0) {
                // Auto delete the list if it's empty
                await this.deleteList(listId);
                // Also update local state
                this.myLists.update(lists => lists.filter(l => l.id !== listId));
                this.sharedLists.update(lists => lists.filter(l => l.id !== listId));
            } else {
                await this.supabase.client
                    .from('cafe_lists')
                    .update({ cafeIds, updatedAt: new Date().toISOString() })
                    .eq('id', listId);
            }
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
