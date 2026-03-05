import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CafeService } from '../../../core/services/cafe.service';
import { AuthService } from '../../../core/services/auth.service';
import { BroadcastService } from '../../../core/services/broadcast.service';
import { CheckInService } from '../../../core/services/checkin.service';
import { ReviewService } from '../../../core/services/review.service';
import { Cafe } from '../../../core/models/cafe.model';
import { Review } from '../../../core/models/review.model';
import { SaveToListModalComponent } from '../../../shared/components/save-to-list-modal/save-to-list-modal.component';
import { ToastService } from '../../../shared/components/toast/toast.service';

@Component({
    selector: 'app-scene',
    standalone: true,
    imports: [CommonModule, FormsModule, SaveToListModalComponent],
    templateUrl: './scene.component.html',
})
export class SceneComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private location = inject(Location);
    private cafeService = inject(CafeService);
    private authService = inject(AuthService);
    private broadcastService = inject(BroadcastService);
    private checkInService = inject(CheckInService);
    private reviewService = inject(ReviewService);
    private toastService = inject(ToastService);

    cafe = signal<Cafe | null>(null);
    isUpdatingVibe = signal(false);
    isBroadcasting = signal(false);
    showSaveModal = signal(false);
    broadcastMessage = signal('');
    isCheckedIn = signal(false);
    checkingIn = signal(false);

    // Review state
    reviews = this.reviewService.cafeReviews;
    hasReviewed = signal(false);
    showReviewForm = signal(false);
    submittingReview = signal(false);
    reviewSubmitted = signal(false);
    pendingRating = signal(0);
    hoverRating = signal(0);
    reviewText = signal('');

    ngOnInit() {
        const cafeId = this.route.snapshot.paramMap.get('id');
        if (cafeId) {
            this.cafeService.getCafesByIds([cafeId]).then(cafes => {
                if (cafes && cafes.length > 0) {
                    this.cafe.set(cafes[0]);
                    this.verifyCheckInStatus(cafes[0].id);
                    this.loadReviews(cafes[0].id);
                }
            });
        }
    }

    private async verifyCheckInStatus(cafeId: string) {
        try {
            const hasCheckedIn = await this.checkInService.hasCheckedInToday(cafeId);
            this.isCheckedIn.set(hasCheckedIn);
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
        this.checkingIn.set(true);

        try {
            await this.checkInService.checkIn(this.cafe()!.id, this.cafe()!.name);
            this.isCheckedIn.set(true);
            this.toastService.show('Checked in! 🎉 VIP perks unlocked.', 'success');
        } catch (error) {
            console.error('Error checking in:', error);
            this.toastService.show('Failed to check in. Are you logged in?', 'error');
        } finally {
            this.checkingIn.set(false);
        }
    }

    setRating(r: number) { this.pendingRating.set(r); }
    setHover(r: number) { this.hoverRating.set(r); }
    clearHover() { this.hoverRating.set(0); }
    starFilled(index: number): boolean {
        const display = this.hoverRating() || this.pendingRating();
        return index <= display;
    }

    async submitReview() {
        const cafe = this.cafe();
        if (!cafe || this.pendingRating() === 0 || this.submittingReview()) return;
        this.submittingReview.set(true);
        try {
            await this.reviewService.addReview(cafe.id, this.pendingRating(), this.reviewText());
            this.hasReviewed.set(true);
            this.showReviewForm.set(false);
            this.reviewSubmitted.set(true);
        } catch (error) {
            console.error('Failed to submit review', error);
            this.toastService.show('Could not submit review. Are you logged in?', 'error');
        } finally {
            this.submittingReview.set(false);
        }
    }

    formatDate(ts: any): string {
        if (!ts) return '';
        const date = new Date(ts);
        return date.toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' });
    }

    goBack() {
        this.location.back();
    }

    toggleVibeForm() {
        this.isUpdatingVibe.update(v => !v);
        if (this.isUpdatingVibe() && this.isBroadcasting()) {
            this.isBroadcasting.set(false);
        }
    }

    submitVibeUpdate() {
        this.isUpdatingVibe.set(false);
        this.toastService.show('Vibe updated! Thanks for keeping the zine alive 🌿', 'success');
    }

    toggleBroadcastForm() {
        this.isBroadcasting.update(v => !v);
        if (this.isBroadcasting() && this.isUpdatingVibe()) {
            this.isUpdatingVibe.set(false);
        }
    }

    async createBroadcast() {
        const currentUser = this.authService.currentUser();
        const currentCafe = this.cafe();

        if (!currentUser || !currentCafe) {
            alert('You must be logged in to broadcast.');
            return;
        }

        try {
            await this.broadcastService.createBroadcast(
                currentCafe.id!,
                currentCafe.name,
                this.broadcastMessage()
            );
            this.isBroadcasting.set(false);
            this.broadcastMessage.set('');
            this.toastService.show('Broadcast sent! 📡 Friends can see you are here.', 'success');
        } catch (error) {
            console.error('Error creating broadcast:', error);
            this.toastService.show('Failed to send broadcast. Try again later.', 'error');
        }
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
