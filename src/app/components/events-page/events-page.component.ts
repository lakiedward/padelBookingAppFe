import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PublicService } from '../../services/public.service';
import { UserService } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { EventCardComponent } from '../event-card/event-card.component';
import {
  EventPanelData,
  EventStatus,
  EventSummaryResponse,
  eventSummaryToPanelData,
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
  imports: [CommonModule, FormsModule, SelectModule, DatePickerModule, EventCardComponent],
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
  protected readonly filtersExpanded = signal(false);
  protected readonly searchQuery = signal('');
  protected readonly joinedEventIds = signal<Set<number>>(new Set());
  protected readonly isAuthenticated = signal(false);

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
    const query = this.searchQuery().trim().toLowerCase();

    let filtered = this.events().filter((event) => {
      const sportMatches = sportFilter === 'all' || event.sportKey === sportFilter;
      const statusMatches = statusFilter === 'all' || event.status === statusFilter;
      const searchMatches =
        !query ||
        event.name.toLowerCase().includes(query) ||
        event.clubName.toLowerCase().includes(query);
      return sportMatches && statusMatches && searchMatches;
    });

    // Apply location filter (would need location data in EventPanelData)
    // if (this.selectedLocation !== 'all') {
    //   filtered = filtered.filter(event => event.location === this.selectedLocation);
    // }

    // Apply club filter
    if (this.selectedClub !== 'all') {
      filtered = filtered.filter(event => event.clubName === this.selectedClub);
    }

    // Apply sorting
    if (this.sortBy === 'date-asc') {
      filtered = [...filtered].sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
    } else if (this.sortBy === 'date-desc') {
      filtered = [...filtered].sort((a, b) => b.startDate.getTime() - a.startDate.getTime());
    } else if (this.sortBy === 'price-asc') {
      filtered = [...filtered].sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (this.sortBy === 'price-desc') {
      filtered = [...filtered].sort((a, b) => (b.price || 0) - (a.price || 0));
    }

    return filtered;
  });

  protected readonly hasResults = computed(() => this.filteredEvents().length > 0);

  selectedLocation: string = 'all';
  locationOptions: { label: string; value: string }[] = [
    { label: 'All locations', value: 'all' }
  ];

  selectedClub: string = 'all';
  clubOptions: { label: string; value: string }[] = [
    { label: 'All clubs', value: 'all' }
  ];

  private clubToLocationMap = new Map<string, string>();
  private allClubOptions: { label: string; value: string }[] = [];

  sortBy: string = 'date-asc';
  sortOptions: { label: string; value: string }[] = [
    { label: 'Date: Earliest first', value: 'date-asc' },
    { label: 'Date: Latest first', value: 'date-desc' },
    { label: 'Price: Low to High', value: 'price-asc' },
    { label: 'Price: High to Low', value: 'price-desc' }
  ];

  selectedDate: Date | null = null;
  timeFrom: Date | null = null;
  timeTo: Date | null = null;

  constructor(
    private readonly publicService: PublicService,
    private readonly userService: UserService,
    private readonly authService: AuthService,
    private readonly cdr: ChangeDetectorRef,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.isAuthenticated.set(this.authService.isLoggedIn());
    this.fetchEvents();
    if (this.isAuthenticated()) {
      this.fetchUserJoinedEvents();
    }
  }

  protected selectSport(filter: SportKey | 'all'): void {
    this.selectedSport.set(filter);
  }

  protected selectStatus(filter: 'all' | EventStatus): void {
    this.selectedStatus.set(filter);
  }

  protected sportLabel(sport: SportKey | 'all'): string {
    if (sport === 'all') {
      return 'All Sports';
    }
    const normalized = sport.charAt(0).toUpperCase() + sport.slice(1);
    return normalized;
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

  protected toggleMoreSports(event: Event): void {
    event.stopPropagation();
    this.moreSportsOpen.update((v) => !v);
  }

  toggleFilters(): void {
    this.filtersExpanded.set(!this.filtersExpanded());
  }

  onSearchChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
  }

  getActiveFilterCount(): number {
    let count = 0;
    if (this.searchQuery().trim() !== '') count++;
    if (this.selectedSport() !== 'all') count++;
    if (this.selectedStatus() !== 'all') count++;
    if (this.selectedLocation !== 'all') count++;
    if (this.selectedClub !== 'all') count++;
    if (this.sortBy !== 'date-asc') count++;
    if (this.selectedDate !== null) count++;
    if (this.timeFrom !== null) count++;
    if (this.timeTo !== null) count++;
    return count;
  }

  onLocationChange(): void {
    if (this.selectedLocation === 'all') {
      this.clubOptions = [...this.allClubOptions];
    } else {
      this.clubOptions = [
        { label: 'All clubs', value: 'all' },
        ...this.allClubOptions
          .filter(opt => opt.value !== 'all')
          .filter(opt => this.clubToLocationMap.get(opt.value) === this.selectedLocation)
      ];
    }

    if (this.selectedClub !== 'all') {
      const clubLocation = this.clubToLocationMap.get(this.selectedClub);
      if (clubLocation !== this.selectedLocation && this.selectedLocation !== 'all') {
        this.selectedClub = 'all';
      }
    }

    this.cdr.detectChanges();
  }

  isToday(): boolean {
    if (!this.selectedDate) return false;
    const today = new Date();
    return (
      this.selectedDate.getFullYear() === today.getFullYear() &&
      this.selectedDate.getMonth() === today.getMonth() &&
      this.selectedDate.getDate() === today.getDate()
    );
  }

  setToday(): void {
    const now = new Date();
    this.selectedDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    this.cdr.detectChanges();
  }

  clearTime(): void {
    this.timeFrom = null;
    this.timeTo = null;
    this.cdr.detectChanges();
  }

  clearAllFilters(): void {
    this.selectedSport.set('all');
    this.selectedStatus.set('all');
    this.selectedLocation = 'all';
    this.selectedClub = 'all';
    this.clubOptions = [...this.allClubOptions];
    this.sortBy = 'date-asc';
    this.moreSportsOpen.set(false);
    this.searchQuery.set('');
    this.cdr.detectChanges();
  }

  hasActiveFilters(): boolean {
    return (
      this.searchQuery().trim() !== '' ||
      this.selectedSport() !== 'all' ||
      this.selectedStatus() !== 'all' ||
      this.selectedLocation !== 'all' ||
      this.selectedClub !== 'all' ||
      this.sortBy !== 'date-asc' ||
      this.selectedDate !== null ||
      this.timeFrom !== null ||
      this.timeTo !== null
    );
  }

  protected navigateToEvent(eventId: number): void {
    this.router.navigate(['/events', eventId]);
  }

  private fetchEvents(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.publicService.getPublicEvents().subscribe({
      next: (response: EventSummaryResponse[]) => {
        const panels = response.map(eventSummaryToPanelData);
        this.events.set(panels);
        this.loading.set(false);
      },
      error: (err) => {
        this.loadError.set('Failed to load events. Please try again later.');
        this.loading.set(false);
      }
    });
  }

  private fetchUserJoinedEvents(): void {
    this.userService.getMyEvents().subscribe({
      next: (userEvents) => {
        const eventIds = new Set(userEvents.map(e => e.eventId));
        this.joinedEventIds.set(eventIds);
      },
      error: (err) => {
        console.error('Failed to load user joined events', err);
      }
    });
  }

  protected isEventJoined(eventId: number): boolean {
    return this.joinedEventIds().has(eventId);
  }
}
