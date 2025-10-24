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
  }
];
