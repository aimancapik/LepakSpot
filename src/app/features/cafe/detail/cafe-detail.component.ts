import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CafeService } from '../../../core/services/cafe.service';
import { ReviewService } from '../../../core/services/review.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { Cafe } from '../../../core/models/cafe.model';

import { CommonModule, Location } from '@angular/common';

@Component({
    selector: 'app-cafe-detail',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [RouterLink, CommonModule],
    templateUrl: './cafe-detail.component.html',
    styleUrl: './cafe-detail.component.scss',
})
export class CafeDetailComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private cafeService = inject(CafeService);
    private reviewService = inject(ReviewService);
    private toastService = inject(ToastService);
    private location = inject(Location);

    cafe = signal<Cafe | null>(null);
    reviews = this.reviewService.cafeReviews;
    likedReviewIds = this.reviewService.likedReviewIds;
    
    // Lightbox state
    lightboxIndex = signal<number | null>(null);
    readonly Math = Math;

    async ngOnInit() {
        const id = this.route.snapshot.paramMap.get('id');
        if (id) {
            const cafe = await this.cafeService.getCafeById(id);
            if (cafe) {
                this.cafe.set(cafe);
                // Load real reviews
                await this.reviewService.loadReviewsForCafe(id);
            }
        }
    }

    async toggleLike(reviewId: string) {
        try {
            await this.reviewService.toggleLike(reviewId);
        } catch {
            this.toastService.show('Log in to like reviews.', 'error');
        }
    }

    goBack() {
        this.location.back();
    }

    async shareThisCafe() {
        const cafe = this.cafe();
        if (!cafe) return;
        const url = `${window.location.origin}/cafe/${cafe.id}`;
        const shareData = {
            title: cafe.name,
            text: `Check out ${cafe.name} on LepakSpot! Great spot for lepak-ing 🍵`,
            url,
        };
        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                await navigator.clipboard.writeText(url);
                this.toastService.show('Link copied to clipboard!', 'success');
            }
        } catch {
            // user cancelled share
        }
    }
}
