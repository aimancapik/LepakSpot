import { ChangeDetectionStrategy, Component, inject, OnInit, ViewEncapsulation } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { CafeService } from '../../core/services/cafe.service';
import { BroadcastService } from '../../core/services/broadcast.service';
import { ToastService } from '../../shared/components/toast/toast.service';
import { CafeTag } from '../../core/models/cafe.model';

@Component({
  selector: 'app-home',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements OnInit {
  authService = inject(AuthService);
  cafeService = inject(CafeService);
  broadcastService = inject(BroadcastService);
  private toastService = inject(ToastService);

  chips: { tag: CafeTag; label: string; icon: string }[] = [
    { tag: 'wifi', label: 'WiFi', icon: 'wifi' },
    { tag: 'halal', label: 'Halal', icon: 'verified' },
    { tag: 'aesthetic', label: 'Aesthetic', icon: 'auto_awesome' },
    { tag: 'study', label: 'Study', icon: 'book' },
    { tag: 'chill', label: 'Chill', icon: 'potted_plant' },
  ];

  ngOnInit() {
    this.cafeService.getNearby();
  }

  get greeting(): string {
    const hour = new Date().getHours();
    if (hour >= 0 && hour < 5) return 'Masih Lepak? 🦉'; // Post-midnight/Early morning
    if (hour >= 5 && hour < 12) return 'Selamat Pagi! ☕';
    if (hour >= 12 && hour < 14) return 'Lunch Hunt? 🥯';
    if (hour >= 14 && hour < 19) return 'Selamat Petang! 🥞';
    return 'Selamat Malam! 🌙';
  }

  isTagActive(tag: CafeTag): boolean {
    return this.cafeService.selectedTags().includes(tag);
  }

  showNotifications() {
    this.toastService.show('Notifications coming soon! 🔔', 'info');
  }
}
