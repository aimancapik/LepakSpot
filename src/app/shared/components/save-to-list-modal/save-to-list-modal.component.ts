import { Component, inject, Input, output, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CafeListService } from '../../../core/services/cafe-list.service';
import { ToastService } from '../toast/toast.service';

@Component({
    selector: 'app-save-to-list-modal',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './save-to-list-modal.component.html'
})
export class SaveToListModalComponent implements OnInit {
    private cafeListService = inject(CafeListService);
    private toastService = inject(ToastService);

    @Input() cafeId!: string;
    readonly closed = output<void>();

    isCreatingNew = signal(false);
    newListName = signal('');
    newListDesc = signal('');
    isSaving = signal(false);

    myLists = this.cafeListService.myLists;

    ngOnInit() {
        this.cafeListService.loadMyLists();
    }

    async createAndAdd() {
        if (!this.newListName().trim()) return;
        this.isSaving.set(true);
        try {
            const listId = await this.cafeListService.createList(this.newListName(), this.newListDesc());
            await this.cafeListService.addCafeToList(listId, this.cafeId);
            this.toastService.show('Saved to new list! 📋', 'success');
            this.closeModal();
        } catch (e) {
            console.error(e);
            this.toastService.show('Failed to create list', 'error');
        } finally {
            this.isSaving.set(false);
        }
    }

    async addToList(listId: string) {
        this.isSaving.set(true);
        try {
            await this.cafeListService.addCafeToList(listId, this.cafeId);
            this.toastService.show('Spot saved! 🔖', 'success');
            this.closeModal();
        } catch (e) {
            console.error(e);
            this.toastService.show('Failed to save to list', 'error');
        } finally {
            this.isSaving.set(false);
        }
    }

    closeModal() {
        this.closed.emit();
    }
}
