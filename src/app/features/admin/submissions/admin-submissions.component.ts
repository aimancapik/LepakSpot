import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe, Location } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Cafe } from '../../../core/models/cafe.model';
import { CafeService } from '../../../core/services/cafe.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { FadeUpDirective } from '../../../shared/directives/fade-up.directive';

@Component({
    selector: 'app-admin-submissions',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, DatePipe, RouterLink, FadeUpDirective],
    templateUrl: './admin-submissions.component.html',
})
export class AdminSubmissionsComponent implements OnInit {
    private cafeService = inject(CafeService);
    private toastService = inject(ToastService);
    private location = inject(Location);

    cafes = signal<Cafe[]>([]);
    loading = signal(true);
    reviewingId = signal<string | null>(null);

    ngOnInit() {
        this.load();
    }

    async load() {
        this.loading.set(true);
        try {
            const cafes = await this.cafeService.getPendingCafes();
            this.cafes.set(cafes);
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : 'Could not load submissions.';
            this.toastService.show(msg, 'error');
        } finally {
            this.loading.set(false);
        }
    }

    async approve(cafe: Cafe) {
        if (this.reviewingId()) return;
        this.reviewingId.set(cafe.id);
        try {
            await this.cafeService.approveCafe(cafe.id);
            this.cafes.update(list => list.filter(c => c.id !== cafe.id));
            this.toastService.show('Spot approved and live.', 'success');
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : 'Could not approve spot.';
            this.toastService.show(msg, 'error');
        } finally {
            this.reviewingId.set(null);
        }
    }

    async reject(cafe: Cafe) {
        if (this.reviewingId()) return;
        if (!confirm(`Reject and delete "${cafe.name}"? This cannot be undone.`)) return;
        this.reviewingId.set(cafe.id);
        try {
            await this.cafeService.rejectCafe(cafe.id);
            this.cafes.update(list => list.filter(c => c.id !== cafe.id));
            this.toastService.show('Submission rejected.', 'success');
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : 'Could not reject spot.';
            this.toastService.show(msg, 'error');
        } finally {
            this.reviewingId.set(null);
        }
    }

    goBack() {
        this.location.back();
    }
}
