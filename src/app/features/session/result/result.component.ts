import { ChangeDetectionStrategy, Component, inject, OnInit, signal, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SessionService } from '../../../core/services/session.service';
import { CafeService } from '../../../core/services/cafe.service';
import { CheckInService } from '../../../core/services/checkin.service';
import { BottomNavComponent } from '../../../shared/components/bottom-nav/bottom-nav.component';
import { Cafe } from '../../../core/models/cafe.model';

@Component({
  selector: 'app-result',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, BottomNavComponent],
  templateUrl: './result.component.html',
  styleUrl: './result.component.scss',
})
export class ResultComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private sessionService = inject(SessionService);
  private cafeService = inject(CafeService);
  private checkinService = inject(CheckInService);

  winnerCafe = signal<Cafe | null>(null);
  checkedIn = signal(false);

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
        const session = this.sessionService.activeSession();
        if (session?.winnerId) {
          clearInterval(check);
          resolve();
        }
      }, 200);
    });

    const session = this.sessionService.activeSession()!;
    if (session.winnerId) {
      const cafes = await this.cafeService.getCafesByIds([session.winnerId]);
      if (cafes.length > 0) {
        this.winnerCafe.set(cafes[0]);
      }
    }
  }

  async checkin() {
    const cafe = this.winnerCafe();
    if (!cafe) return;

    try {
      await this.checkinService.checkIn(cafe.id, cafe.name);
      this.checkedIn.set(true);
    } catch (err) {
      console.error('Check-in failed:', err);
    }
  }
}
