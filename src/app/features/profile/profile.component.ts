import { ChangeDetectionStrategy, Component, inject, OnDestroy, OnInit, signal, computed } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { CheckInService } from '../../core/services/checkin.service';
import { CafeService } from '../../core/services/cafe.service';
import { CheckIn } from '../../core/models/checkin.model';
import { Cafe, CafeClaim, CafeClaimStatus } from '../../core/models/cafe.model';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CafeListService } from '../../core/services/cafe-list.service';
import { RouterModule } from '@angular/router';
import { ToastService } from '../../shared/components/toast/toast.service';

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
  imports: [DatePipe, RouterModule, FormsModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
})
export class ProfileComponent implements OnInit, OnDestroy {
  authService = inject(AuthService);
  private checkinService = inject(CheckInService);
  cafeListService = inject(CafeListService);
  private toastService = inject(ToastService);

  private cafeService = inject(CafeService);

  recentCheckins = signal<CheckIn[]>([]);
  checkinsLoading = signal(true);
  mySubmissions = signal<Cafe[]>([]);
  myCafeClaims = signal<CafeClaim[]>([]);
  claimsLoading = signal(true);
  appealingClaimId = signal<string | null>(null);
  appealMessage = signal('');
  appealSubmitting = signal(false);
  profilePhotoFailed = signal(false);
  pendingClaimsCount = signal(0);
  allBadges = ALL_BADGES;
  private visibilityHandler = () => {
    if (document.visibilityState === 'visible') this.loadCafeClaims(false);
  };

  userTitle = computed(() => {
    const points = this.authService.currentUser()?.points || 0;
    if (points >= 1000) return 'Caffeine King';
    if (points >= 500) return 'Kopi Kaki';
    if (points >= 100) return 'Brew Buddy';
    return 'Coffee Curious';
  });

  visibleRecentCheckins = computed(() => this.recentCheckins().slice(0, 5));

  hasBadge(name: string): boolean {
    return this.authService.currentUser()?.badges?.includes(name) ?? false;
  }

  claimStatusClass(status: CafeClaimStatus): string {
    if (status === 'approved') return 'bg-sage/50 border-sage';
    if (status === 'rejected') return 'bg-red-100 border-red-300';
    return 'bg-primary/20 border-primary';
  }

  claimStatusIcon(status: CafeClaimStatus): string {
    if (status === 'approved') return 'verified';
    if (status === 'rejected') return 'cancel';
    return 'pending';
  }

  startAppeal(claim: CafeClaim) {
    this.appealingClaimId.set(claim.id);
    this.appealMessage.set(claim.appealMessage || '');
  }

  cancelAppeal() {
    this.appealingClaimId.set(null);
    this.appealMessage.set('');
  }

  async submitAppeal(claim: CafeClaim) {
    const message = this.appealMessage().trim();
    if (!message) {
      this.toastService.show('Add an appeal message first.', 'error');
      return;
    }
    this.appealSubmitting.set(true);
    try {
      await this.cafeService.appealCafeClaim(claim, message);
      const appealedAt = new Date().toISOString();
      this.myCafeClaims.update(claims => claims.map(c =>
        c.id === claim.id ? { ...c, status: 'pending', appealMessage: message, appealedAt, reviewedAt: null } : c
      ));
      this.cancelAppeal();
      this.toastService.show('Appeal sent for review.', 'success');
    } catch (error: any) {
      this.toastService.show(error?.message || 'Could not submit appeal.', 'error');
    } finally {
      this.appealSubmitting.set(false);
    }
  }

  profileInitials(): string {
    const name = this.authService.currentUser()?.displayName?.trim() || 'Coffee Lover';
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map(part => part[0])
      .join('')
      .toUpperCase();
  }

  async ngOnInit() {
    const user = this.authService.currentUser();
    if (user) {
      this.cafeListService.loadMyLists();
      this.cafeListService.loadSharedLists();
      this.cafeService.getMySubmissions().then(s => this.mySubmissions.set(s));
      this.loadCafeClaims();
      if (user.isAdmin) {
        this.cafeService.getCafeClaims('pending').then(c => this.pendingClaimsCount.set(c.length)).catch(() => {});
      }
      document.addEventListener('visibilitychange', this.visibilityHandler);
      try {
        const checkins = await this.checkinService.getUserCheckins(user.uid, 10);
        this.recentCheckins.set(checkins);
      } catch {
        this.toastService.show('Could not load your check-in history.', 'error');
      } finally {
        this.checkinsLoading.set(false);
      }
    } else {
      this.checkinsLoading.set(false);
      this.claimsLoading.set(false);
    }
  }

  ngOnDestroy() {
    document.removeEventListener('visibilitychange', this.visibilityHandler);
  }

  private loadCafeClaims(showLoading = true) {
    if (showLoading) this.claimsLoading.set(true);
    this.cafeService.getMyCafeClaims()
      .then(claims => this.myCafeClaims.set(claims))
      .catch(() => this.toastService.show('Could not load your cafe claim status.', 'error'))
      .finally(() => this.claimsLoading.set(false));
  }
}
