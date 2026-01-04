import { Routes } from '@angular/router';
import { AuthComponent } from './components/auth/auth.component';
import { CalendarPageComponent } from './components/calendar-page/calendar-page.component';
import { OwnerOnboardingComponent } from './components/owner-onboarding/owner-onboarding.component';
import { authRedirectGuard } from './guards/auth-redirect.guard';
import { authGuard } from './guards/auth.guard';
import { adminGuard } from './guards/admin.guard';
import { adminRedirectGuard } from './guards/admin-redirect.guard';
import { wildcardRedirectGuard } from './guards/wildcard-redirect.guard';

export const routes: Routes = [
  {
    path: 'auth',
    component: AuthComponent,
    canActivate: [authRedirectGuard]
  },

  {
    path: 'admin',
    canActivate: [adminGuard],
    loadChildren: () => import('./features/admin/admin.routes').then(m => m.ADMIN_ROUTES)
  },

  {
    path: 'courts',
    loadComponent: () => import('./components/browse-courts-page/browse-courts-page.component')
      .then(m => m.BrowseCourtsPageComponent),
    canActivate: [adminRedirectGuard]
  },
  {
    path: 'court/:id',
    loadComponent: () => import('./components/court-detail/court-detail.component')
      .then(m => m.CourtDetailComponent),
    canActivate: [adminRedirectGuard]
  },

  {
    path: '',
    redirectTo: '/courts',
    pathMatch: 'full'
  },

  {
    path: 'clubs',
    loadComponent: () => import('./components/clubs-page/clubs-page').then(m => m.ClubsPage),
    canActivate: [adminRedirectGuard]
  },
  {
    path: 'clubs/:id',
    loadComponent: () => import('./components/club-detail-page/club-detail-page').then(m => m.ClubDetailPageComponent),
    canActivate: [adminRedirectGuard]
  },

  {
    path: 'events',
    loadComponent: () => import('./components/events-page/events-page.component')
      .then(m => m.EventsPageComponent),
    canActivate: [adminRedirectGuard]
  },
  {
    path: 'events/:id',
    loadComponent: () => import('./components/event-detail/event-detail.component')
      .then(m => m.EventDetailComponent),
    canActivate: [adminRedirectGuard]
  },
  {
    path: 'events/:id/join',
    loadComponent: () => import('./components/event-join-confirmation/event-join-confirmation.component')
      .then(m => m.EventJoinConfirmationComponent),
    canActivate: [authGuard, adminRedirectGuard]
  },

  {
    path: 'calendar',
    component: CalendarPageComponent,
    canActivate: [authGuard]
  },

  {
    path: 'booking/:timeSlotId',
    loadComponent: () => import('./components/booking-page/booking-page.component')
      .then(m => m.BookingPageComponent),
    canActivate: [authGuard, adminRedirectGuard]
  },
  {
    path: 'checkout/success',
    loadComponent: () => import('./components/checkout-success/checkout-success.component')
      .then(m => m.CheckoutSuccessComponent),
    canActivate: [authGuard]
  },
  {
    path: 'checkout/cancel',
    loadComponent: () => import('./components/checkout-cancel/checkout-cancel.component')
      .then(m => m.CheckoutCancelComponent),
    canActivate: [authGuard]
  },

  {
    path: 'profile',
    loadComponent: () => import('./components/user-profile/user-profile.component')
      .then(m => m.UserProfileComponent),
    canActivate: [authGuard]
  },

  {
    path: 'owner/onboarding/callback',
    component: OwnerOnboardingComponent,
    canActivate: [adminGuard]
  },
  {
    path: 'owner/onboarding/refresh',
    component: OwnerOnboardingComponent,
    canActivate: [adminGuard]
  },

  // Wildcard route - redirects based on user role
  {
    path: '**',
    loadComponent: () => import('./components/wildcard-redirect/wildcard-redirect.component')
      .then(m => m.WildcardRedirectComponent)
  }
];
