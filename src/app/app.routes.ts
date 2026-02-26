import { Routes } from '@angular/router';
import { HomeComponent } from './home.component';
import { CreateSessionComponent } from './create-session.component';
import { VoteComponent } from './vote.component';
import { ResultComponent } from './result.component';
import { ProfileComponent } from './profile.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'create', component: CreateSessionComponent },
  { path: 'vote', component: VoteComponent },
  { path: 'result', component: ResultComponent },
  { path: 'profile', component: ProfileComponent },
];
