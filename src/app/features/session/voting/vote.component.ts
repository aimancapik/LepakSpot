import { ChangeDetectionStrategy, Component, inject, OnInit, OnDestroy, signal, computed, effect } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SessionService } from '../../../core/services/session.service';
import { CafeService } from '../../../core/services/cafe.service';
import { AuthService } from '../../../core/services/auth.service';
import { CafeListService } from '../../../core/services/cafe-list.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { Cafe } from '../../../core/models/cafe.model';

@Component({
  selector: 'app-vote',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './vote.component.html',
  styleUrl: './vote.component.scss',
})
export class VoteComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private sessionService = inject(SessionService);
  private cafeService = inject(CafeService);
  private authService = inject(AuthService);
  private cafeListService = inject(CafeListService);
  private toastService = inject(ToastService);

  cafes = signal<Cafe[]>([]);
  currentIndex = signal(0);
  isFav = signal(false);
  isActing = signal(false);  // spam protection for vote/skip buttons
  private hasAbstained = signal(false);

  // Swipe support
  private touchStartPos = { x: 0, y: 0 };
  swipeOffset = signal({ x: 0, y: 0 });
  swipeOpacity = computed(() => {
    const x = Math.abs(this.swipeOffset().x);
    return Math.max(0, 1 - x / 200);
  });
  swipeRotation = computed(() => (this.swipeOffset().x / 10));
  swipeGlassOpacity = computed(() => Math.min(1, Math.abs(this.swipeOffset().x) / 80));
  swipeDirection = computed(() => this.swipeOffset().x > 0 ? 'right' : 'left');

  currentCafe = computed(() => {
    const idx = this.currentIndex();
    const all = this.cafes();
    return idx < all.length ? all[idx] : null;
  });

  votedCount = computed(() => {
    const session = this.sessionService.activeSession();
    return session ? Object.keys(session.votes).length : 0;
  });

  totalMembers = computed(() => {
    const session = this.sessionService.activeSession();
    return session ? session.members.length : 0;
  });

  progressWidth = computed(() => {
    const total = this.totalMembers();
    if (total === 0) return '0%';
    return `${(this.votedCount() / total) * 100}%`;
  });

  constructor() {
    // Watch for session completion — route to meetpoint if enabled
    effect(() => {
      const session = this.sessionService.activeSession();
      if (session?.status === 'done') {
        if (session.meetInMiddle) {
          this.router.navigate(['/session', session.id, 'meetpoint']);
        } else {
          this.router.navigate(['/session', session.id, 'result']);
        }
      }
    });
  }

  async ngOnInit() {
    const sessionId = this.route.snapshot.paramMap.get('id');
    if (!sessionId) {
      this.router.navigate(['/home']);
      return;
    }

    this.sessionService.listenSession(sessionId);

    // Wait for session data with 10-second timeout
    const sessionLoaded = await new Promise<boolean>((resolve) => {
      const check = setInterval(() => {
        if (this.sessionService.activeSession()) { clearInterval(check); resolve(true); }
      }, 200);
      setTimeout(() => { clearInterval(check); resolve(false); }, 10_000);
    });

    if (!sessionLoaded) {
      this.toastService.show('Could not load session. Check your connection.', 'error');
      this.router.navigate(['/home']);
      return;
    }

    const session = this.sessionService.activeSession()!;
    const cafes = await this.cafeService.getCafesByIds(session.cafeOptions);
    this.cafes.set(cafes);
  }

  ngOnDestroy() {
    const session = this.sessionService.activeSession();
    const userUid = this.authService.currentUser()?.uid;
    if (session && userUid && !session.votes[userUid] && session.status === 'voting') {
      this.sessionService.abstain(session.id);
    }
  }

  async vote() {
    if (this.isActing()) return;
    const session = this.sessionService.activeSession();
    const cafe = this.currentCafe();
    if (!session || !cafe) return;

    this.isActing.set(true);
    try {
      await this.sessionService.castVote(session.id, cafe.id);
      await this.next();
    } finally {
      this.isActing.set(false);
    }
  }

  async skip() {
    if (this.isActing()) return;
    this.isActing.set(true);
    try {
      await this.next();
    } finally {
      this.isActing.set(false);
    }
  }

  async favourite() {
    const cafe = this.currentCafe();
    if (!cafe || this.isFav()) return;
    this.isFav.set(true);
    try {
      await this.cafeListService.quickSave(cafe.id);
      this.toastService.show('Saved to Quick Saves! ⭐', 'success');
    } catch {
      this.isFav.set(false);
      this.toastService.show('Could not save. Try again.', 'error');
    }
  }

  onTouchStart(event: TouchEvent) {
    this.touchStartPos = {
      x: event.touches[0].clientX,
      y: event.touches[0].clientY
    };
  }

  onTouchMove(event: TouchEvent) {
    const currentX = event.touches[0].clientX;
    const currentY = event.touches[0].clientY;
    this.swipeOffset.set({
      x: currentX - this.touchStartPos.x,
      y: currentY - this.touchStartPos.y
    });
  }

  async onTouchEnd() {
    const offset = this.swipeOffset().x;
    const threshold = 100;

    if (offset > threshold) {
      await this.vote();
    } else if (offset < -threshold) {
      await this.skip();
    }

    this.swipeOffset.set({ x: 0, y: 0 });
  }

  private async next() {
    this.isFav.set(false);
    this.currentIndex.update((i) => i + 1);

    // If the user has gone through all cafes without voting, record an abstention
    // so the session is not permanently stalled
    const session = this.sessionService.activeSession();
    if (this.currentIndex() >= this.cafes().length && !this.hasAbstained() && session) {
      const userUid = this.authService.currentUser()?.uid;
      const alreadyVoted = userUid && session.votes[userUid];
      if (!alreadyVoted) {
        this.hasAbstained.set(true);
        await this.sessionService.abstain(session.id);
      }
    }
  }
}
