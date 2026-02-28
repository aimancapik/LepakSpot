import { ChangeDetectionStrategy, Component, inject, OnInit, signal, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SessionService } from '../../../core/services/session.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-lobby',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, FormsModule],
  templateUrl: './lobby.component.html',
  styleUrl: './lobby.component.scss',
})
export class LobbyComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private sessionService = inject(SessionService);
  private authService = inject(AuthService);

  codeSlots = [0, 1, 2, 3, 4, 5];
  codeChars = signal<string[]>(['', '', '', '', '', '']);
  error = signal('');
  joining = signal(false);
  joined = signal(false);

  ngOnInit() {
    const sessionId = this.route.snapshot.paramMap.get('id');
    if (sessionId) {
      this.sessionService.listenSession(sessionId);
      this.joined.set(true);
      // Watch for status change
      const checkStatus = setInterval(() => {
        const session = this.sessionService.activeSession();
        if (session?.status === 'voting') {
          clearInterval(checkStatus);
          this.router.navigate(['/session', session.id, 'voting']);
        }
      }, 1000);
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
        // Watch for voting start
        const checkStatus = setInterval(() => {
          const session = this.sessionService.activeSession();
          if (session?.status === 'voting') {
            clearInterval(checkStatus);
            this.router.navigate(['/session', session.id, 'voting']);
          }
        }, 1000);
      } else {
        this.error.set('Session not found. Check the code and try again.');
      }
    } catch {
      this.error.set('Something went wrong. Please try again.');
    } finally {
      this.joining.set(false);
    }
  }
}
