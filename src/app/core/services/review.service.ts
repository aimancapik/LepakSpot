import { Injectable, inject, signal } from '@angular/core';
import { Review } from '../models/review.model';
import { AuthService } from './auth.service';
import { SupabaseService } from './supabase.service';
import { assertValidImageUpload, createUserImagePath } from '../utils/image-upload';

@Injectable({ providedIn: 'root' })
export class ReviewService {
    private supabase = inject(SupabaseService);
    private authService = inject(AuthService);

    cafeReviews = signal<Review[]>([]);
    likedReviewIds = signal<Set<string>>(new Set());
    userReview = signal<Review | null>(null);

    async uploadReviewImage(file: File, userId: string): Promise<string> {
        assertValidImageUpload(file);
        const path = createUserImagePath(userId, 'reviews', file);
        const { data, error } = await this.supabase.client.storage
            .from('cafe-photos')
            .upload(path, file, { contentType: file.type, upsert: false });
        if (error) throw error;
        const { data: urlData } = this.supabase.client.storage
            .from('cafe-photos')
            .getPublicUrl(data.path);
        return urlData.publicUrl;
    }

    async addReview(cafeId: string, rating: number, text: string, imageUrl?: string): Promise<void> {
        const user = this.authService.currentUser();
        if (!user) throw new Error('Not authenticated');

        const review: Partial<Review> & Record<string, unknown> = {
            cafeId,
            userId: user.uid,
            displayName: user.displayName || 'Anonymous',
            photoURL: user.photoURL || '',
            rating,
            text,
            likeCount: 0,
            createdAt: new Date().toISOString(),
        };
        if (imageUrl) review['imageUrl'] = imageUrl;
        await this.supabase.client.from('reviews').insert(review);

        await this.recalculateCafeRating(cafeId);
        await this.loadReviewsForCafe(cafeId);
    }

    async loadReviewsForCafe(cafeId: string): Promise<void> {
        const { data } = await this.supabase.client
            .from('reviews')
            .select('*')
            .eq('cafeId', cafeId)
            .order('likeCount', { ascending: false })
            .order('createdAt', { ascending: false })
            .limit(50);

        const reviews = (data || []).map(r => ({ ...r, likeCount: r.likeCount ?? 0 })) as Review[];
        this.cafeReviews.set(reviews);

        const user = this.authService.currentUser();
        if (user) {
            this.userReview.set(reviews.find(r => r.userId === user.uid) ?? null);
        }

        await this.loadUserLikes(reviews.map(r => r.id));
    }

    private async loadUserLikes(reviewIds: string[]): Promise<void> {
        const user = this.authService.currentUser();
        if (!user || reviewIds.length === 0) {
            this.likedReviewIds.set(new Set());
            return;
        }
        const { data } = await this.supabase.client
            .from('review_likes')
            .select('reviewId')
            .eq('userId', user.uid)
            .in('reviewId', reviewIds);

        this.likedReviewIds.set(new Set((data || []).map(d => d['reviewId'])));
    }

    async toggleLike(reviewId: string): Promise<void> {
        const user = this.authService.currentUser();
        if (!user) throw new Error('Not authenticated');

        const liked = this.likedReviewIds();
        const isLiked = liked.has(reviewId);

        // Optimistic update
        const next = new Set(liked);
        if (isLiked) {
            next.delete(reviewId);
        } else {
            next.add(reviewId);
        }
        this.likedReviewIds.set(next);

        this.cafeReviews.update(reviews =>
            reviews.map(r => r.id === reviewId
                ? { ...r, likeCount: Math.max(0, r.likeCount + (isLiked ? -1 : 1)) }
                : r
            )
        );

        if (isLiked) {
            await this.supabase.client
                .from('review_likes')
                .delete()
                .eq('reviewId', reviewId)
                .eq('userId', user.uid);
        } else {
            await this.supabase.client
                .from('review_likes')
                .insert({ reviewId, userId: user.uid });
        }

        // Sync real count from DB
        const { data } = await this.supabase.client
            .from('review_likes')
            .select('id', { count: 'exact' })
            .eq('reviewId', reviewId);
        const realCount = data?.length ?? 0;

        await this.supabase.client
            .from('reviews')
            .update({ likeCount: realCount })
            .eq('id', reviewId);

        this.cafeReviews.update(reviews =>
            reviews.map(r => r.id === reviewId ? { ...r, likeCount: realCount } : r)
        );
    }

    async updateReview(reviewId: string, cafeId: string, rating: number, text: string, imageUrl?: string): Promise<void> {
        const user = this.authService.currentUser();
        if (!user) throw new Error('Not authenticated');

        const updates: Partial<Review> & Record<string, unknown> = { rating, text };
        if (imageUrl !== undefined) updates['imageUrl'] = imageUrl;

        await this.supabase.client
            .from('reviews')
            .update(updates)
            .eq('id', reviewId)
            .eq('userId', user.uid);

        await this.recalculateCafeRating(cafeId);
        await this.loadReviewsForCafe(cafeId);
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
        } catch (error: unknown) {
            console.error('Failed to update cafe rating:', error);
        }
    }
}
