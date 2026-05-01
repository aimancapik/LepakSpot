import { ChangeDetectionStrategy, Component, inject, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { CafeService } from '../../core/services/cafe.service';
import { CheckInService } from '../../core/services/checkin.service';
import { BroadcastService } from '../../core/services/broadcast.service';
import { ToastService } from '../../shared/components/toast/toast.service';
import { CafeTag, Cafe } from '../../core/models/cafe.model';
import { SaveToListModalComponent } from '../../shared/components/save-to-list-modal/save-to-list-modal.component';

import { FadeUpDirective } from '../../shared/directives/fade-up.directive';

@Component({
  selector: 'app-home',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, SaveToListModalComponent, FadeUpDirective],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements OnInit, OnDestroy {
  authService = inject(AuthService);
  cafeService = inject(CafeService);
  checkInService = inject(CheckInService);
  broadcastService = inject(BroadcastService);
  private toastService = inject(ToastService);

  chips: { tag: CafeTag; label: string; icon: string }[] = [
    { tag: 'wifi', label: 'WiFi', icon: 'wifi' },
    { tag: 'halal', label: 'Halal', icon: 'verified' },
    { tag: 'aesthetic', label: 'Aesthetic', icon: 'auto_awesome' },
    { tag: 'study', label: 'Study', icon: 'book' },
    { tag: 'chill', label: 'Chill', icon: 'potted_plant' },
  ];

  // Bookmark modal
  bookmarkCafeId = signal<string | null>(null);

  // New This Week deck
  activeNewCafeIndex = signal(0);

  nextNewCafe() {
    const len = this.newThisWeekCafes().length;
    if (len < 2) return;
    this.activeNewCafeIndex.set((this.activeNewCafeIndex() + 1) % len);
  }

  prevNewCafe() {
    const len = this.newThisWeekCafes().length;
    if (len < 2) return;
    this.activeNewCafeIndex.set((this.activeNewCafeIndex() - 1 + len) % len);
  }

  // New this week
  newThisWeekCafes = signal<Cafe[]>([]);

  private unsubscribeDensity?: () => void;


  /** Cafes with people checked in right now */
  liveCafes = computed(() => {
    const densityMap = this.checkInService.densityMap();
    const allCafes = this.cafeService.nearbyCafes();
    const active: { cafe: Cafe; count: number }[] = [];

    densityMap.forEach((density) => {
      if (density.count > 0) {
        const cafe = allCafes.find(c => c.id === density.cafeId);
        if (cafe) active.push({ cafe, count: density.count });
      }
    });

    return active.sort((a, b) => b.count - a.count).slice(0, 6);
  });

  async ngOnInit() {
    this.cafeService.getNearby();
    this.cafeService.requestUserLocation();
    this.unsubscribeDensity = this.checkInService.watchAllDensity();
    const newCafes = await this.cafeService.getNewThisWeek();
    this.newThisWeekCafes.set(newCafes);
  }

  ngOnDestroy() {
    this.unsubscribeDensity?.();
  }

  get greeting(): string {
    const hour = new Date().getHours();
    if (hour >= 0 && hour < 5) return 'Masih Lepak? 🦉';
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

  openBookmark(event: Event, cafe: Cafe) {
    event.preventDefault();
    event.stopPropagation();
    this.bookmarkCafeId.set(cafe.id);
  }

  closeBookmark() {
    this.bookmarkCafeId.set(null);
  }

  /** Count how many active broadcasts are at a given cafe */
  liveCount(cafeId: string): number {
    return this.broadcastService.activeBroadcasts().filter(b => b.cafeId === cafeId).length;
  }

  onSearch(value: string) {
    this.cafeService.searchQuery.set(value);
  }

  clearSearch() {
    this.cafeService.searchQuery.set('');
  }

  /** Returns an array of max 3 items for rendering person avatar bubbles */
  getPeopleArr(count: number): number[] {
    return Array.from({ length: Math.min(count, 3) }, (_, i) => i);
  }
}

