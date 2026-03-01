import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CafeListService } from '../../core/services/cafe-list.service';
import { CafeService } from '../../core/services/cafe.service';
import { AuthService } from '../../core/services/auth.service';
import { CafeCardComponent } from '../../shared/components/cafe-card/cafe-card.component';
import { Cafe } from '../../core/models/cafe.model';
import { CafeList } from '../../core/models/cafe-list.model';

@Component({
    selector: 'app-list-detail',
    standalone: true,
    imports: [CommonModule, RouterModule, CafeCardComponent],
    templateUrl: './list-detail.component.html',
})
export class ListDetailComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private cafeListService = inject(CafeListService);
    private cafeService = inject(CafeService);
    private authService = inject(AuthService);

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
            this.cafes.update(cafes => cafes.filter(c => c.id !== cafeId));
            this.currentList.update(list => list ? { ...list, cafeIds: list.cafeIds.filter(id => id !== cafeId) } : list);
        } catch (error) {
            console.error('Error removing cafe:', error);
        }
    }

    startSessionFromList() {
        const listId = this.listId();
        if (listId) {
            this.router.navigate(['/session/create'], { queryParams: { listId } });
        }
    }
}
