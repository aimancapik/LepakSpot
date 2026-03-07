import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { Cafe } from '../../../core/models/cafe.model';
import { SaveToListModalComponent } from '../save-to-list-modal/save-to-list-modal.component';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../toast/toast.service';

@Component({
  selector: 'app-cafe-card',
  standalone: true,
  imports: [SaveToListModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cafe-card.component.html',
  styleUrl: './cafe-card.component.scss',
})
export class CafeCardComponent {
  authService = inject(AuthService);
  toastService = inject(ToastService);

  cafe = input.required<Cafe>();
  showSaveModal = signal(false);

  openSaveModal(event: Event) {
    event.stopPropagation();
    event.preventDefault();

    if (this.authService.isGuest()) {
      this.toastService.show('Sign in to save this spot 🔐', 'error');
      return;
    }

    this.showSaveModal.set(true);
  }
}
