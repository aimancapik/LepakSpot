import { Injectable, inject, signal } from '@angular/core';
import { Review } from '../models/review.model';
import { AuthService } from './auth.service';
import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class ReviewService {
    private supabase = inject(SupabaseService);
    private authService = inject(AuthService);

    cafeReviews = signal<Review[]>([]);

    async addReview(cafeId: string, rating: number, text: string): Promise<void> {
        const user = this.authService.currentUser();
        if (!user) throw new Error('Not authenticated');

        const review = {
            cafeId,
            userId: user.uid,
            displayName: user.displayName || 'Anonymous',
            photoURL: user.photoURL || '',
            rating,
            text,
            createdAt: new Date().toISOString(),
        };
        await this.supabase.client.from('reviews').insert(review);

        await this.recalculateCafeRating(cafeId);
        await this.loadReviewsForCafe(cafeId);
    }

    async loadReviewsForCafe(cafeId: string): Promise<void> {
        const { data } = await this.supabase.client
            .from('reviews')
            .select('*')
            .eq('cafeId', cafeId)
            .order('createdAt', { ascending: false })
            .limit(20);

        this.cafeReviews.set((data || []) as Review[]);
    }

    async hasReviewedCafe(cafeId: string): Promise<boolean> {
        const user = this.authService.currentUser();
        if (!user) return false;

        const { data } = await this.supabase.client
            .from('reviews')
            .select('id')
            .eq('cafeId', cafeId)
            .eq('userId', user.uid)
            .limit(1);

        return !!(data && data.length > 0);
    }

    private async recalculateCafeRating(cafeId: string): Promise<void> {
        const { data } = await this.supabase.client
            .from('reviews')
            .select('rating')
            .eq('cafeId', cafeId);

        if (!data || data.length === 0) return;

        const ratings = data.map(d => d.rating);
        const avg = ratings.reduce((s, r) => s + r, 0) / ratings.length;
        const rounded = Math.round(avg * 10) / 10;

        try {
            await this.supabase.client
                .from('cafes')
                .update({ rating: rounded })
                .eq('id', cafeId);
        } catch { }
    }
}
