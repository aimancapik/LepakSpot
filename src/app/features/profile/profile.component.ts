import { ChangeDetectionStrategy, Component, inject, OnInit, signal, computed, ViewEncapsulation } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { CheckInService } from '../../core/services/checkin.service';
import { CheckIn } from '../../core/models/checkin.model';
import { DatePipe } from '@angular/common';
import { CafeListService } from '../../core/services/cafe-list.service';
import { RouterModule } from '@angular/router';

interface Badge {
  name: string;
  icon: string;
  description: string;
  requirement: string;
}

const ALL_BADGES: Badge[] = [
  { name: 'Caffeine King', icon: 'local_fire_department', description: 'Visited 50+ cafés', requirement: 'Visit 50 cafés' },
  { name: 'Early Bird', icon: 'wb_twilight', description: 'Checked in before 9am', requirement: 'Check in before 9am' },
  { name: 'Halal Hunter', icon: 'verified', description: 'Visited 10 halal cafés', requirement: 'Visit 10 halal cafés' },
  { name: 'Night Owl', icon: 'dark_mode', description: 'Checked in after 10pm', requirement: 'Check in after 10pm' },
  { name: 'Explorer', icon: 'explore', description: 'Visited 20+ cafés', requirement: 'Visit 20 cafés' },
  { name: 'Streak Master', icon: 'bolt', description: '7-day check-in streak', requirement: '7-day streak' },
];

@Component({
  selector: 'app-profile',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, RouterModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
})
export class ProfileComponent implements OnInit {
  authService = inject(AuthService);
  private checkinService = inject(CheckInService);
  cafeListService = inject(CafeListService);

  recentCheckins = signal<CheckIn[]>([]);
  allBadges = ALL_BADGES;

  userTitle = computed(() => {
    const points = this.authService.currentUser()?.points || 0;
    if (points >= 1000) return 'Caffeine King';
    if (points >= 500) return 'Kopi Kaki';
    if (points >= 100) return 'Brew Buddy';
    return 'Coffee Curious';
  });

  hasBadge(name: string): boolean {
    return this.authService.currentUser()?.badges?.includes(name) ?? false;
  }

  async ngOnInit() {
    const user = this.authService.currentUser();
    if (user) {
      this.cafeListService.loadMyLists();
      this.cafeListService.loadSharedLists();
      try {
        const checkins = await this.checkinService.getUserCheckins(user.uid);
        this.recentCheckins.set(checkins);
      } catch {
        // Firestore index might not exist yet
      }
    }
  }
}
