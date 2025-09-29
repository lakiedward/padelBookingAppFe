import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ClubDetailsComponent } from '../club-details/club-details.component';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

type AdminMenuKey = 'club-management' | 'courts' | 'events';

@Component({
  selector: 'app-admin-view',
  standalone: true,
  imports: [CommonModule, ClubDetailsComponent],
  templateUrl: './admin-view.component.html',
  styleUrl: './admin-view.component.scss'
})
export class AdminViewComponent {
  selectedMenu: AdminMenuKey = 'club-management';

  constructor(private auth: AuthService, private router: Router) {}

  select(menu: AdminMenuKey) {
    this.selectedMenu = menu;
  }

  onCourtsRequestedFromChild() {
    this.select('courts');
  }

  onLogout() {
    this.auth.logout();
    this.router.navigate(['/auth']);
  }
}
