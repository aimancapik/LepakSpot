import { Injectable, inject } from '@angular/core';
import { Deal } from '../models/deal.model';
import { AuthService } from './auth.service';
import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class DealService {
    private supabase = inject(SupabaseService);
    private authService = inject(AuthService);

    async getDealsForCafe(cafeId: string): Promise<Deal[]> {
        const { data } = await this.supabase.client
            .from('deals')
            .select('*')
            .eq('cafeId', cafeId)
            .order('createdAt', { ascending: false });
        return (data || []) as Deal[];
    }

    async getActiveDealsForCafe(cafeId: string): Promise<Deal[]> {
        const now = new Date().toISOString();
        const { data } = await this.supabase.client
            .from('deals')
            .select('*')
            .eq('cafeId', cafeId)
            .eq('isActive', true)
            .lte('validFrom', now)
            .gte('validUntil', now)
            .order('validUntil', { ascending: true });
        return (data || []) as Deal[];
    }

    async createDeal(cafeId: string, cafeName: string, deal: Pick<Deal, 'title' | 'description' | 'validFrom' | 'validUntil'>): Promise<string> {
        const user = this.authService.currentUser();
        if (!user) throw new Error('Not authenticated');

        const payload = {
            cafeId,
            cafeName,
            title: deal.title,
            description: deal.description,
            validFrom: deal.validFrom,
            validUntil: deal.validUntil,
            createdAt: new Date().toISOString(),
            createdBy: user.uid,
            isActive: true,
        };

        const { data, error } = await this.supabase.client
            .from('deals')
            .insert(payload)
            .select('id')
            .single();

        if (error) throw error;

        // Flag the cafe as having an active deal
        await this.supabase.client
            .from('cafes')
            .update({ hasActiveDeal: true })
            .eq('id', cafeId);

        return data!.id;
    }

    async toggleDeal(dealId: string, isActive: boolean): Promise<void> {
        const { error } = await this.supabase.client
            .from('deals')
            .update({ isActive })
            .eq('id', dealId);
        if (error) throw error;
    }

    async deleteDeal(dealId: string, cafeId: string): Promise<void> {
        const { error } = await this.supabase.client
            .from('deals')
            .delete()
            .eq('id', dealId);
        if (error) throw error;

        // Check if any active deals remain; if not, clear the flag
        const remaining = await this.getActiveDealsForCafe(cafeId);
        if (remaining.length === 0) {
            await this.supabase.client
                .from('cafes')
                .update({ hasActiveDeal: false })
                .eq('id', cafeId);
        }
    }
}
