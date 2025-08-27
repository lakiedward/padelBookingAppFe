import { Routes } from '@angular/router';
import { AuthComponent } from './components/auth/auth.component';
import { AdminViewComponent } from './components/admin-view/admin-view.component';

export const routes: Routes = [
  { path: 'auth', component: AuthComponent },
  { path: 'admin', component: AdminViewComponent },
  { path: '', redirectTo: '/auth', pathMatch: 'full' }
];
