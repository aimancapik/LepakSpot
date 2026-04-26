import { ChangeDetectionStrategy, Component, inject, OnInit, signal, computed } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CafeService } from '../../../core/services/cafe.service';
import { DealService } from '../../../core/services/deal.service';
import { ReviewService } from '../../../core/services/review.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { Cafe, CafeTag } from '../../../core/models/cafe.model';
import { Deal } from '../../../core/models/deal.model';
import { Review } from '../../../core/models/review.model';

export type DashboardTab = 'overview' | 'reviews' | 'deals' | 'traffic';

@Component({
    selector: 'app-owner-dashboard',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, FormsModule],
    templateUrl: './owner-dashboard.component.html',
})
export class OwnerDashboardComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private location = inject(Location);
    private cafeService = inject(CafeService);
    private dealService = inject(DealService);
    private reviewService = inject(ReviewService);
    private authService = inject(AuthService);
    private toastService = inject(ToastService);

    cafe = signal<Cafe | null>(null);
    deals = signal<Deal[]>([]);
    reviews = signal<Review[]>([]);
    stats = signal<{ totalCheckins: number; totalSessions: number; avgRating: number } | null>(null);

    activeTab = signal<DashboardTab>('overview');
    saving = signal(false);
    loading = signal(true);

    // Overview edit form
    editName = signal('');
    editAddress = signal('');
    editOpeningHours = signal('');
    editTags = signal<CafeTag[]>([]);
    editIsLateNight = signal(false);
    editWifiSpeed = signal('');
    editOutletAvailability = signal('');

    // Deal form
    showDealForm = signal(false);
    newDealTitle = signal('');
    newDealDescription = signal('');
    newDealValidFrom = signal('');
    newDealValidUntil = signal('');

    readonly allTags: CafeTag[] = ['wifi', 'aesthetic', 'halal', 'study', 'chill'];

    isOwner = computed(() => {
        const user = this.authService.currentUser();
        const cafe = this.cafe();
        return !!user && !!cafe && cafe.ownerId === user.uid;
    });

    async ngOnInit() {
        const id = this.route.snapshot.paramMap.get('id');
        if (!id) { this.router.navigate(['/home']); return; }

        const cafe = await this.cafeService.getCafeById(id);
        if (!cafe) { this.router.navigate(['/home']); return; }

        const user = this.authService.currentUser();
        if (!user || cafe.ownerId !== user.uid) {
            this.toastService.show('Only the cafe owner can access this dashboard.', 'error');
            this.router.navigate(['/cafe', id]);
            return;
        }

        this.cafe.set(cafe);
        this.syncEditForm(cafe);
        this.loading.set(false);

        // Load all tabs in parallel
        const [deals, , stats] = await Promise.all([
            this.dealService.getDealsForCafe(id),
            this.reviewService.loadReviewsForCafe(id),
            this.cafeService.getOwnerStats(id),
        ]);
        this.deals.set(deals);
        this.reviews.set(this.reviewService.cafeReviews());
        this.stats.set(stats);
    }

    private syncEditForm(cafe: Cafe) {
        this.editName.set(cafe.name);
        this.editAddress.set(cafe.address);
        this.editOpeningHours.set(cafe.openingHours || '');
        this.editTags.set([...cafe.tags]);
        this.editIsLateNight.set(cafe.isLateNight || false);
        this.editWifiSpeed.set(cafe.wifiSpeed || '');
        this.editOutletAvailability.set(cafe.outletAvailability || '');
    }

    toggleEditTag(tag: CafeTag) {
        this.editTags.update(tags =>
            tags.includes(tag) ? tags.filter(t => t !== tag) : [...tags, tag]
        );
    }

    async saveOverview() {
        const cafe = this.cafe();
        if (!cafe) return;
        this.saving.set(true);
        try {
            const updates: Partial<Cafe> = {
                name: this.editName(),
                address: this.editAddress(),
                openingHours: this.editOpeningHours(),
                tags: this.editTags(),
                isLateNight: this.editIsLateNight(),
                wifiSpeed: this.editWifiSpeed() as any || undefined,
                outletAvailability: this.editOutletAvailability() as any || undefined,
            };
            await this.cafeService.updateCafeAsOwner(cafe.id, updates);
            this.cafe.update(c => c ? { ...c, ...updates } : c);
            this.toastService.show('Cafe info updated!', 'success');
        } catch {
            this.toastService.show('Save failed. Try again.', 'error');
        } finally {
            this.saving.set(false);
        }
    }

    async createDeal() {
        const cafe = this.cafe();
        if (!cafe || !this.newDealTitle() || !this.newDealValidFrom() || !this.newDealValidUntil()) {
            this.toastService.show('Fill in all required fields.', 'error');
            return;
        }
        this.saving.set(true);
        try {
            await this.dealService.createDeal(cafe.id, cafe.name, {
                title: this.newDealTitle(),
                description: this.newDealDescription(),
                validFrom: new Date(this.newDealValidFrom()).toISOString(),
                validUntil: new Date(this.newDealValidUntil()).toISOString(),
            });
            const updated = await this.dealService.getDealsForCafe(cafe.id);
            this.deals.set(updated);
            this.cafe.update(c => c ? { ...c, hasActiveDeal: true } : c);
            this.resetDealForm();
            this.toastService.show('Deal posted!', 'success');
        } catch {
            this.toastService.show('Failed to create deal.', 'error');
        } finally {
            this.saving.set(false);
        }
    }

    async toggleDeal(deal: Deal) {
        try {
            await this.dealService.toggleDeal(deal.id, !deal.isActive);
            this.deals.update(deals =>
                deals.map(d => d.id === deal.id ? { ...d, isActive: !d.isActive } : d)
            );
        } catch {
            this.toastService.show('Failed to update deal.', 'error');
        }
    }

    async deleteDeal(deal: Deal) {
        const cafe = this.cafe();
        if (!cafe) return;
        try {
            await this.dealService.deleteDeal(deal.id, cafe.id);
            this.deals.update(deals => deals.filter(d => d.id !== deal.id));
            const hasActive = this.deals().some(d => d.isActive);
            this.cafe.update(c => c ? { ...c, hasActiveDeal: hasActive } : c);
            this.toastService.show('Deal removed.', 'success');
        } catch {
            this.toastService.show('Failed to delete deal.', 'error');
        }
    }

    private resetDealForm() {
        this.newDealTitle.set('');
        this.newDealDescription.set('');
        this.newDealValidFrom.set('');
        this.newDealValidUntil.set('');
        this.showDealForm.set(false);
    }

    isDealActive(deal: Deal): boolean {
        const now = Date.now();
        return deal.isActive &&
            new Date(deal.validFrom).getTime() <= now &&
            new Date(deal.validUntil).getTime() >= now;
    }

    goBack() { this.location.back(); }
}
