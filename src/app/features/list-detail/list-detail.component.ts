import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CafeListService } from '../../core/services/cafe-list.service';
import { CafeService } from '../../core/services/cafe.service';
import { AuthService } from '../../core/services/auth.service';
import { Cafe } from '../../core/models/cafe.model';
import { CafeList } from '../../core/models/cafe-list.model';
import { ToastService } from '../../shared/components/toast/toast.service';

import { FadeUpDirective } from '../../shared/directives/fade-up.directive';

@Component({
    selector: 'app-list-detail',
    standalone: true,
    imports: [CommonModule, RouterModule, FadeUpDirective],
    templateUrl: './list-detail.component.html',
})
export class ListDetailComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private cafeListService = inject(CafeListService);
    private cafeService = inject(CafeService);
    private authService = inject(AuthService);
    private toastService = inject(ToastService);

    listId = signal<string | null>(null);
    currentList = signal<CafeList | null>(null);
    cafes = signal<Cafe[]>([]);
    isLoading = signal(true);

    currentUser = this.authService.currentUser;

    isOwner = computed(() => {
        const list = this.currentList();
        const user = this.currentUser();
        return list && user && list.ownerId === user.uid;
    });

    async ngOnInit() {
        this.route.paramMap.subscribe(async (params) => {
            const id = params.get('id');
            if (id) {
                this.listId.set(id);
                await this.loadListData(id);
            }
        });
    }

    async loadListData(id: string) {
        this.isLoading.set(true);
        try {
            const list = await this.cafeListService.getListById(id);

            if (list) {
                this.currentList.set(list);
                await this.loadCafes(list.cafeIds);
            } else {
                this.router.navigate(['/profile']);
            }
        } catch (error) {
            console.error('Error loading list:', error);
        } finally {
            this.isLoading.set(false);
        }
    }

    async loadCafes(cafeIds: string[]) {
        if (!cafeIds || cafeIds.length === 0) {
            this.cafes.set([]);
            return;
        }
        const listCafes = await this.cafeService.getCafesByIds(cafeIds);
        this.cafes.set(listCafes);
    }

    goBack() {
        this.router.navigate(['/profile']);
    }

    async removeFromList(cafeId: string) {
        const listId = this.listId();
        if (!listId || !this.isOwner()) return;

        try {
            await this.cafeListService.removeCafeFromList(listId, cafeId);
            // Update local state
            const updatedCafes = this.cafes().filter(c => c.id !== cafeId);
            this.cafes.set(updatedCafes);
            this.currentList.update(list => list ? { ...list, cafeIds: list.cafeIds.filter(id => id !== cafeId) } : list);
            
            if (updatedCafes.length === 0) {
                this.toastService.show('List was empty and has been deleted', 'success');
                this.router.navigate(['/profile']);
            } else {
                this.toastService.show('Spot removed from list', 'success');
            }
        } catch (error) {
            console.error('Error removing cafe:', error);
            this.toastService.show('Failed to remove spot', 'error');
        }
    }

    startSessionFromList() {
        const listId = this.listId();
        if (listId) {
            this.router.navigate(['/session/create'], { queryParams: { listId } });
        }
    }
}
