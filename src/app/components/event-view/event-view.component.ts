import { Component, EventEmitter, OnInit, Output, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EventService } from '../../services/event.service';
import { EventSummaryResponse, EventPanelData, eventSummaryToPanelData, getFormatDisplayName, getStatusDisplayName, EventStatus } from '../../models/event.models';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';

@Component({
  selector: 'app-event-view',
  standalone: true,
  imports: [CommonModule, ConfirmDialogModule],
  templateUrl: './event-view.component.html',
  styleUrl: './event-view.component.scss',
  providers: [ConfirmationService]
})
export class EventViewComponent implements OnInit {
  @Output() addEvent = new EventEmitter<void>();
  @Output() editEvent = new EventEmitter<number>();

  events: EventPanelData[] = [];
  isLoading = false;
  loadError: string | null = null;

  constructor(
    private eventService: EventService,
    private cdr: ChangeDetectorRef,
    private confirmationService: ConfirmationService
  ) {}

  ngOnInit(): void {
    setTimeout(() => {
      console.log('[EventView] ngOnInit - Loading events after delay');
      this.loadEvents();
    }, 100);
  }

  loadEvents() {
    console.log('[EventView] loadEvents() called');
    this.isLoading = true;
    this.loadError = null;
    this.cdr.detectChanges();

    this.eventService.getEvents().subscribe({
      next: (events) => {
        console.log('[EventView] Events loaded:', events);
        this.events = events.map(e => eventSummaryToPanelData(e));
        this.isLoading = false;
        console.log('[EventView] Events array length:', this.events.length);
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('[EventView] Failed to load events:', err);
        this.loadError = 'Failed to load events';
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  onAddEventClick() {
    this.addEvent.emit();
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
            console.log('Event deleted successfully');
            this.loadEvents();
          },
          error: (err) => {
            console.error('Failed to delete event:', err);
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

  getSportIcon(sportKey: string): string {
    const sport = sportKey.toLowerCase();
    if (sport === 'tennis') return '🎾';
    if (sport === 'padel') return '🏸';
    return '🏆';
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
