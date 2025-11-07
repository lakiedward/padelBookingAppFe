import { Component, ViewChild, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ClubDetailsComponent } from '../club-details/club-details.component';
import { CourtViewComponent } from '../court-view/court-view.component';
import { CreateCourtComponent } from '../create-court/create-court.component';
import { EventViewComponent } from '../event-view/event-view.component';
import { CreateEventComponent } from '../create-event/create-event.component';
import { ManageBookingComponent } from '../manage-booking/manage-booking.component';
import { Router } from '@angular/router';
import { ClubService } from '../../services/club.service';
import { AuthService } from '../../services/auth.service';
import { SportKey } from '../../models/club.models';

type AdminMenuKey = 'club-management' | 'courts' | 'events' | 'manage-booking';

@Component({
  selector: 'app-admin-view',
  standalone: true,
  imports: [CommonModule, ClubDetailsComponent, CourtViewComponent, CreateCourtComponent, EventViewComponent, CreateEventComponent, ManageBookingComponent],
  templateUrl: './admin-view.component.html',
  styleUrl: './admin-view.component.scss'
})
export class AdminViewComponent implements AfterViewInit {
  selectedMenu: AdminMenuKey = 'club-management';
  courtsMode: 'view' | 'create' = 'view';
  showCreateCourtModal = false;
  editingCourtId?: number;
  showCreateEventModal = false;
  editingEventId?: number;
  mobileMenuOpen = false;
  preselectCourtId: number | null = null;

  @ViewChild(CourtViewComponent) courtViewComponent?: CourtViewComponent;
  @ViewChild(EventViewComponent) eventViewComponent?: EventViewComponent;

  constructor(
    private auth: AuthService, 
    private router: Router, 
    public clubService: ClubService,
    private cdr: ChangeDetectorRef
  ) {
    // Load club data on initialization to populate sports dropdown
    this.clubService.getMyClub().subscribe({
      next: (club) => {
        console.log('[AdminView] Club data loaded:', club);
      },
      error: (err) => {
        console.error('[AdminView] Failed to load club data:', err);
      }
    });
  }

  ngAfterViewInit() {
    // ViewChild is now available
    this.cdr.detectChanges();
  }

  select(menu: AdminMenuKey) {
    console.log('[AdminView] select() called with menu:', menu);
    this.selectedMenu = menu;
    this.mobileMenuOpen = false; // Close mobile menu after selection
    
    // No need to manually trigger loadCourts; CourtView loads itself on insertion
  }

  toggleMobileMenu() {
    this.mobileMenuOpen = !this.mobileMenuOpen;
    console.log('[AdminView] toggleMobileMenu - mobileMenuOpen:', this.mobileMenuOpen);
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

  // Event management methods
  onAddEventFromView() {
    this.editingEventId = undefined;
    this.showCreateEventModal = true;
  }

  onEditEventFromView(eventId: number) {
    this.editingEventId = eventId;
    this.showCreateEventModal = true;
  }

  onCreateEventCancel() {
    this.showCreateEventModal = false;
    this.editingEventId = undefined;
  }

  onCreateEventSaved(_: any) {
    this.showCreateEventModal = false;
    this.editingEventId = undefined;

    // Refresh events list
    if (this.eventViewComponent) {
      this.eventViewComponent.loadEvents();
    }
  }

  onManageBookingFromClub(courtId: number) {
    console.log('[AdminView] manage booking requested for court:', courtId);
    this.preselectCourtId = courtId;
    this.select('manage-booking');
    // Optionally scroll to the section
    try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch {}
  }

  getAvailableSports(): SportKey[] {
    const clubSports = this.clubService.lastSaved()?.sports || [];
    // Always include padel and tennis, plus any other club sports
    const sports = new Set<SportKey>(['padel', 'tennis', ...clubSports]);
    return Array.from(sports);
  }
}
