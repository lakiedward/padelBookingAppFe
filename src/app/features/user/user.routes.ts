import { Routes } from '@angular/router';

/**
 * User feature routes - lazy loaded module
 * Protected by authGuard (checked at parent level)
 */
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
    path: 'events',
    loadComponent: () => import('../../components/events-page/events-page.component')
      .then(m => m.EventsPageComponent)
  },
  {
    path: 'booking/:timeSlotId',
    loadComponent: () => import('../../components/booking-page/booking-page.component')
      .then(m => m.BookingPageComponent)
  }
];
