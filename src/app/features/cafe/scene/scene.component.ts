import { Component, inject, OnInit, OnDestroy, signal, computed, viewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CafeService } from '../../../core/services/cafe.service';
import { AuthService } from '../../../core/services/auth.service';
import { CheckInService } from '../../../core/services/checkin.service';
import { ReviewService } from '../../../core/services/review.service';
import { Cafe, MenuItem } from '../../../core/models/cafe.model';
import { Review } from '../../../core/models/review.model';
import { SaveToListModalComponent } from '../../../shared/components/save-to-list-modal/save-to-list-modal.component';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { FadeUpDirective } from '../../../shared/directives/fade-up.directive';

@Component({
    selector: 'app-scene',
    standalone: true,
    imports: [CommonModule, FormsModule, SaveToListModalComponent, FadeUpDirective],
    templateUrl: './scene.component.html',
})
export class SceneComponent implements OnInit, OnDestroy {
    private route = inject(ActivatedRoute);
    private location = inject(Location);
    private cafeService = inject(CafeService);
    private authService = inject(AuthService);
    private checkInService = inject(CheckInService);
    private reviewService = inject(ReviewService);
    private toastService = inject(ToastService);

    cafe = signal<Cafe | null>(null);
    showSaveModal = signal(false);
    snapContainerRef = viewChild<ElementRef>('snapContainer');
    currentSnapIndex = signal(0);
    private snapInterval: ReturnType<typeof setInterval> | null = null;
    isCheckedIn = signal(false);
    isPresent = signal(false);
    checkingIn = signal(false);
    checkingOut = signal(false);
    userLat = signal<number | null>(null);
    userLng = signal<number | null>(null);
    private watchId: number | null = null;

    distanceToCafe = computed<number | null>(() => {
        const cafe = this.cafe();
        const lat = this.userLat();
        const lng = this.userLng();
        if (!cafe || lat === null || lng === null) return null;
        return this.haversine(lat, lng, cafe.lat, cafe.lng);
    });

    tooFarToCheckIn = computed(() => {
        const d = this.distanceToCafe();
        return d === null || d > 50;
    });

    menuByCategory = computed<{ category: string; items: MenuItem[] }[]>(() => {
        const items = this.cafe()?.menu ?? [];
        if (!items.length) return [];
        const groups = new Map<string, MenuItem[]>();
        for (const item of items) {
            const cat = item.category?.trim() || 'Other';
            if (!groups.has(cat)) groups.set(cat, []);
            groups.get(cat)!.push(item);
        }
        return Array.from(groups.entries()).map(([category, items]) => ({ category, items }));
    });

    formatPrice(item: MenuItem): string {
        const currency = item.currency || 'RM';
        if (!item.price && item.price !== 0) return '';
        return `${currency} ${item.price.toFixed(2)}`;
    }

    menuLightboxIndex = signal<number | null>(null);
    closeMenuLightbox() {
        this.menuLightboxIndex.set(null);
    }
    menuItemsWithPhotos = computed<MenuItem[]>(() =>
        (this.cafe()?.menu ?? []).filter(m => !!m.photoUrl)
    );

    formatDistance(): string {
        const d = this.distanceToCafe();
        if (d === null) return '';
        return d < 1000 ? `${Math.round(d)}m away` : `${(d / 1000).toFixed(1)}km away`;
    }

    private haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
        const R = 6371000;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    private watchUserLocation() {
        if (!navigator.geolocation) return;
        this.watchId = navigator.geolocation.watchPosition(
            (pos) => {
                this.userLat.set(pos.coords.latitude);
                this.userLng.set(pos.coords.longitude);
            },
            () => { /* error ignored */ },
            { enableHighAccuracy: true, maximumAge: 10000 }
        );
    }

    // Review state
    reviews = this.reviewService.cafeReviews;
    likedReviewIds = this.reviewService.likedReviewIds;
    userReview = this.reviewService.userReview;
    hasReviewed = signal(false);
    showReviewForm = signal(false);
    isEditingReview = signal(false);
    submittingReview = signal(false);
    reviewSubmitted = signal(false);
    showAllReviews = signal(false);
    pendingRating = signal(0);
    hoverRating = signal(0);
    reviewText = signal('');
    reviewImageFile = signal<File | null>(null);
    reviewImagePreview = signal<string | null>(null);

    ngOnInit() {
        this.watchUserLocation();
        const cafeId = this.route.snapshot.paramMap.get('id');
        if (cafeId) {
            this.cafeService.getCafesByIds([cafeId]).then(cafes => {
                if (cafes && cafes.length > 0) {
                    this.cafe.set(cafes[0]);
                    this.verifyCheckInStatus(cafes[0].id);
                    this.loadReviews(cafes[0].id);
                    if ((cafes[0].sceneSnaps?.length ?? 0) > 1) {
                        this.startSnapInterval();
                    }
                }
            });
        }
    }

