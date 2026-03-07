import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { RouterOutlet, Router, ActivatedRoute, NavigationEnd } from '@angular/router';
import { BottomNavComponent } from './shared/components/bottom-nav/bottom-nav.component';
import { ToastComponent } from './shared/components/toast/toast.component';
import { OnboardingComponent } from './shared/components/onboarding/onboarding.component';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, mergeMap } from 'rxjs/operators';
import { AuthService } from './core/services/auth.service';
import { SwUpdate } from '@angular/service-worker';
import { ToastService } from './shared/components/toast/toast.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, BottomNavComponent, ToastComponent, OnboardingComponent],
  template: `
    <app-toast />
    
    @if (authService.loading()) {
      <!-- Zine Splash Screen -->
      <div class="fixed inset-0 z-[100] bg-latte flex flex-col items-center justify-center p-6 text-center select-none overflow-hidden grain-overlay">
        <!-- Floating shapes logic to make it feel alive -->
        <div class="absolute top-10 left-10 w-24 h-24 bg-primary/20 rotate-12 z-0 zine-border blur-sm animate-pulse"></div>
        <div class="absolute bottom-20 right-5 w-32 h-12 bg-sage/30 -rotate-6 z-0 zine-border blur-sm"></div>
        
        <div class="relative z-10 flex flex-col items-center gap-6">
          <div class="relative">
            <div class="absolute -inset-4 bg-espresso/5 rounded-full blur-xl animate-spin-slow"></div>
            <div class="relative w-24 h-24 bg-white zine-border zine-shadow flex items-center justify-center -rotate-3 p-4">
              <img src="assets/icons/icon-192x192.png" alt="LepakSpot" class="w-full h-full object-contain grayscale opacity-20" 
                   onerror="this.src='https://ui-avatars.com/api/?name=LS&background=E8E4D9&color=2D2926'"/>
            </div>
            <!-- Sticker label -->
            <div class="absolute -bottom-2 -right-6 bg-primary text-espresso px-4 py-1 zine-border zine-shadow rotate-12 font-zine font-bold text-xs uppercase tracking-widest">
              Loading...
            </div>
          </div>
          
          <div class="space-y-1">
            <h1 class="text-4xl font-black italic tracking-tighter uppercase font-zine text-espresso -rotate-1 drop-shadow-sm">
              LepakSpot
            </h1>
            <p class="font-marker text-espresso/60 text-lg">Waking up the local vibes...</p>
          </div>
          
          <!-- Custom loader bar -->
          <div class="w-48 h-2 bg-espresso/10 zine-border mt-4 overflow-hidden">
            <div class="h-full bg-primary animate-progress"></div>
          </div>
        </div>

        <!-- Scrapbook edges -->
        <div class="absolute top-0 left-0 w-full h-4 bg-[repeating-linear-gradient(90deg,transparent,transparent_20px,var(--color-espresso)_20px,var(--color-espresso)_40px)] opacity-10"></div>
        <div class="absolute bottom-0 left-0 w-full h-4 bg-[repeating-linear-gradient(90deg,transparent,transparent_20px,var(--color-espresso)_20px,var(--color-espresso)_40px)] opacity-10"></div>
      </div>
    }

    <app-onboarding />
    <router-outlet></router-outlet>
    
    @if (showNav()) {
      <app-bottom-nav [activeTab]="activeTab()" />
    }
  `,
  styles: [`
    @keyframes progress {
      0% { width: 0%; transform: translateX(-100%); }
      50% { width: 70%; transform: translateX(0); }
      100% { width: 100%; transform: translateX(100%); }
    }
    .animate-progress {
      animation: progress 2s infinite ease-in-out;
    }
    .animate-spin-slow {
      animation: spin 8s linear infinite;
    }
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `]
})
export class App implements OnInit {
  protected authService = inject(AuthService);
  private router = inject(Router);
  private activatedRoute = inject(ActivatedRoute);
  private swUpdate = inject(SwUpdate);
  private toastService = inject(ToastService);

  private routeData$ = this.router.events.pipe(
    filter(event => event instanceof NavigationEnd),
    map(() => this.activatedRoute),
    map(route => {
      while (route.firstChild) route = route.firstChild;
      return route;
    }),
    mergeMap(route => route.data)
  );

  private routeData = toSignal(this.routeData$);

  ngOnInit() {
    if (this.swUpdate.isEnabled) {
      this.swUpdate.versionUpdates.pipe(
        filter((evt) => evt.type === 'VERSION_READY')
      ).subscribe(() => {
        this.toastService.show(
          'New version available! Reload to update.',
          'info'
        );
        // Optionally, we could automatically reload, but a toast is cleaner for UX
      });
    }
  }

  showNav = () => this.routeData()?.['showBottomNavbar'] !== false;
  activeTab = () => this.routeData()?.['activeTab'] ?? 'home';
}
