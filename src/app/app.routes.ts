import { Routes } from '@angular/router';
import { AuthComponent } from './components/auth/auth.component';
import { AdminViewComponent } from './components/admin-view/admin-view.component';
import { BrowseCourtsPageComponent } from './components/browse-courts-page/browse-courts-page.component';

export const routes: Routes = [
  { path: 'auth', component: AuthComponent },
  { path: 'admin', component: AdminViewComponent },
  { path: 'user', component: BrowseCourtsPageComponent },
  { path: '', redirectTo: '/auth', pathMatch: 'full' }
];