    private startSnapInterval() {
        if (this.snapInterval) clearInterval(this.snapInterval);
        this.snapInterval = setInterval(() => {
            const snaps = this.cafe()?.sceneSnaps ?? [];
            if (!snaps.length) return;
            const next = (this.currentSnapIndex() + 1) % snaps.length;
            this.currentSnapIndex.set(next);
            const container = this.snapContainerRef()?.nativeElement as HTMLElement | undefined;
            if (container && container.children.length > next) {
                const child = container.children[next] as HTMLElement;
                const offset = child.offsetLeft - (container.clientWidth / 2) + (child.clientWidth / 2);
                container.scrollTo({ left: offset, behavior: 'smooth' });
            }
        }, 3500);
    }

    pauseSnapInterval() {
        if (this.snapInterval) {
            clearInterval(this.snapInterval);
            this.snapInterval = null;
        }
    }

    resumeSnapInterval() {
        if ((this.cafe()?.sceneSnaps?.length ?? 0) > 1) {
            this.startSnapInterval();
        }
    }

    onSnapScroll() {
        const container = this.snapContainerRef()?.nativeElement as HTMLElement | undefined;
        if (!container) return;
        
        const center = container.scrollLeft + (container.clientWidth / 2);
        let closestIndex = 0;
        let minDiff = Infinity;
        
        for (let i = 0; i < container.children.length; i++) {
            const child = container.children[i] as HTMLElement;
            const childCenter = child.offsetLeft + (child.clientWidth / 2);
            const diff = Math.abs(childCenter - center);
            if (diff < minDiff) {
                minDiff = diff;
                closestIndex = i;
            }
        }
        
        if (this.currentSnapIndex() !== closestIndex) {
            this.currentSnapIndex.set(closestIndex);
        }
    }

    ngOnDestroy() {
        if (this.snapInterval) clearInterval(this.snapInterval);
        if (this.watchId !== null) navigator.geolocation.clearWatch(this.watchId);
    }

    private async verifyCheckInStatus(cafeId: string) {
        try {
            const [hasCheckedIn, isPresent] = await Promise.all([
                this.checkInService.hasCheckedInToday(cafeId),
                this.checkInService.isCurrentlyPresent(cafeId),
            ]);
            this.isCheckedIn.set(hasCheckedIn);
            this.isPresent.set(isPresent);
        } catch (error) {
            console.error('Failed to verify check-in status', error);
        }
    }

    private async loadReviews(cafeId: string) {
        try {
            await this.reviewService.loadReviewsForCafe(cafeId);
            const reviewed = await this.reviewService.hasReviewedCafe(cafeId);
            this.hasReviewed.set(reviewed);
        } catch (error) {
            console.error('Failed to load reviews', error);
        }
    }

    async checkIn() {
        if (!this.cafe() || this.checkingIn()) return;
        if (this.tooFarToCheckIn()) {
            const dist = this.formatDistance();
            const cafeName = this.cafe()!.name;
            const suffix = dist ? ` You're ${dist}.` : '';
            this.toastService.show(`Make sure you're at ${cafeName} — get within 50m to check in.${suffix}`, 'error');
            return;
        }
        this.checkingIn.set(true);

        try {
            await this.checkInService.checkIn(this.cafe()!.id, this.cafe()!.name);
            this.isCheckedIn.set(true);
            this.isPresent.set(true);
            this.toastService.show('Checked in! 🎉 VIP perks unlocked.', 'success');
        } catch (error) {
            console.error('Error checking in:', error);
            const msg = error instanceof Error ? error.message : 'Failed to check in.';
            this.toastService.show(msg, 'error');
        } finally {
            this.checkingIn.set(false);
        }
    }

    async checkOut() {
        if (this.checkingOut()) return;
        this.checkingOut.set(true);
        try {
            await this.checkInService.checkOut();
            this.isPresent.set(false);
            this.toastService.show('Checked out. See you next time! 👋', 'success');
        } catch (error) {
            const msg = error instanceof Error ? error.message : 'Could not check out.';
            this.toastService.show(msg, 'error');
        } finally {
            this.checkingOut.set(false);
        }
    }

    setRating(r: number) { this.pendingRating.set(r); }
    setHover(r: number) { this.hoverRating.set(r); }
    clearHover() { this.hoverRating.set(0); }
    starFilled(index: number): boolean {
        const display = this.hoverRating() || this.pendingRating();
        return index <= display;
    }

