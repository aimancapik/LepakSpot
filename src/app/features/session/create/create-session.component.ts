import { ChangeDetectionStrategy, Component, inject, OnInit, signal, ViewEncapsulation } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CafeService } from '../../../core/services/cafe.service';
import { SessionService } from '../../../core/services/session.service';
import { AuthService } from '../../../core/services/auth.service';
import { BottomNavComponent } from '../../../shared/components/bottom-nav/bottom-nav.component';
import { Cafe } from '../../../core/models/cafe.model';

@Component({
  selector: 'app-create-session',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, BottomNavComponent],
  templateUrl: './create-session.component.html',
  styleUrl: './create-session.component.scss',
})
export class CreateSessionComponent implements OnInit {
  private cafeService = inject(CafeService);
  private sessionService = inject(SessionService);
  private authService = inject(AuthService);
  private router = inject(Router);

  sessionCafes = signal<Cafe[]>([]);
  sessionCode = signal('');
  sessionId = signal('');
  sessionMembers = signal<string[]>([]);

  async ngOnInit() {
    await this.cafeService.getNearby();
    const allCafes = this.cafeService.nearbyCafes();

    // Pick up to 5 random cafés
    const shuffled = [...allCafes].sort(() => Math.random() - 0.5);
    const picked = shuffled.slice(0, 5);
    this.sessionCafes.set(picked);

    // Create session
    try {
      const cafeIds = picked.map((c) => c.id);
      const id = await this.sessionService.createSession(cafeIds);
      this.sessionId.set(id);
      const session = this.sessionService.activeSession();
      if (session) {
        this.sessionCode.set(session.code);
        this.sessionMembers.set([this.authService.currentUser()?.displayName || 'You']);
      }
    } catch (err) {
      console.error('Failed to create session:', err);
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
