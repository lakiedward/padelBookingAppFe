import { Routes } from '@angular/router';

export const USER_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('../../components/browse-courts-page/browse-courts-page.component')
      .then(m => m.BrowseCourtsPageComponent),
    pathMatch: 'full'
  },
  {
    path: 'court/:id',
    loadComponent: () => import('../../components/court-detail/court-detail.component')
      .then(m => m.CourtDetailComponent)
  },
  {
    path: 'clubs',
    loadComponent: () => import('../../components/clubs-page/clubs-page').then(m => m.ClubsPage)
  },
  {
    path: 'clubs/:id',
    loadComponent: () => import('../../components/club-detail-page/club-detail-page').then(m => m.ClubDetailPageComponent)
  },
  {
    path: 'events',
    loadComponent: () => import('../../components/events-page/events-page.component')
      .then(m => m.EventsPageComponent)
  },
  {
    path: 'booking/:timeSlotId',
    loadComponent: () => import('../../components/booking-page/booking-page.component')
      .then(m => m.BookingPageComponent)
  },
  {
    path: 'checkout/success',
    loadComponent: () => import('../../components/checkout-success/checkout-success.component')
      .then(m => m.CheckoutSuccessComponent)
  },
  {
    path: 'checkout/cancel',
    loadComponent: () => import('../../components/checkout-cancel/checkout-cancel.component')
      .then(m => m.CheckoutCancelComponent)
  },
  {
    path: 'profile',
    loadComponent: () => import('../../components/user-profile/user-profile.component')
      .then(m => m.UserProfileComponent)
  }
];
