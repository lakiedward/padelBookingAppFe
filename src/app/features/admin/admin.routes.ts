import { Routes } from '@angular/router';

/**
 * Admin feature routes - lazy loaded module
 * Protected by adminGuard (checked at parent level)
 */
export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('../../components/admin-view/admin-view.component')
      .then(m => m.AdminViewComponent)
  },
  {
    path: 'bookings/:id',
    loadComponent: () => import('../../components/admin-booking-details/admin-booking-details.component')
      .then(m => m.AdminBookingDetailsComponent)
  }
];
