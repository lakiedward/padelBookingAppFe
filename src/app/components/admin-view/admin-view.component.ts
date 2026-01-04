import { CommonModule, DOCUMENT, isPlatformBrowser } from '@angular/common';
import { AfterViewInit, ChangeDetectorRef, Component, Inject, PLATFORM_ID, ViewChild, isDevMode } from '@angular/core';
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
  preselectCourtId: number | null = null;

  @ViewChild(CourtViewComponent) courtViewComponent?: CourtViewComponent;
  @ViewChild(EventViewComponent) eventViewComponent?: EventViewComponent;

  constructor(
    @Inject(DOCUMENT) private document: Document,
    @Inject(PLATFORM_ID) private platformId: Object,
    private auth: AuthService, 
    private router: Router, 
    public clubService: ClubService,
    private cdr: ChangeDetectorRef
  ) {
    this.clubService.getMyClub().subscribe({
      next: () => {},
      error: () => {}
    });
  }

  ngAfterViewInit() {
    this.cdr.detectChanges();
  }

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
    this.editingCourtId = undefined;
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

    if (this.courtViewComponent) {
      this.courtViewComponent.loadCourts();
    }
  }

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

    if (this.eventViewComponent) {
      this.eventViewComponent.loadEvents();
    }
  }

  onManageBookingFromClub(courtId: number) {
    this.preselectCourtId = courtId;
    this.select('manage-booking');
    this.scrollAdminContentToTop();
  }

  onManageBookingFromCourt(courtId: number) {
    this.preselectCourtId = courtId;
    this.select('manage-booking');
    this.scrollAdminContentToTop();
  }

  getAvailableSports(): SportKey[] {
    const clubSports = this.clubService.lastSaved()?.sports || [];
    const sports = new Set<SportKey>(['padel', 'tennis', ...clubSports]);
    return Array.from(sports);
  }

  private scrollAdminContentToTop() {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      // In AdminView, scrolling happens inside the `<main class="content">` container
      // because `html/body` are scroll-locked to prevent double scrollbars.
      const container = this.document.querySelector('.admin-container > main.content') as HTMLElement | null;
      if (container) {
        container.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
    } catch (err) {
      if (isDevMode()) console.error('scrollAdminContentToTop error', err);
    }

    // Fallback for unexpected layouts
    try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (err) {
      if (isDevMode()) console.error('scrollAdminContentToTop fallback error', err);
    }
  }
}
