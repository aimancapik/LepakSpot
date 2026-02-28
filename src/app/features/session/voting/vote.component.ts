import { ChangeDetectionStrategy, Component, inject, OnInit, signal, computed, effect, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SessionService } from '../../../core/services/session.service';
import { CafeService } from '../../../core/services/cafe.service';
import { AuthService } from '../../../core/services/auth.service';
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

  cafes = signal<Cafe[]>([]);
  currentIndex = signal(0);
  isFav = signal(false);

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
    this.next();
  }

  skip() {
    this.next();
  }

  favourite() {
    this.isFav.update((v) => !v);
  }

  private next() {
    this.isFav.set(false);
    this.currentIndex.update((i) => i + 1);
  }
}
