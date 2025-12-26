import { Component, EventEmitter, OnInit, Output, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EventService } from '../../services/event.service';
import { ConvertMoneyPipe } from '../../pipes/convert-money.pipe';
import { EventSummaryResponse, EventPanelData, eventSummaryToPanelData, getFormatDisplayName, getStatusDisplayName, EventStatus } from '../../models/event.models';
import { SportKey } from '../../models/club.models';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';

@Component({
  selector: 'app-event-view',
  standalone: true,
  imports: [CommonModule, ConfirmDialogModule, ConvertMoneyPipe],
  templateUrl: './event-view.component.html',
  styleUrl: './event-view.component.scss',
  providers: [ConfirmationService]
})
export class EventViewComponent implements OnInit {
  @Output() addEvent = new EventEmitter<void>();
  @Output() editEvent = new EventEmitter<number>();

  events: EventPanelData[] = [];
  allEvents: EventPanelData[] = [];
  isLoading = false;
  loadError: string | null = null;
  selectedSport: SportKey | 'all' = 'all';
  availableSports: (SportKey | 'all')[] = ['all'];

  constructor(
    private eventService: EventService,
    private cdr: ChangeDetectorRef,
    private confirmationService: ConfirmationService
  ) {}

  ngOnInit(): void {
    setTimeout(() => {
      this.loadEvents();
    }, 100);
  }

  loadEvents() {
    this.isLoading = true;
    this.loadError = null;
    this.cdr.detectChanges();

    this.eventService.getEvents().subscribe({
      next: (events) => {
        this.allEvents = events.map(e => eventSummaryToPanelData(e));
        this.extractAvailableSports();
        this.filterEvents();
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loadError = 'Failed to load events';
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  onAddEventClick() {
    this.addEvent.emit();
  }

  onSportButtonClick(sport: SportKey | 'all') {
    this.selectedSport = sport;
    this.filterEvents();
  }

  private extractAvailableSports() {
    const sportsSet = new Set<SportKey>();
    this.allEvents.forEach(event => {
      if (event.sportKey) {
        sportsSet.add(event.sportKey);
      }
    });
    this.availableSports = ['all', ...Array.from(sportsSet).sort()];
  }

  private filterEvents() {
    if (this.selectedSport === 'all') {
      this.events = this.allEvents;
    } else {
      this.events = this.allEvents.filter(event => event.sportKey === this.selectedSport);
    }
  }

  onEditEvent(eventId: number) {
    this.editEvent.emit(eventId);
  }

  onDeleteEvent(eventId: number, eventName: string) {
    this.confirmationService.confirm({
      header: 'Delete Event',
      message: `Are you sure you want to delete "${eventName}"? This action cannot be undone.`,
      icon: 'pi pi-exclamation-triangle',
      rejectLabel: 'Cancel',
      acceptLabel: 'Delete',
      accept: () => {
        this.eventService.deleteEvent(eventId).subscribe({
          next: () => {
            this.loadEvents();
          },
          error: (err) => {
            alert('Failed to delete event: ' + (err.error?.error || err.message));
          }
        });
      }
    });
  }

  getFormatDisplay(event: EventPanelData): string {
    return getFormatDisplayName(event.format);
  }

  getStatusDisplay(event: EventPanelData): string {
    return getStatusDisplayName(event.status);
  }

  getStatusClass(status: EventStatus): string {
    switch (status) {
      case EventStatus.PUBLISHED:
      case EventStatus.ONGOING:
        return 'primary';
      case EventStatus.DRAFT:
        return 'draft';
      case EventStatus.COMPLETED:
        return 'completed';
      case EventStatus.CANCELLED:
        return 'cancelled';
      default:
        return '';
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

  formatDate(date: Date): string {
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  formatDateRange(startDate: Date, endDate: Date): string {
    const start = this.formatDate(startDate);
    const end = this.formatDate(endDate);
    return `${start} – ${end}`;
  }

  getAbsoluteImageUrl(url: string | null): string | null {
    if (!url) return null;
    return this.eventService.toAbsoluteUrl(url);
  }

  trackByIndex(index: number) {
    return index;
  }
}
