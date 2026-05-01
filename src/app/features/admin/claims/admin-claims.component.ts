import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CafeClaim, CafeClaimStatus } from '../../../core/models/cafe.model';
import { CafeService } from '../../../core/services/cafe.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { FadeUpDirective } from '../../../shared/directives/fade-up.directive';

type ClaimFilter = 'pending' | 'approved' | 'rejected' | 'all';

@Component({
    selector: 'app-admin-claims',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, DatePipe, RouterLink, FormsModule, FadeUpDirective],
    templateUrl: './admin-claims.component.html',
})
export class AdminClaimsComponent implements OnInit {
    private cafeService = inject(CafeService);
    private toastService = inject(ToastService);
    private location = inject(Location);

    claims = signal<CafeClaim[]>([]);
    loading = signal(true);
    reviewingId = signal<string | null>(null);
    openingDocumentId = signal<string | null>(null);
    activeFilter = signal<ClaimFilter>('pending');
    expandedClaimIds = signal<Set<string>>(new Set());
    rejectingClaimId = signal<string | null>(null);
    rejectionReason = signal('');

    readonly filters: ClaimFilter[] = ['pending', 'approved', 'rejected', 'all'];

    ngOnInit() {
        this.loadClaims();
    }

    async loadClaims(filter = this.activeFilter()) {
        this.activeFilter.set(filter);
        this.loading.set(true);
        try {
            const claims = await this.cafeService.getCafeClaims(filter);
            this.claims.set(claims);
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : 'Could not load claims.';
            this.toastService.show(msg, 'error');
        } finally {
            this.loading.set(false);
        }
    }

    async approve(claim: CafeClaim) {
        if (this.reviewingId()) return;
        this.reviewingId.set(claim.id);
        try {
            await this.cafeService.approveCafeClaim(claim);
            this.updateReviewedClaim(claim.id, 'approved');
            this.toastService.show('Cafe claim approved.', 'success');
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : 'Could not approve claim.';
            this.toastService.show(msg, 'error');
        } finally {
            this.reviewingId.set(null);
        }
    }

    startReject(claim: CafeClaim) {
        this.rejectingClaimId.set(claim.id);
        this.rejectionReason.set('');
        if (!this.isExpanded(claim.id)) this.toggleClaim(claim.id);
    }

    cancelReject() {
        this.rejectingClaimId.set(null);
        this.rejectionReason.set('');
    }

    async reject(claim: CafeClaim) {
        if (this.reviewingId()) return;
        const reason = this.rejectionReason().trim();
        if (!reason) {
            this.toastService.show('Add a reason before rejecting.', 'error');
            return;
        }
        this.reviewingId.set(claim.id);
        try {
            await this.cafeService.rejectCafeClaim(claim, reason);
            this.updateReviewedClaim(claim.id, 'rejected', { rejectionReason: reason });
            this.cancelReject();
            this.toastService.show('Cafe claim rejected.', 'success');
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : 'Could not reject claim.';
            this.toastService.show(msg, 'error');
        } finally {
            this.reviewingId.set(null);
        }
    }

    toggleClaim(claimId: string) {
        this.expandedClaimIds.update(ids => {
            const next = new Set(ids);
            if (next.has(claimId)) {
                next.delete(claimId);
            } else {
                next.add(claimId);
            }
            return next;
        });
    }

    isExpanded(claimId: string): boolean {
        return this.expandedClaimIds().has(claimId);
    }

    async copyText(value: string, label: string) {
        const text = value?.trim();
        if (!text) return;
        try {
            await navigator.clipboard.writeText(text);
            this.toastService.show(`${label} copied.`, 'success');
        } catch {
            this.toastService.show(`Could not copy ${label.toLowerCase()}.`, 'error');
        }
    }

    async openDocument(claim: CafeClaim) {
        if (!claim.documentPath || this.openingDocumentId()) return;
        this.openingDocumentId.set(claim.id);
        try {
            const url = await this.cafeService.createClaimDocumentUrl(claim.documentPath);
            window.open(url, '_blank', 'noopener,noreferrer');
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : 'Could not open document.';
            this.toastService.show(msg, 'error');
        } finally {
            this.openingDocumentId.set(null);
        }
    }

    goBack() {
        this.location.back();
    }

    statusClass(status: CafeClaimStatus): string {
        if (status === 'approved') return 'bg-sage/50 border-sage';
        if (status === 'rejected') return 'bg-red-100 border-red-300';
        return 'bg-primary/20 border-primary';
    }

    private updateReviewedClaim(claimId: string, status: CafeClaimStatus, extra: Partial<CafeClaim> = {}) {
        const reviewedAt = new Date().toISOString();
        const filter = this.activeFilter();
        const updated = this.claims().map(claim =>
            claim.id === claimId ? { ...claim, ...extra, status, reviewedAt } : claim
        );
        this.claims.set(filter === 'pending' ? updated.filter(claim => claim.id !== claimId) : updated);
        this.expandedClaimIds.update(ids => {
            const next = new Set(ids);
            next.delete(claimId);
            return next;
        });
    }
}
