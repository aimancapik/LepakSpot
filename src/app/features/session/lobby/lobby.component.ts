import { ChangeDetectionStrategy, Component, effect, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SessionService } from '../../../core/services/session.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-lobby',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  templateUrl: './lobby.component.html',
  styleUrl: './lobby.component.scss',
})
export class LobbyComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private sessionService = inject(SessionService);
  private authService = inject(AuthService);

  codeSlots = [0, 1, 2, 3, 4, 5];
  codeChars = signal<string[]>(['', '', '', '', '', '']);
  error = signal('');
  joining = signal(false);
  joined = signal(false);

  constructor() {
    // Reactively navigate when session status becomes 'voting' — no polling needed
    effect(() => {
      const session = this.sessionService.activeSession();
      if (session?.status === 'voting') {
        this.router.navigate(['/session', session.id, 'voting']);
      }
    });
  }

  ngOnInit() {
    const sessionId = this.route.snapshot.paramMap.get('id');
    if (sessionId) {
      this.sessionService.listenSession(sessionId);
      this.joined.set(true);
    }
  }

  ngOnDestroy() {
    // Only cleanup if not transitioning into the session itself
    const session = this.sessionService.activeSession();
    if (!session || session.status !== 'voting') {
      this.sessionService.cleanup();
    }
  }

  onCodeInput(event: Event, index: number) {
    const input = event.target as HTMLInputElement;
    const value = input.value.toUpperCase();
    this.codeChars.update((chars) => {
      const updated = [...chars];
      updated[index] = value;
      return updated;
    });

    // Auto-focus next
    if (value && index < 5) {
      const next = input.parentElement?.children[index + 1] as HTMLInputElement;
      next?.focus();
    }
  }

  onCodeKeydown(event: KeyboardEvent, index: number) {
    if (event.key === 'Backspace' && !this.codeChars()[index] && index > 0) {
      const prev = (event.target as HTMLElement).parentElement?.children[index - 1] as HTMLInputElement;
      prev?.focus();
    }
  }

  async joinSession() {
    const code = this.codeChars().join('');
    if (code.length < 6) return;

    this.joining.set(true);
    this.error.set('');

    try {
      const sessionId = await this.sessionService.joinSession(code);
      if (sessionId) {
        this.joined.set(true);
        // effect() in constructor handles navigation when status becomes 'voting'
      } else {
        this.error.set('Session not found. Check the code and try again.');
      }
    } catch {
      this.error.set('Something went wrong. Please try again.');
    } finally {
      this.joining.set(false);
    }
  }

  async leave() {
    const sessionId = this.route.snapshot.paramMap.get('id')
      ?? this.sessionService.activeSession()?.id;
    if (sessionId) {
      await this.sessionService.leaveSession(sessionId);
    } else {
      this.sessionService.cleanup();
    }
    this.router.navigate(['/home']);
  }
}
