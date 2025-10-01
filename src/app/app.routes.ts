import { Routes } from '@angular/router';
import { AuthComponent } from './components/auth/auth.component';
import { AdminViewComponent } from './components/admin-view/admin-view.component';
import { BrowseCourtsPageComponent } from './components/browse-courts-page/browse-courts-page.component';
import { CalendarPageComponent } from './components/calendar-page/calendar-page.component';
import { authRedirectGuard } from './guards/auth-redirect.guard';

export const routes: Routes = [
  { path: 'auth', component: AuthComponent, canActivate: [authRedirectGuard] },
  { path: 'admin', component: AdminViewComponent },
  { path: 'user', component: BrowseCourtsPageComponent },
  { path: 'calendar', component: CalendarPageComponent },
  { path: '', redirectTo: '/auth', pathMatch: 'full' }
];
