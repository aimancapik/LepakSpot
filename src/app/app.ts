import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet, Router, ActivatedRoute, NavigationEnd } from '@angular/router';
import { BottomNavComponent } from './shared/components/bottom-nav/bottom-nav.component';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, mergeMap } from 'rxjs/operators';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, BottomNavComponent],
  template: `
    <router-outlet></router-outlet>
    
    @if (showNav()) {
      <app-bottom-nav [activeTab]="activeTab()" />
    }
  `,
})
export class App {
  private router = inject(Router);
  private activatedRoute = inject(ActivatedRoute);

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

  showNav = () => this.routeData()?.['showBottomNavbar'] !== false;
  activeTab = () => this.routeData()?.['activeTab'] ?? 'home';
}
