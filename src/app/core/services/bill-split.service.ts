import { Injectable, signal, inject } from '@angular/core';
import { Bill, ReceiptItem } from '../models/bill.model';
import { AuthService } from './auth.service';
import { SupabaseService } from './supabase.service';

@Injectable({
    providedIn: 'root'
})
export class BillSplitService {
    private supabase = inject(SupabaseService);
    private authService = inject(AuthService);

    activeBill = signal<Bill | null>(null);
    private realtimeChannel: any = null;

    async createBill(sessionId: string, items: ReceiptItem[], subtotal: number, tax: number, serviceCharge: number, total: number): Promise<string> {
        const user = this.authService.currentUser();
        if (!user) throw new Error('User not authenticated');

        const newBill = {
            sessionId,
            uploadedBy: user.uid,
            items,
            subtotal,
            tax,
            serviceCharge,
            total,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        const { data, error } = await this.supabase.client
            .from('bills')
            .insert(newBill)
            .select('*')
            .single();

        if (error) throw error;
        return data!.id;
    }

    listenToBill(sessionId: string, billId: string) {
        if (this.realtimeChannel) {
            this.supabase.client.removeChannel(this.realtimeChannel);
        }

        // Initial load
        this.supabase.client
            .from('bills')
            .select('*')
            .eq('id', billId)
            .single()
            .then(({ data }) => {
                if (data) this.activeBill.set(data as Bill);
                else this.activeBill.set(null);
            });

        this.realtimeChannel = this.supabase.client
            .channel(`bill_${billId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'bills',
                filter: `id=eq.${billId}`
            }, (payload: any) => {
                if (payload.new) {
                    this.activeBill.set(payload.new as Bill);
                }
            })
            .subscribe();
    }

    stopListening() {
        if (this.realtimeChannel) {
            this.supabase.client.removeChannel(this.realtimeChannel);
            this.realtimeChannel = null;
        }
        this.activeBill.set(null);
    }

    async updateItemAssignment(sessionId: string, billId: string, itemId: string, assignedToIds: string[]) {
        const currentBill = this.activeBill();
        if (!currentBill) return;

        const updatedItems = currentBill.items.map(item => {
            if (item.id === itemId) {
                return { ...item, assignedTo: assignedToIds };
            }
            return item;
        });

        await this.supabase.client
            .from('bills')
            .update({
                items: updatedItems,
                updatedAt: new Date().toISOString(),
            })
            .eq('id', billId);
    }

    async updateBillDetails(sessionId: string, billId: string, updates: Partial<Bill>) {
        await this.supabase.client
            .from('bills')
            .update({
                ...updates,
                updatedAt: new Date().toISOString(),
            })
            .eq('id', billId);
    }

    async getLatestBillForSession(sessionId: string): Promise<Bill | null> {
        const { data } = await this.supabase.client
            .from('bills')
            .select('*')
            .eq('sessionId', sessionId)
            .order('createdAt', { ascending: false })
            .limit(1)
            .single();

        return (data as Bill) || null;
    }
}
