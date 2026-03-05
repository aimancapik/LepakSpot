import { ChangeDetectionStrategy, Component, inject, OnInit, signal, computed, effect } from '@angular/core';
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
export class VoteComponent implements OnInit {
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
  private hasAbstained = signal(false);

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
    // Watch for session completion
    effect(() => {
      const session = this.sessionService.activeSession();
      if (session?.status === 'done') {
        this.router.navigate(['/session', session.id, 'result']);
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

    // Wait for session data
    await new Promise<void>((resolve) => {
      const check = setInterval(() => {
        if (this.sessionService.activeSession()) {
          clearInterval(check);
          resolve();
        }
      }, 200);
    });

    const session = this.sessionService.activeSession()!;
    const cafes = await this.cafeService.getCafesByIds(session.cafeOptions);
    this.cafes.set(cafes);
  }

  async vote() {
    const session = this.sessionService.activeSession();
    const cafe = this.currentCafe();
    if (!session || !cafe) return;

    await this.sessionService.castVote(session.id, cafe.id);
    await this.next();
  }

  async skip() {
    await this.next();
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
