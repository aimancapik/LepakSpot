import { ChangeDetectionStrategy, Component, computed, effect, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SessionService } from '../../../core/services/session.service';
import { AuthService } from '../../../core/services/auth.service';
import { SupabaseService } from '../../../core/services/supabase.service';

import { FadeUpDirective } from '../../../shared/directives/fade-up.directive';

@Component({
  selector: 'app-lobby',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, FadeUpDirective],
  templateUrl: './lobby.component.html',
  styleUrl: './lobby.component.scss',
})
export class LobbyComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private sessionService = inject(SessionService);
  private authService = inject(AuthService);
  private supabase = inject(SupabaseService);

  codeSlots = [0, 1, 2, 3, 4, 5];
  codeChars = signal<string[]>(['', '', '', '', '', '']);
  error = signal('');
  joining = signal(false);
  joined = signal(false);
  locationStatus = signal<'pending' | 'granted' | 'denied'>('pending');

  isOwner = computed(() => {
    const session = this.sessionService.activeSession();
    return session?.createdBy === this.authService.currentUser()?.uid;
  });
  memberCount = computed(() => this.sessionService.activeSession()?.members.length ?? 0);
  sessionCode = computed(() => this.sessionService.activeSession()?.code ?? '');

  /** Count of members who have shared their location */
  locationCount = computed(() => {
    const session = this.sessionService.activeSession();
    return Object.keys(session?.memberLocations ?? {}).length;
  });

  constructor() {
    // Reactively navigate when session status changes — no polling needed
    effect(() => {
      const session = this.sessionService.activeSession();
      if (session?.status === 'voting') {
        this.router.navigate(['/session', session.id, 'voting']);
      } else if (session?.status === 'done') {
        // If meetInMiddle is enabled, go to meetpoint first
        if (session.meetInMiddle) {
          this.router.navigate(['/session', session.id, 'meetpoint']);
        } else {
          this.router.navigate(['/session', session.id, 'result']);
        }
      }
    });
  }

  ngOnInit() {
    const sessionId = this.route.snapshot.paramMap.get('id');
    if (sessionId) {
      this.joined.set(true);
      this.sessionService.joinSessionById(sessionId)
        .then(() => this.requestAndShareLocation())
        .catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : 'Could not join session.';
          this.error.set(msg);
          this.joined.set(false);
        });
    }
  }

  ngOnDestroy() {
    // Only cleanup if not transitioning into the session itself
    const session = this.sessionService.activeSession();
    const isTransitioning = session?.status === 'voting' || session?.status === 'done';
    if (!isTransitioning) {
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
        this.requestAndShareLocation();
      } else {
        this.error.set('Session not found. Check the code and try again.');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      this.error.set(msg);
    } finally {
      this.joining.set(false);
    }
  }

  /** Request geolocation and save to session.memberLocations */
  private requestAndShareLocation() {
    if (!navigator.geolocation) {
      this.locationStatus.set('denied');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        this.locationStatus.set('granted');
        const session = this.sessionService.activeSession();
        const user = this.authService.currentUser();
        if (!session || !user) return;

        const locations = { ...(session.memberLocations ?? {}) };
        locations[user.uid] = { lat: pos.coords.latitude, lng: pos.coords.longitude };

        await this.supabase.client
          .from('sessions')
          .update({ memberLocations: locations })
          .eq('id', session.id);
      },
      () => {
        this.locationStatus.set('denied');
      },
      { timeout: 8000 }
    );
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

  async startVoting() {
    const session = this.sessionService.activeSession();
    if (!session || !this.isOwner()) return;
    await this.sessionService.startVoting(session.id);
    // Navigation is handled by effect in constructor
  }
}
