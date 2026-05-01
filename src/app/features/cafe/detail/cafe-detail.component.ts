import { ChangeDetectionStrategy, Component, inject, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CafeService } from '../../../core/services/cafe.service';
import { ReviewService } from '../../../core/services/review.service';
import { AuthService } from '../../../core/services/auth.service';
import { DealService } from '../../../core/services/deal.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { Cafe, DayKey } from '../../../core/models/cafe.model';
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
export class CafeDetailComponent implements OnInit, OnDestroy {
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
    failedAvatars = signal(new Set<string>());
    onAvatarError(url: string) { this.failedAvatars.update(s => new Set(s).add(url)); }
    hoursExpanded = signal(false);
    currentPhotoIndex = signal(0);
    private slideInterval: ReturnType<typeof setInterval> | null = null;
    readonly Math = Math;

    readonly weekDays: { key: DayKey; label: string; index: number }[] = [
        { key: 'mon', label: 'Mon', index: 1 },
        { key: 'tue', label: 'Tue', index: 2 },
        { key: 'wed', label: 'Wed', index: 3 },
        { key: 'thu', label: 'Thu', index: 4 },
        { key: 'fri', label: 'Fri', index: 5 },
        { key: 'sat', label: 'Sat', index: 6 },
        { key: 'sun', label: 'Sun', index: 0 },
    ];

    operatingHoursStatus = computed(() => {
        const cafe = this.cafe();
        if (!cafe?.operatingHours) return null;
        const keys: DayKey[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
        const now = new Date();
        const todayHours = cafe.operatingHours[keys[now.getDay()]];
        if (!todayHours) return null;
        if (todayHours.closed) return { isOpen: false, label: 'Closed today' };
        const [openH, openM] = todayHours.open.split(':').map(Number);
        const [closeH, closeM] = todayHours.close.split(':').map(Number);
        const nowMins = now.getHours() * 60 + now.getMinutes();
        const isOpen = nowMins >= openH * 60 + openM && nowMins < closeH * 60 + closeM;
        return { isOpen, label: isOpen ? `Closes ${this.fmt12(todayHours.close)}` : `Opens ${this.fmt12(todayHours.open)}` };
    });

    fmt12(time: string): string {
        const [h, m] = time.split(':').map(Number);
        const period = h < 12 ? 'AM' : 'PM';
        const hour = h % 12 || 12;
        return `${hour}:${String(m).padStart(2, '0')} ${period}`;
    }

    isToday(dayIndex: number): boolean {
        return new Date().getDay() === dayIndex;
    }

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
                if (cafe.photos.length > 1) {
                    this.slideInterval = setInterval(() => {
                        this.currentPhotoIndex.update(i => (i + 1) % cafe.photos.length);
                    }, 4000);
                }
            }
        }
    }

    ngOnDestroy() {
        if (this.slideInterval) clearInterval(this.slideInterval);
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
