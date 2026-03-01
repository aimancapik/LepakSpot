import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { Cafe } from '../../../core/models/cafe.model';
import { SaveToListModalComponent } from '../save-to-list-modal/save-to-list-modal.component';

@Component({
  selector: 'app-cafe-card',
  standalone: true,
  imports: [SaveToListModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cafe-card.component.html',
  styleUrl: './cafe-card.component.scss',
})
export class CafeCardComponent {
  cafe = input.required<Cafe>();
  showSaveModal = signal(false);

  openSaveModal(event: Event) {
    event.stopPropagation();
    event.preventDefault();
    this.showSaveModal.set(true);
  }
}
