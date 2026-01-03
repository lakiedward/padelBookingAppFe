import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PublicService } from '../../services/public.service';
import { EventPanelData, eventSummaryToPanelData, getEventTypeDisplayName, getFormatDisplayName, getStatusDisplayName, EventStatus } from '../../models/event.models';
import { ClubDetails } from '../../models/club.models';
import { ConvertMoneyPipe } from '../../pipes/convert-money.pipe';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-event-detail',
  standalone: true,
  imports: [CommonModule, ConvertMoneyPipe],
  templateUrl: './event-detail.component.html',
  styleUrl: './event-detail.component.scss'
})
export class EventDetailComponent implements OnInit {
  isLoading = true;
  eventId!: number;
  event?: EventPanelData;
  club?: ClubDetails;
  heroImage = '';
  isAuthenticated = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private publicService: PublicService,
    private cdr: ChangeDetectorRef,
    private auth: AuthService
  ) {
    this.isAuthenticated = this.auth.isLoggedIn();
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = Number(params.get('id'));
      if (!id) {
        this.router.navigate(['/events']);
        return;
      }
      this.eventId = id;
      this.loadEvent();
    });
  }

  private loadEvent() {
    this.isLoading = true;
    this.publicService.getPublicEventById(this.eventId).subscribe({
      next: (eventSummary) => {
        this.event = eventSummaryToPanelData(eventSummary);
        this.heroImage = this.getCoverImageUrl(this.event);
        
        if (eventSummary.clubId) {
          this.loadClubDetails(eventSummary.clubId);
        }
        
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoading = false;
        this.router.navigate(['/events']);
      }
    });
  }

  private loadClubDetails(clubId: number) {
    this.publicService.getPublicClubById(clubId).subscribe({
      next: (club) => {
        this.club = club;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load club details:', err);
      }
    });
  }

  onBack() {
    this.router.navigate(['/events']);
  }

  onJoinEvent() {
    if (!this.event) return;

    if (!this.isAuthenticated) {
      const returnUrl = `/events/${this.eventId}`;
      this.router.navigate(['/auth'], {
        queryParams: { returnUrl }
      });
      return;
    }

    alert('Join event functionality coming soon!');
  }

  navigateToClub() {
    if (this.event && this.club) {
      this.router.navigate(['/clubs', this.club.id]);
    }
  }

  formatDateRange(event: EventPanelData): string {
    const start = event.startDate.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
    const end = event.endDate.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
    return `${start} – ${end}`;
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  formatEventType(event: EventPanelData): string {
    return getEventTypeDisplayName(event.eventType);
  }

  formatEventFormat(event: EventPanelData): string {
    return getFormatDisplayName(event.format);
  }

  formatStatus(event: EventPanelData): string {
    return getStatusDisplayName(event.status);
  }

  getStatusClass(status: EventStatus): string {
    switch (status) {
      case EventStatus.PUBLISHED:
      case EventStatus.ONGOING:
        return 'badge--primary';
      case EventStatus.COMPLETED:
        return 'badge--muted';
      case EventStatus.CANCELLED:
        return 'badge--danger';
      default:
        return 'badge--warning';
    }
  }

  getSportIcon(sportKey: string): string | null {
    const sportName = sportKey.toLowerCase().trim();
    
    const sportMap: { [key: string]: string } = {
      'tennis': 'assets/icons/tennis.svg',
      'padel': 'assets/icons/padel.svg',
      'football': 'assets/icons/football.svg',
      'soccer': 'assets/icons/football.svg',
      'basketball': 'assets/icons/basketball.svg',
      'volleyball': 'assets/icons/volleyball.svg',
      'badminton': 'assets/icons/badminton.svg',
      'squash': 'assets/icons/squash.svg',
      'handball': 'assets/icons/handball.svg',
      'pingpong': 'assets/icons/pingpong.svg',
      'ping pong': 'assets/icons/pingpong.svg',
      'table tennis': 'assets/icons/pingpong.svg',
      'table-tennis': 'assets/icons/pingpong.svg'
    };
    
    return sportMap[sportName] || null;
  }

  getCoverImageUrl(event: EventPanelData): string {
    return this.publicService.toAbsoluteUrl(event.coverImageUrl) || '';
  }

  getClubProfileImageUrl(): string | null {
    const clubId = this.club?.id;
    return clubId ? this.publicService.getClubProfileImageUrl(clubId) : null;
  }

  canJoinEvent(): boolean {
    if (!this.event) return false;
    return this.event.status === EventStatus.PUBLISHED || this.event.status === EventStatus.ONGOING;
  }

  isEventFull(): boolean {
    if (!this.event || !this.event.maxParticipants) return false;
    return this.event.currentParticipants >= this.event.maxParticipants;
  }
}
