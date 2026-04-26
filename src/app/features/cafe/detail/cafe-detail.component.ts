import { ChangeDetectionStrategy, Component, inject, OnInit, signal, computed } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CafeService } from '../../../core/services/cafe.service';
import { ReviewService } from '../../../core/services/review.service';
import { AuthService } from '../../../core/services/auth.service';
import { DealService } from '../../../core/services/deal.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { Cafe } from '../../../core/models/cafe.model';
import { Deal } from '../../../core/models/deal.model';

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
    private router = inject(Router);
    private cafeService = inject(CafeService);
    private reviewService = inject(ReviewService);
    private authService = inject(AuthService);
    private dealService = inject(DealService);
    private toastService = inject(ToastService);
    private location = inject(Location);

    cafe = signal<Cafe | null>(null);
    reviews = this.reviewService.cafeReviews;
    likedReviewIds = this.reviewService.likedReviewIds;
    activeDeals = signal<Deal[]>([]);
    claiming = signal(false);

    lightboxIndex = signal<number | null>(null);
    readonly Math = Math;

    currentUser = this.authService.currentUser;

    isOwner = computed(() => {
        const user = this.authService.currentUser();
        const cafe = this.cafe();
        return !!user && !!cafe && cafe.ownerId === user.uid;
    });

    canClaim = computed(() => {
        const user = this.authService.currentUser();
        const cafe = this.cafe();
        return !!user && !!cafe && (!cafe.claimStatus || cafe.claimStatus === 'unclaimed');
    });

    async ngOnInit() {
        const id = this.route.snapshot.paramMap.get('id');
        if (id) {
            const [cafe] = await Promise.all([
                this.cafeService.getCafeById(id),
                this.reviewService.loadReviewsForCafe(id),
            ]);
            if (cafe) {
                this.cafe.set(cafe);
                const deals = await this.dealService.getActiveDealsForCafe(id);
                this.activeDeals.set(deals);
            }
        }
    }

    async claimCafe() {
        const cafe = this.cafe();
        if (!cafe) return;
        this.claiming.set(true);
        try {
            await this.cafeService.claimCafe(cafe.id);
            this.cafe.update(c => c ? { ...c, ownerId: this.authService.currentUser()!.uid, claimStatus: 'claimed' } : c);
            this.toastService.show('Cafe claimed! You\'re now the owner.', 'success');
        } catch (e: any) {
            this.toastService.show(e?.message || 'Claim failed.', 'error');
        } finally {
            this.claiming.set(false);
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
