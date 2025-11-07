import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { AppHeaderComponent } from '../shared/app-header/app-header.component';
import { PublicService } from '../../services/public.service';
import {
  EventPanelData,
  EventStatus,
  EventSummaryResponse,
  eventSummaryToPanelData,
  getEventTypeDisplayName,
  getFormatDisplayName,
  getStatusDisplayName
} from '../../models/event.models';
import { SportKey } from '../../models/club.models';

interface StatusFilterOption {
  label: string;
  value: 'all' | EventStatus;
}

@Component({
  selector: 'app-events-page',
  standalone: true,
  imports: [CommonModule, AppHeaderComponent],
  templateUrl: './events-page.component.html',
  styleUrls: ['./events-page.component.scss']
})
export class EventsPageComponent implements OnInit {
  private readonly allTag: SportKey | 'all' = 'all';

  protected readonly loading = signal(false);
  protected readonly loadError = signal<string | null>(null);
  protected readonly events = signal<EventPanelData[]>([]);
  protected readonly selectedSport = signal<SportKey | 'all'>(this.allTag);
  protected readonly selectedStatus = signal<'all' | EventStatus>('all');

  protected readonly statusFilters: StatusFilterOption[] = [
    { label: 'All Statuses', value: 'all' },
    { label: getStatusDisplayName(EventStatus.PUBLISHED), value: EventStatus.PUBLISHED },
    { label: getStatusDisplayName(EventStatus.ONGOING), value: EventStatus.ONGOING },
    { label: getStatusDisplayName(EventStatus.COMPLETED), value: EventStatus.COMPLETED }
  ];

  protected readonly sportFilters = computed(() => {
    const uniqueSports = new Set<SportKey>();
    for (const event of this.events()) {
      uniqueSports.add(event.sportKey);
    }
    return Array.from(uniqueSports.values());
  });

  // Sports pills: show first N like Courts and toggle the rest
  private readonly maxSportPills = 5;
  protected readonly moreSportsOpen = signal(false);
  private readonly fallbackSports: string[] = [
    'tennis','football','basketball','padel',
    'volleyball','badminton','tabletennis','squash','pickleball'
  ];
  protected readonly availableSports = computed<readonly SportKey[]>(() => {
    const fromEvents = this.sportFilters();
    return (fromEvents.length > 0 ? fromEvents : (this.fallbackSports as SportKey[]));
  });
  protected readonly displayedSports = computed(() => {
    const all = this.availableSports();
    return this.moreSportsOpen() ? all : all.slice(0, this.maxSportPills);
  });
  protected readonly extraSportsCount = computed(() => {
    const extra = this.availableSports().length - this.maxSportPills;
    return extra > 0 ? extra : 0;
  });

  protected readonly filteredEvents = computed(() => {
    const sportFilter = this.selectedSport();
    const statusFilter = this.selectedStatus();

    return this.events().filter((event) => {
      const sportMatches = sportFilter === 'all' || event.sportKey === sportFilter;
      const statusMatches = statusFilter === 'all' || event.status === statusFilter;
      return sportMatches && statusMatches;
    });
  });

  protected readonly hasResults = computed(() => this.filteredEvents().length > 0);

  constructor(private readonly publicService: PublicService) {}

  ngOnInit(): void {
    this.fetchEvents();
  }

  protected selectSport(filter: SportKey | 'all'): void {
    this.selectedSport.set(filter);
  }

  protected selectStatus(filter: 'all' | EventStatus): void {
    this.selectedStatus.set(filter);
  }

  protected formatDateRange(event: EventPanelData): string {
    const start = event.startDate.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short'
    });
    const end = event.endDate.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short'
    });
    return `${start} – ${end}`;
  }

  protected formatEventType(event: EventPanelData): string {
    return getEventTypeDisplayName(event.eventType);
  }

  protected formatEventFormat(event: EventPanelData): string {
    return getFormatDisplayName(event.format);
  }

  protected formatStatus(event: EventPanelData): string {
    return getStatusDisplayName(event.status);
  }

  protected sportLabel(sport: SportKey | 'all'): string {
    if (sport === 'all') {
      return 'All Sports';
    }
    const normalized = sport.charAt(0).toUpperCase() + sport.slice(1);
    const emoji = this.sportIcon(sport);
    return `${emoji} ${normalized}`;
  }

  protected sportIcon(sportKey: SportKey): string {
    const normalized = sportKey.toLowerCase();
    if (normalized.includes('padel')) return '🏸';
    if (normalized.includes('tennis')) return '🎾';
    if (normalized.includes('football') || normalized.includes('soccer')) return '⚽';
    if (normalized.includes('basket')) return '🏀';
    return '🏆';
  }

  protected cardStatusClass(event: EventPanelData): string {
    switch (event.status) {
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

  protected coverImageUrl(event: EventPanelData): string | null {
    return this.publicService.toAbsoluteUrl(event.coverImageUrl);
  }

  protected trackEvent(index: number, event: EventPanelData): number {
    return event.id;
  }

  protected activeStatusLabel(): string {
    const selected = this.selectedStatus();
    if (selected === 'all') {
      return 'All Statuses';
    }
    const match = this.statusFilters.find((option) => option.value === selected);
    return match?.label ?? getStatusDisplayName(selected);
  }

  protected trackSport(index: number, sport: SportKey): string {
    return sport;
  }

  protected toggleMoreSports(event?: Event) {
    if (event) event.preventDefault();
    this.moreSportsOpen.set(!this.moreSportsOpen());
  }

  private fetchEvents(): void {
    this.loading.set(true);
    this.loadError.set(null);

    this.publicService.getPublicEvents().subscribe({
      next: (response: EventSummaryResponse[]) => {
        const mapped = response.map((summary) => eventSummaryToPanelData(summary));
        this.events.set(mapped);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('[EventsPage] Failed to load events:', err);
        this.loadError.set('We could not load events right now. Please try again later.');
        this.loading.set(false);
      }
    });
  }
}