    startEditReview() {
        const existing = this.userReview();
        if (!existing) return;
        this.pendingRating.set(existing.rating);
        this.reviewText.set(existing.text);
        this.reviewImagePreview.set(existing.imageUrl ?? null);
        this.reviewImageFile.set(null);
        this.isEditingReview.set(true);
        this.showReviewForm.set(true);
    }

    onReviewImagePicked(event: Event) {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (!file) return;
        this.reviewImageFile.set(file);
        const reader = new FileReader();
        reader.onload = (e) => this.reviewImagePreview.set(e.target?.result as string);
        reader.readAsDataURL(file);
    }

    removeReviewImage() {
        this.reviewImageFile.set(null);
        this.reviewImagePreview.set(null);
    }

    async submitReview() {
        const cafe = this.cafe();
        if (!cafe || this.pendingRating() === 0 || this.submittingReview()) return;
        this.submittingReview.set(true);
        try {
            const user = this.authService.currentUser();
            let imageUrl: string | undefined;
            const imageFile = this.reviewImageFile();
            if (imageFile && user) {
                imageUrl = await this.reviewService.uploadReviewImage(imageFile, user.uid);
            } else if (this.isEditingReview()) {
                imageUrl = this.reviewImagePreview() ?? undefined;
            }

            if (this.isEditingReview() && this.userReview()) {
                await this.reviewService.updateReview(this.userReview()!.id, cafe.id, this.pendingRating(), this.reviewText(), imageUrl);
                this.toastService.show('Review updated!', 'success');
            } else {
                await this.reviewService.addReview(cafe.id, this.pendingRating(), this.reviewText(), imageUrl);
                this.reviewSubmitted.set(true);
            }

            this.hasReviewed.set(true);
            this.isEditingReview.set(false);
            this.showReviewForm.set(false);
            this.reviewImageFile.set(null);
            this.reviewImagePreview.set(null);
        } catch (error) {
            console.error('Failed to submit review', error);
            this.toastService.show('Could not submit review. Are you logged in?', 'error');
        } finally {
            this.submittingReview.set(false);
        }
    }

    async toggleLike(reviewId: string) {
        try {
            await this.reviewService.toggleLike(reviewId);
        } catch {
            this.toastService.show('Log in to like reviews.', 'error');
        }
    }

    // Lightbox for scene snaps
    snapLightboxIndex = signal<number | null>(null);
    readonly Math = Math;

    openMenuLightbox(index: number) {
        this.menuLightboxIndex.set(index);
        setTimeout(() => {
            const el = document.getElementById(`menu-lb-${index}`);
            if (el?.parentElement) {
                el.parentElement.scrollLeft = el.parentElement.offsetWidth * index;
            }
        }, 50);
    }

    openSnapLightbox(index: number) {
        this.snapLightboxIndex.set(index);
        setTimeout(() => {
            const el = document.getElementById(`snap-lb-${index}`);
            if (el?.parentElement) {
                el.parentElement.scrollLeft = el.parentElement.offsetWidth * index;
            }
        }, 50);
    }
    closeSnapLightbox() { this.snapLightboxIndex.set(null); }

    // Lightbox for review images
    lightboxReviews = signal<{ reviews: Review[], startIndex: number } | null>(null);
    
    openReviewLightbox(reviews: Review[], startIndex: number) {
        const withImages = reviews.filter(r => r.imageUrl);
        const targetReview = reviews[startIndex];
        const adjustedIndex = targetReview ? withImages.findIndex(r => r.id === targetReview.id) : 0;
        const finalIndex = adjustedIndex >= 0 ? adjustedIndex : 0;
        this.lightboxReviews.set({ reviews: withImages, startIndex: finalIndex });
        setTimeout(() => {
            const el = document.getElementById(`review-lb-${finalIndex}`);
            if (el?.parentElement) {
                el.parentElement.scrollLeft = el.parentElement.offsetWidth * finalIndex;
            }
        }, 50);
    }

    closeReviewLightbox() { this.lightboxReviews.set(null); }

    updateReviewLightboxIndex(index: number) {
        const current = this.lightboxReviews();
        if (current) {
            this.lightboxReviews.set({ ...current, startIndex: index });
        }
    }

    formatDate(ts: string | number | Date): string {
        if (!ts) return '';
        const date = new Date(ts);
        return date.toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' });
    }

    goBack() {
        this.location.back();
    }



    openDirections() {
        const cafe = this.cafe();
        if (!cafe) return;
        // Prefer Google Maps URL if set, else build Waze link from coordinates
        const url = cafe.googleMapsUrl
            ? cafe.googleMapsUrl
            : `https://waze.com/ul?ll=${cafe.lat},${cafe.lng}&navigate=yes`;
        window.open(url, '_blank', 'noopener');
    }
}
