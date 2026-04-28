import { ChangeDetectionStrategy, Component, inject, OnInit, signal, computed } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CafeService } from '../../../core/services/cafe.service';
import { ReviewService } from '../../../core/services/review.service';
import { AuthService } from '../../../core/services/auth.service';
import { DealService } from '../../../core/services/deal.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { Cafe } from '../../../core/models/cafe.model';
import { Deal } from '../../../core/models/deal.model';
import { SupabaseService } from '../../../core/services/supabase.service';
import { assertValidClaimDocument, createUserDocumentPath } from '../../../core/utils/image-upload';

import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-cafe-detail',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [RouterLink, CommonModule, FormsModule],
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
    private supabase = inject(SupabaseService);
    private location = inject(Location);

    cafe = signal<Cafe | null>(null);
    reviews = this.reviewService.cafeReviews;
    likedReviewIds = this.reviewService.likedReviewIds;
    activeDeals = signal<Deal[]>([]);
    claiming = signal(false);
    claimFormOpen = signal(false);
    claimantName = signal('');
    claimantRole = signal('');
    claimantContact = signal('');
    claimantSsmNumber = signal('');
    claimDocument = signal<File | null>(null);
    claimProofUrl = signal('');
    claimMessage = signal('');

    lightboxIndex = signal<number | null>(null);
    readonly Math = Math;

    currentUser = this.authService.currentUser;

    isOwner = computed(() => {
        const user = this.authService.currentUser();
        const cafe = this.cafe();
        return !!user && !!cafe && cafe.ownerId === user.uid && cafe.claimStatus === 'claimed';
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
        const user = this.authService.currentUser();
        if (!user) return;
        const claimantName = this.claimantName().trim();
        const role = this.claimantRole().trim();
        const contact = this.claimantContact().trim();
        const ssmNumber = this.claimantSsmNumber().trim();
        const document = this.claimDocument();
        const proofUrl = this.claimProofUrl().trim();

        if (!claimantName || !role || !contact || !ssmNumber || !document) {
            this.toastService.show('Fill in your business details and upload a document first.', 'error');
            return;
        }

        this.claiming.set(true);
        try {
            const documentPath = await this.uploadClaimDocument(user.uid, document);
            await this.cafeService.submitCafeClaim(cafe.id, {
                claimantName,
                role,
                contact,
                ssmNumber,
                documentPath,
                documentName: document.name,
                proofUrl,
                message: this.claimMessage(),
            });
            this.cafe.update(c => c ? {
                ...c,
                claimStatus: 'pending',
            } : c);
            this.claimFormOpen.set(false);
            this.toastService.show('Claim request sent for review.', 'success');
        } catch (e: any) {
            this.toastService.show(e?.message || 'Claim failed.', 'error');
        } finally {
            this.claiming.set(false);
        }
    }

    onClaimDocumentSelected(event: Event) {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) return;
        try {
            assertValidClaimDocument(file);
            this.claimDocument.set(file);
        } catch (error) {
            const msg = error instanceof Error ? error.message : 'Invalid document upload.';
            this.toastService.show(msg, 'error');
            this.claimDocument.set(null);
            input.value = '';
        }
    }

    private async uploadClaimDocument(userId: string, file: File): Promise<string> {
        assertValidClaimDocument(file);
        const path = createUserDocumentPath(userId, 'cafe-claims', file);
        const { data, error } = await this.supabase.client.storage
            .from('cafe-claim-documents')
            .upload(path, file, { contentType: file.type, upsert: false });
        if (error) throw error;
        return data.path;
    }

    async toggleLike(reviewId: string) {
        try {
            await this.reviewService.toggleLike(reviewId);
        } catch {
            this.toastService.show('Log in to like reviews.', 'error');
        }
    }

    goBack() {
        if (window.history.length > 1) {
            this.location.back();
            return;
        }
        this.router.navigate(['/home']);
    }

    formatRating(rating: number): string {
        if (!rating) return 'No rating';
        return Number.isInteger(rating) ? `${rating}/5` : `${rating.toFixed(1)}/5`;
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
