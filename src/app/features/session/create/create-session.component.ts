import { ChangeDetectionStrategy, Component, computed, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { CafeService } from '../../../core/services/cafe.service';
import { SessionService } from '../../../core/services/session.service';
import { CafeListService } from '../../../core/services/cafe-list.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { Cafe } from '../../../core/models/cafe.model';

@Component({
  selector: 'app-create-session',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './create-session.component.html',
  styleUrl: './create-session.component.scss',
})
export class CreateSessionComponent implements OnInit, OnDestroy {
  private cafeService = inject(CafeService);
  private sessionService = inject(SessionService);
  private cafeListService = inject(CafeListService);
  private toastService = inject(ToastService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  sessionCafes = signal<Cafe[]>([]);
  sessionCode = signal('');
  sessionId = signal('');
  creating = signal(false);
  isSpinning = signal(false);
  spinHighlight = signal(-1);

  memberCount = computed(() => this.sessionService.activeSession()?.members.length ?? (this.sessionId() ? 1 : 0));
  memberAvatarRange = computed(() => Array.from({ length: Math.min(this.memberCount(), 5) }, (_, i) => i));

  private cafeIdsToUse: string[] = [];
  private queryParamsSub?: Subscription;

  ngOnInit() {
    this.queryParamsSub = this.route.queryParams.subscribe(async (params) => {
      const listId = params['listId'];

      if (listId) {
        const list = await this.cafeListService.getListById(listId);
        if (list && list.cafeIds.length > 0) {
          const listCafes = await this.cafeService.getCafesByIds(list.cafeIds);
          this.sessionCafes.set(listCafes.slice(0, 10));
          this.cafeIdsToUse = this.sessionCafes().map(c => c.id!);
          return;
        }
      }

      await this.cafeService.getNearby();
      const allCafes = this.cafeService.nearbyCafes();
      const shuffled = [...allCafes].sort(() => Math.random() - 0.5);
      const picked = shuffled.slice(0, 5);
      this.sessionCafes.set(picked);
      this.cafeIdsToUse = picked.map((c) => c.id!);
    });
  }

  async create() {
    if (this.creating() || this.cafeIdsToUse.length === 0) return;
    this.creating.set(true);
    try {
      const id = await this.sessionService.createSession(this.cafeIdsToUse);
      this.sessionId.set(id);
      const session = this.sessionService.activeSession();
      if (session) {
        this.sessionCode.set(session.code);
      }
    } catch (err) {
      console.error('Failed to create session:', err);
    } finally {
      this.creating.set(false);
    }
  }

  async spinRoulette() {
    if (this.isSpinning() || this.sessionCafes().length === 0) return;
    this.isSpinning.set(true);
    this.spinHighlight.set(-1);

    const total = this.sessionCafes().length;
    const winner = Math.floor(Math.random() * total);
    const steps = 20 + winner;

    for (let i = 0; i <= steps; i++) {
      await new Promise(r => setTimeout(r, 60 + i * 8));
      this.spinHighlight.set(i % total);
    }

    this.spinHighlight.set(winner);
    await new Promise(r => setTimeout(r, 800));
    this.isSpinning.set(false);

    const winnerId = this.sessionCafes()[winner].id!;
    this.cafeIdsToUse = [winnerId];

    if (this.sessionId()) {
      await this.sessionService.updateSessionCafes(this.sessionId(), this.cafeIdsToUse);
    }
  }

  async shareSession() {
    const code = this.sessionCode();
    const shareData = {
      title: 'Join my session!',
      text: `Join my café voting session on LepakSpot! Session code: ${code}`,
      url: `${window.location.origin}/session/${this.sessionId()}/lobby`,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(`Join my LepakSpot session! Code: ${code}`);
        this.toastService.show('Session code copied to clipboard!', 'success');
      }
    } catch {
      // User cancelled share
    }
  }

  ngOnDestroy() {
    this.queryParamsSub?.unsubscribe();
    const session = this.sessionService.activeSession();
    if (session?.status === 'waiting') {
      this.sessionService.cleanup();
    }
  }

  async startVoting() {
    const id = this.sessionId();
    if (!id) return;
    await this.sessionService.startVoting(id);
    this.router.navigate(['/session', id, 'voting']);
  }
}
