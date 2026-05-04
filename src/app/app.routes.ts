import { Routes } from '@angular/router';

import { authOrGuestGuard, authOnlyGuard } from './core/guards/guest.guard';
import { adminGuard } from './core/guards/admin.guard';

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
    canActivate: [authOrGuestGuard],
    data: { showBottomNavbar: true, activeTab: 'home' }
  },
  { path: 'session', redirectTo: 'session/join', pathMatch: 'full' },
  {
    path: 'session/join',
    loadComponent: () =>
      import('./features/session/lobby/lobby.component').then(
        (m) => m.LobbyComponent
      ),
    canActivate: [authOnlyGuard],
    data: { showBottomNavbar: true, activeTab: 'sessions' }
  },
  {
    path: 'session/create',
    loadComponent: () =>
      import('./features/session/create/create-session.component').then(
        (m) => m.CreateSessionComponent
      ),
    canActivate: [authOnlyGuard],
    data: { showBottomNavbar: false }
  },
  {
    path: 'session/:id/lobby',
    loadComponent: () =>
      import('./features/session/lobby/lobby.component').then(
        (m) => m.LobbyComponent
      ),
    canActivate: [authOnlyGuard],
    data: { showBottomNavbar: false }
  },
  {
    path: 'session/:id/voting',
    loadComponent: () =>
      import('./features/session/voting/vote.component').then(
        (m) => m.VoteComponent
      ),
    canActivate: [authOnlyGuard],
    data: { showBottomNavbar: false }
  },
  {
    path: 'session/:id/meetpoint',
    loadComponent: () =>
      import('./features/session/meetpoint/meetpoint.component').then(
        (m) => m.MeetpointComponent
      ),
    canActivate: [authOnlyGuard],
    data: { showBottomNavbar: false }
  },
  {
    path: 'session/:id/result',
    loadComponent: () =>
      import('./features/session/result/result.component').then(
        (m) => m.ResultComponent
      ),
    canActivate: [authOnlyGuard],
    data: { showBottomNavbar: false }
  },
  {
    path: 'session/:id/bill-split',
    loadComponent: () =>
      import('./features/session/bill-split/bill-split.component').then(
        (m) => m.BillSplitComponent
      ),
    canActivate: [authOnlyGuard],
    data: { showBottomNavbar: false }
  },
  {
    path: 'profile/moves',
    loadComponent: () =>
      import('./features/profile/moves/profile-moves.component').then(
        (m) => m.ProfileMovesComponent
      ),
    canActivate: [authOnlyGuard],
    data: { showBottomNavbar: false, activeTab: 'profile' }
  },
  {
    path: 'profile',
    loadComponent: () =>
      import('./features/profile/profile.component').then(
        (m) => m.ProfileComponent
      ),
    canActivate: [authOnlyGuard],
    data: { showBottomNavbar: true, activeTab: 'profile' }
  },
  {
    path: 'admin/claims',
    loadComponent: () =>
      import('./features/admin/claims/admin-claims.component').then(
        (m) => m.AdminClaimsComponent
      ),
    canActivate: [authOnlyGuard, adminGuard],
    data: { showBottomNavbar: false }
  },
  {
    path: 'admin/submissions',
    loadComponent: () =>
      import('./features/admin/submissions/admin-submissions.component').then(
        (m) => m.AdminSubmissionsComponent
      ),
    canActivate: [authOnlyGuard, adminGuard],
    data: { showBottomNavbar: false }
  },
  {
    path: 'cafe/add',
    loadComponent: () =>
      import('./features/cafe/add/add-cafe.component').then(
        (m) => m.AddCafeComponent
      ),
    canActivate: [authOnlyGuard],
    data: { showBottomNavbar: false }
  },
  {
    path: 'cafe/:id/edit',
    loadComponent: () =>
      import('./features/cafe/add/add-cafe.component').then(
        (m) => m.AddCafeComponent
      ),
    canActivate: [authOnlyGuard],
    data: { showBottomNavbar: false }
  },
  {
    path: 'cafe/:id',
    loadComponent: () =>
      import('./features/cafe/detail/cafe-detail.component').then(
        (m) => m.CafeDetailComponent
      ),
    canActivate: [authOrGuestGuard],
    data: { showBottomNavbar: false, activeTab: 'home' }
  },
  {
    path: 'cafe/:id/owner',
    loadComponent: () =>
      import('./features/cafe/owner-dashboard/owner-dashboard.component').then(
        (m) => m.OwnerDashboardComponent
      ),
    canActivate: [authOnlyGuard],
    data: { showBottomNavbar: false }
  },
  {
    path: 'cafe/:id/scene',
    loadComponent: () =>
      import('./features/cafe/scene/scene.component').then(
        (m) => m.SceneComponent
      ),
    canActivate: [authOrGuestGuard],
    data: { showBottomNavbar: false, activeTab: 'home' }
  },
  {
    path: 'list/:id',
    loadComponent: () =>
      import('./features/list-detail/list-detail.component').then(
        (m) => m.ListDetailComponent
      ),
    canActivate: [authOnlyGuard],
    data: { showBottomNavbar: false, activeTab: 'profile' }
  },
  {
    path: 'map',
    loadComponent: () =>
      import('./features/map/map.component').then((m) => m.MapComponent),
    canActivate: [authOrGuestGuard],
    data: { showBottomNavbar: true, activeTab: 'map' }
  },
  { path: '**', redirectTo: 'home' },
];
