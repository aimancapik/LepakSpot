import { Injectable, inject, signal } from '@angular/core';
import {
    Firestore,
    collection,
    doc,
    setDoc,
    query,
    where,
    orderBy,
    limit,
    getDocs,
    Timestamp,
    updateDoc,
    getDoc,
} from '@angular/fire/firestore';
import { Review } from '../models/review.model';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class ReviewService {
    private firestore = inject(Firestore);
    private authService = inject(AuthService);

    private readonly reviewsRef = collection(this.firestore, 'reviews');
    private readonly cafesRef = collection(this.firestore, 'cafes');

    /** Reviews loaded for the currently visible cafe */
    cafeReviews = signal<Review[]>([]);

    /** Add a review and update cafe average rating */
    async addReview(cafeId: string, rating: number, text: string): Promise<void> {
        const user = this.authService.currentUser();
        if (!user) throw new Error('Not authenticated');

        const newDoc = doc(this.reviewsRef);
        const review: Review = {
            id: newDoc.id,
            cafeId,
            userId: user.uid,
            displayName: user.displayName || 'Anonymous',
            photoURL: user.photoURL || '',
            rating,
            text,
            createdAt: Timestamp.now(),
        };
        await setDoc(newDoc, review);

        // Recompute average rating for the cafe
        await this.recalculateCafeRating(cafeId);

        // Refresh local signal
        await this.loadReviewsForCafe(cafeId);
    }

    /** Load (up to 20) recent reviews for a cafe into the signal */
    async loadReviewsForCafe(cafeId: string): Promise<void> {
        const q = query(
            this.reviewsRef,
            where('cafeId', '==', cafeId),
            orderBy('createdAt', 'desc'),
            limit(20)
        );
        const snapshot = await getDocs(q);
        this.cafeReviews.set(
            snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Review))
        );
    }

    /** Returns true if the current user already left a review for this cafe */
    async hasReviewedCafe(cafeId: string): Promise<boolean> {
        const user = this.authService.currentUser();
        if (!user) return false;
        const q = query(
            this.reviewsRef,
            where('cafeId', '==', cafeId),
            where('userId', '==', user.uid),
            limit(1)
        );
        const snapshot = await getDocs(q);
        return !snapshot.empty;
    }

    private async recalculateCafeRating(cafeId: string): Promise<void> {
        // Fetch all reviews for this cafe to compute a fresh average
        const q = query(this.reviewsRef, where('cafeId', '==', cafeId));
        const snapshot = await getDocs(q);
        if (snapshot.empty) return;

        const ratings = snapshot.docs.map(d => (d.data() as Review).rating);
        const avg = ratings.reduce((s, r) => s + r, 0) / ratings.length;
        const rounded = Math.round(avg * 10) / 10;

        // Update the cafe doc in Firestore (no-op if doc doesn't exist yet for mock cafes)
        try {
            const cafeRef = doc(this.cafesRef, cafeId);
            const cafeSnap = await getDoc(cafeRef);
            if (cafeSnap.exists()) {
                await updateDoc(cafeRef, { rating: rounded });
            }
        } catch {
            // Firestore doc may not exist for mock cafes – ignore
        }
    }
}
