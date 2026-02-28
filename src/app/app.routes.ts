import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then((m) => m.LoginComponent),
    data: { showBottomNavbar: false }
  },
  {
    path: 'home',
    loadComponent: () =>
      import('./features/home/home.component').then((m) => m.HomeComponent),
    canActivate: [authGuard],
    data: { showBottomNavbar: true, activeTab: 'home' }
  },
  {
    path: 'session/create',
    loadComponent: () =>
      import('./features/session/create/create-session.component').then(
        (m) => m.CreateSessionComponent
      ),
    canActivate: [authGuard],
    data: { showBottomNavbar: false }
  },
  {
    path: 'session/:id/lobby',
    loadComponent: () =>
      import('./features/session/lobby/lobby.component').then(
        (m) => m.LobbyComponent
      ),
    canActivate: [authGuard],
    data: { showBottomNavbar: false }
  },
  {
    path: 'session/:id/voting',
    loadComponent: () =>
      import('./features/session/voting/vote.component').then(
        (m) => m.VoteComponent
      ),
    canActivate: [authGuard],
    data: { showBottomNavbar: false }
  },
  {
    path: 'session/:id/result',
    loadComponent: () =>
      import('./features/session/result/result.component').then(
        (m) => m.ResultComponent
      ),
    canActivate: [authGuard],
    data: { showBottomNavbar: false }
  },
  {
    path: 'profile',
    loadComponent: () =>
      import('./features/profile/profile.component').then(
        (m) => m.ProfileComponent
      ),
    canActivate: [authGuard],
    data: { showBottomNavbar: true, activeTab: 'profile' }
  },
  {
    path: 'cafe/:id',
    loadComponent: () =>
      import('./features/cafe/detail/cafe-detail.component').then(
        (m) => m.CafeDetailComponent
      ),
    canActivate: [authGuard],
    data: { showBottomNavbar: false, activeTab: 'home' }
  },
  { path: '**', redirectTo: 'home' },
];
