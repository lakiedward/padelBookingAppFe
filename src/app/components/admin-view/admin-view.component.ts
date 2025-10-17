import { Component, ViewChild, AfterViewInit, ChangeDetectorRef } from '@angular/core';
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
export class AdminViewComponent implements AfterViewInit {
  selectedMenu: AdminMenuKey = 'club-management';
  courtsMode: 'view' | 'create' = 'view';
  showCreateCourtModal = false;
  editingCourtId?: number;

  @ViewChild(CourtViewComponent) courtViewComponent?: CourtViewComponent;

  constructor(
    private auth: AuthService, 
    private router: Router, 
    public clubService: ClubService,
    private cdr: ChangeDetectorRef
  ) {}

  ngAfterViewInit() {
    // ViewChild is now available
    this.cdr.detectChanges();
  }

  select(menu: AdminMenuKey) {
    console.log('[AdminView] select() called with menu:', menu);
    this.selectedMenu = menu;
    
    // No need to manually trigger loadCourts; CourtView loads itself on insertion
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
    this.editingCourtId = undefined; // Reset edit mode
    this.showCreateCourtModal = true;
  }

  onEditCourtFromView(courtId: number) {
    this.editingCourtId = courtId;
    this.showCreateCourtModal = true;
  }

  onCreateCourtCancel() {
    this.showCreateCourtModal = false;
    this.editingCourtId = undefined;
  }

  onCreateCourtSaved(_: any) {
    this.showCreateCourtModal = false;
    this.editingCourtId = undefined;
    
    // Refresh courts list
    if (this.courtViewComponent) {
      this.courtViewComponent.loadCourts();
    }
  }
}
