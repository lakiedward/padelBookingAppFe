import { Routes } from '@angular/router';
import { AuthComponent } from './components/auth/auth.component';
import { CalendarPageComponent } from './components/calendar-page/calendar-page.component';
import { authRedirectGuard } from './guards/auth-redirect.guard';
import { authGuard } from './guards/auth.guard';
import { adminGuard } from './guards/admin.guard';

/**
 * Application routes with lazy loading for feature modules
 *
 * Performance optimization:
 * - Auth & Calendar: Eager loaded (small, frequently needed)
 * - Admin & User features: Lazy loaded (reduces initial bundle size)
 */
export const routes: Routes = [
  // Auth routes (eager - needed immediately)
  {
    path: 'auth',
    component: AuthComponent,
    canActivate: [authRedirectGuard]
  },

  // Admin routes (lazy loaded)
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadChildren: () => import('./features/admin/admin.routes').then(m => m.ADMIN_ROUTES)
  },

  // User routes (lazy loaded)
  {
    path: 'user',
    canActivate: [authGuard],
    loadChildren: () => import('./features/user/user.routes').then(m => m.USER_ROUTES)
  },

  // Calendar (eager - lightweight component)
  {
    path: 'calendar',
    component: CalendarPageComponent,
    canActivate: [authGuard]
  },

  // Default redirect
  {
    path: '',
    redirectTo: '/auth',
    pathMatch: 'full'
  }
];
