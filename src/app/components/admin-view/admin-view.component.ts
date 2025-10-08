import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ClubDetailsComponent } from '../club-details/club-details.component';
import { CourtViewComponent } from '../court-view/court-view.component';
import { CreateCourtComponent } from '../create-court/create-court.component';
import { Router } from '@angular/router';
import { ClubService } from '../../services/club.service';
import { AuthService } from '../../services/auth.service';

type AdminMenuKey = 'club-management' | 'courts' | 'events';

@Component({
  selector: 'app-admin-view',
  standalone: true,
  imports: [CommonModule, ClubDetailsComponent, CourtViewComponent, CreateCourtComponent],
  templateUrl: './admin-view.component.html',
  styleUrl: './admin-view.component.scss'
})
export class AdminViewComponent {
  selectedMenu: AdminMenuKey = 'club-management';
  courtsMode: 'view' | 'create' = 'view';
  showCreateCourtModal = false;

  constructor(private auth: AuthService, private router: Router, public clubService: ClubService) {}

  select(menu: AdminMenuKey) {
    this.selectedMenu = menu;
  }

  onCourtsRequestedFromChild() {
    this.select('courts');
    this.courtsMode = 'view';
  }

  onLogout() {
    this.auth.logout();
    this.router.navigate(['/auth']);
  }

  onAddCourtFromView() {
    this.showCreateCourtModal = true;
  }

  onCreateCourtCancel() {
    this.showCreateCourtModal = false;
  }

  onCreateCourtSaved(_: any) {
    // In a future step, refresh courts list; for now just return to view.
    this.showCreateCourtModal = false;
  }
}
