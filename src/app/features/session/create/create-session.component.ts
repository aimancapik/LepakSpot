import { ChangeDetectionStrategy, Component, inject, OnInit, signal, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CafeService } from '../../../core/services/cafe.service';
import { SessionService } from '../../../core/services/session.service';
import { AuthService } from '../../../core/services/auth.service';
import { CafeListService } from '../../../core/services/cafe-list.service';
import { Cafe } from '../../../core/models/cafe.model';

@Component({
  selector: 'app-create-session',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './create-session.component.html',
  styleUrl: './create-session.component.scss',
})
export class CreateSessionComponent implements OnInit {
  private cafeService = inject(CafeService);
  private sessionService = inject(SessionService);
  private authService = inject(AuthService);
  private cafeListService = inject(CafeListService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  sessionCafes = signal<Cafe[]>([]);
  sessionCode = signal('');
  sessionId = signal('');
  sessionMembers = signal<string[]>([]);

  async ngOnInit() {
    this.route.queryParams.subscribe(async (params) => {
      const listId = params['listId'];
      let cafeIdsToUse: string[] = [];

      if (listId) {
        const list = await this.cafeListService.getListById(listId);
        if (list && list.cafeIds.length > 0) {
          // Shuffle or just use them all if less than 10? Sessions can handle any.
          // Let's use up to 10 cafes from the list for the session
          const listCafes = await this.cafeService.getCafesByIds(list.cafeIds);
          this.sessionCafes.set(listCafes.slice(0, 10));
          cafeIdsToUse = this.sessionCafes().map(c => c.id!);
        }
      }

      if (cafeIdsToUse.length === 0) {
        await this.cafeService.getNearby();
        const allCafes = this.cafeService.nearbyCafes();

        // Pick up to 5 random cafés
        const shuffled = [...allCafes].sort(() => Math.random() - 0.5);
        const picked = shuffled.slice(0, 5);
        this.sessionCafes.set(picked);
        cafeIdsToUse = picked.map((c) => c.id!);
      }

      // Create session
      try {
        const id = await this.sessionService.createSession(cafeIdsToUse);
        this.sessionId.set(id);
        const session = this.sessionService.activeSession();
        if (session) {
          this.sessionCode.set(session.code);
          this.sessionMembers.set([this.authService.currentUser()?.displayName || 'You']);
        }
      } catch (err) {
        console.error('Failed to create session:', err);
      }
    });
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
        alert('Session code copied to clipboard!');
      }
    } catch {
      // User cancelled share
    }
  }

  async startVoting() {
    const id = this.sessionId();
    if (!id) return;
    await this.sessionService.startVoting(id);
    this.router.navigate(['/session', id, 'voting']);
  }
}
