import { Component, EventEmitter, inject, Input, Output, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CafeListService } from '../../../core/services/cafe-list.service';
import { CafeList } from '../../../core/models/cafe-list.model';

@Component({
    selector: 'app-save-to-list-modal',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './save-to-list-modal.component.html'
})
export class SaveToListModalComponent implements OnInit {
    private cafeListService = inject(CafeListService);

    @Input() cafeId!: string;
    @Output() close = new EventEmitter<void>();

    isCreatingNew = signal(false);
    newListName = signal('');
    newListDesc = signal('');

    myLists = this.cafeListService.myLists;

    ngOnInit() {
        this.cafeListService.loadMyLists();
    }

    async createAndAdd() {
        if (!this.newListName().trim()) return;

        try {
            const listId = await this.cafeListService.createList(this.newListName(), this.newListDesc());
            await this.addToList(listId);
            this.closeModal();
        } catch (e) {
            console.error(e);
            alert('Failed to create list');
        }
    }

    async addToList(listId: string) {
        try {
            await this.cafeListService.addCafeToList(listId, this.cafeId);
            alert('Saved to list!');
            this.closeModal();
        } catch (e) {
            console.error(e);
            alert('Failed to save');
        }
    }

    closeModal() {
        this.close.emit();
    }
}
