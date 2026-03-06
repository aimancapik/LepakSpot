import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SessionService } from '../../../core/services/session.service';
import { CafeService } from '../../../core/services/cafe.service';
import { CheckInService } from '../../../core/services/checkin.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { Cafe } from '../../../core/models/cafe.model';

@Component({
  selector: 'app-result',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './result.component.html',
  styleUrl: './result.component.scss',
})
export class ResultComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private sessionService = inject(SessionService);
  private cafeService = inject(CafeService);
  private checkinService = inject(CheckInService);
  private toastService = inject(ToastService);

  winnerCafe = signal<Cafe | null>(null);
  checkedIn = signal(false);
  checkingIn = signal(false);  // spam protection
  sessionId = signal<string | null>(null);
  shareSuccess = signal(false);

  winnerVotes = computed(() => {
    const session = this.sessionService.activeSession();
    const winner = this.winnerCafe();
    if (!session || !winner) return 0;
    return Object.values(session.votes).filter(v => v === winner.id).length;
  });

  totalVoters = computed(() => {
    return this.sessionService.activeSession()?.members.length ?? 0;
  });

  async ngOnInit() {
    const sId = this.route.snapshot.paramMap.get('id');
    if (!sId) {
      this.router.navigate(['/home']);
      return;
    }
    this.sessionId.set(sId);

    this.sessionService.listenSession(sId);

    // Wait for winner data with 10-second timeout
    const winnerLoaded = await new Promise<boolean>((resolve) => {
      const check = setInterval(() => {
        const session = this.sessionService.activeSession();
        if (session?.winnerId) { clearInterval(check); resolve(true); }
      }, 200);
      setTimeout(() => { clearInterval(check); resolve(false); }, 10_000);
    });

    if (!winnerLoaded) {
      console.warn('Result page: timed out waiting for winner data.');
      return;
    }

    const session = this.sessionService.activeSession()!;
    if (session.winnerId) {
      const cafes = await this.cafeService.getCafesByIds([session.winnerId]);
      if (cafes.length > 0) {
        this.winnerCafe.set(cafes[0]);
        // Check if already checked in so button reflects current state
        const hasCheckedIn = await this.checkinService.hasCheckedInToday(cafes[0].id);
        if (hasCheckedIn) this.checkedIn.set(true);
      }
    }
  }

  async checkin() {
    const cafe = this.winnerCafe();
    if (!cafe || this.checkedIn() || this.checkingIn()) return;

    this.checkingIn.set(true);
    try {
      await this.checkinService.checkIn(cafe.id, cafe.name);
      this.checkedIn.set(true);
      this.toastService.show('Checked in! +25 points earned.', 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Check-in failed.';
      this.toastService.show(msg, 'error');
      console.error('Check-in failed:', err);
    } finally {
      this.checkingIn.set(false);
    }
  }

  async share() {
    const cafe = this.winnerCafe();
    const sId = this.sessionId();
    if (!cafe) return;

    const text = `🎉 We're heading to ${cafe.name}!\n📍 ${cafe.address}`;
    const url = `${window.location.origin}/session/${sId}/result`;

    try {
      if (navigator.share) {
        await navigator.share({ title: 'LepakSpot — The Verdict!', text, url });
      } else {
        await navigator.clipboard.writeText(`${text}\n${url}`);
        this.shareSuccess.set(true);
        setTimeout(() => this.shareSuccess.set(false), 2500);
      }
    } catch {
      // user cancelled or browser blocked — silently ignore
    }
  }

  navigateToBillSplit() {
    const sId = this.sessionId();
    if (sId) {
      this.router.navigate(['/session', sId, 'bill-split']);
    }
  }
}
