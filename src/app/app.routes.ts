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
  { path: 'session', redirectTo: 'session/join', pathMatch: 'full' },
  {
    path: 'session/join',
    loadComponent: () =>
      import('./features/session/lobby/lobby.component').then(
        (m) => m.LobbyComponent
      ),
    canActivate: [authGuard],
    data: { showBottomNavbar: false }
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
    path: 'session/:id/bill-split',
    loadComponent: () =>
      import('./features/session/bill-split/bill-split.component').then(
        (m) => m.BillSplitComponent
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
    path: 'cafe/add',
    loadComponent: () =>
      import('./features/cafe/add/add-cafe.component').then(
        (m) => m.AddCafeComponent
      ),
    canActivate: [authGuard],
    data: { showBottomNavbar: false }
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
  {
    path: 'cafe/:id/scene',
    loadComponent: () =>
      import('./features/cafe/scene/scene.component').then(
        (m) => m.SceneComponent
      ),
    canActivate: [authGuard],
    data: { showBottomNavbar: false, activeTab: 'home' }
  },
  {
    path: 'list/:id',
    loadComponent: () =>
      import('./features/list-detail/list-detail.component').then(
        (m) => m.ListDetailComponent
      ),
    canActivate: [authGuard],
    data: { showBottomNavbar: false, activeTab: 'profile' }
  },
  {
    path: 'map',
    loadComponent: () =>
      import('./features/map/map.component').then((m) => m.MapComponent),
    canActivate: [authGuard],
    data: { showBottomNavbar: true, activeTab: 'map' }
  },
  { path: '**', redirectTo: 'home' },
];
