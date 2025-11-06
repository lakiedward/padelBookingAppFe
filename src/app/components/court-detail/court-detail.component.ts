import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ChangeDetectorRef, Component, Inject, OnDestroy, OnInit, PLATFORM_ID } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PublicService } from '../../services/public.service';
import { CourtService } from '../../services/court.service';
import { CourtAvailabilityRuleResponse, CourtPhotoResponse, CourtResponse } from '../../models/court.models';
import { AuthService } from '../../services/auth.service';
import { AppHeaderComponent } from '../shared/app-header/app-header.component';
import { MapService } from '../../services/map.service';
import { Subject, combineLatest } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-court-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, AppHeaderComponent],
  templateUrl: './court-detail.component.html',
  styleUrl: './court-detail.component.scss'
})
export class CourtDetailComponent implements OnInit, OnDestroy {
  isLoading = true;
  courtId!: number;
  court?: CourtResponse;
  heroImage = '';
  mobileOpen = false;

  // date/state
  selectedDate: Date = new Date();
  days: Date[] = [];
  slotsForDay: { id: number; start: string; end: string; available: boolean; price: number }[] = [];
  selectedSlot?: { id: number; start: string; end: string; price: number };

  // location/map state
  clubLocation?: { address: string; lat: number; lng: number };
  private mapInitialized = false;

  private isBrowser: boolean;
  private destroy$ = new Subject<void>();
  private initialDateParam?: string;
  private initialSlotIdParam?: number;
  private initialStartParam?: string;
  private hasAppliedInitialSelection = false;
  private pendingScrollToSlots = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private publicService: PublicService,
    private courtService: CourtService,
    private cdr: ChangeDetectorRef,
    private auth: AuthService,
    private mapService: MapService,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    this.days = Array.from({ length: 7 }, (_, i) => this.addDays(new Date(), i));
    combineLatest([this.route.paramMap, this.route.queryParamMap])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([params, query]) => {
        const id = Number(params.get('id'));
        if (!id) {
          this.router.navigate(['/user']);
          return;
        }

        this.courtId = id;

        const dateParam = query.get('date') || undefined;
        const slotParam = query.get('slot');
        const startParam = query.get('start') || query.get('time') || undefined;

        this.initialDateParam = dateParam;
        this.initialSlotIdParam = slotParam ? Number(slotParam) : undefined;
        if (this.initialSlotIdParam != null && Number.isNaN(this.initialSlotIdParam)) {
          this.initialSlotIdParam = undefined;
        }
        this.initialStartParam = startParam;
        this.hasAppliedInitialSelection = false;
        this.pendingScrollToSlots = !!(this.initialDateParam || this.initialSlotIdParam != null || this.initialStartParam);

        const parsedDate = this.initialDateParam ? this.parseDateKey(this.initialDateParam) : null;
        if (parsedDate) {
          this.selectedDate = parsedDate;
          this.ensureDateInDaysArray(parsedDate);
        } else {
          const today = new Date();
          this.selectedDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
          this.ensureDateInDaysArray(this.selectedDate);
        }

        this.load();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private load() {
    this.isLoading = true;
    this.publicService.getPublicCourtById(this.courtId).subscribe({
      next: (court) => {
        this.court = court;
        this.clubLocation = court.clubLocation;
        this.heroImage = this.pickHeroImage(court.photos);
        this.loadSlotsForSelectedDate();
        setTimeout(() => this.scrollToSelectedDay(), 200);

        // Initialize map if location exists
        if (this.clubLocation && this.isBrowser) {
          setTimeout(() => this.initializeMap(), 150);
        }

        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoading = false;
        this.router.navigate(['/user']);
      }
    });
  }

  private pickHeroImage(photos: CourtPhotoResponse[] | undefined): string {
    if (!photos || photos.length === 0) return '';
    const primary = photos.find(p => p.isPrimary) || photos[0];
    return this.courtService.toAbsoluteUrl(primary.url) || '';
  }

  onBack() {
    this.router.navigate(['/user']);
  }

  onSelectDay(d: Date) {
    this.selectedDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    console.log('[CourtDetail] onSelectDay called', { oldDate: this.selectedDate, newDate: d, dateKey: this.dateKey(this.selectedDate) });
    
    // Ensure selected date is in days array
    this.ensureDateInDaysArray(this.selectedDate);
    
    this.selectedSlot = undefined; // Clear selected slot when changing date
    this.loadSlotsForSelectedDate();
    
    // Scroll selected day into view
    setTimeout(() => this.scrollToSelectedDay(), 150);
  }

  private ensureDateInDaysArray(date: Date) {
    const dateKey = this.dateKey(date);
    const exists = this.days.some(d => this.dateKey(d) === dateKey);
    
    if (!exists) {
      console.log('[CourtDetail] Adding date to days array', { dateKey, date });
      // Add the date and regenerate a 7-day window around it
      const today = new Date();
      const selectedDay = new Date(date);
      const diffDays = Math.floor((selectedDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      // Generate days array starting from the selected date or today (whichever is earlier)
      const startDay = diffDays < 0 ? diffDays : 0;
      const endDay = Math.max(6, diffDays + 3); // Show at least 7 days, or selected date + 3 days
      
      this.days = Array.from({ length: endDay - startDay + 1 }, (_, i) => this.addDays(today, startDay + i));
      console.log('[CourtDetail] Updated days array', { startDay, endDay, count: this.days.length });
      
      // Force Angular to detect changes and re-render
      this.cdr.detectChanges();
    }
  }

  onDateInputChange(evt: Event) {
    const input = evt.target as HTMLInputElement;
    let next: Date | null = null;
    // valueAsDate is supported in modern browsers, fallback to parsing value
    if ((input as any).valueAsDate) {
      next = (input as any).valueAsDate as Date;
    } else if (input.value) {
      next = new Date(input.value);
    }
    if (next) {
      this.onSelectDay(next);
    }
  }

  setToday() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    this.onSelectDay(today);
  }

  private loadSlotsForSelectedDate() {
    this.slotsForDay = [];
    this.selectedSlot = undefined; // Clear selected slot when reloading
    const dateKey = this.dateKey(this.selectedDate);
    console.log('[CourtDetail] loadSlotsForSelectedDate START', { courtId: this.courtId, dateKey, selectedDate: this.selectedDate });
    
    this.publicService.getAllTimeSlotsByCourtAndDate(this.courtId, dateKey).subscribe({
      next: (resp) => {
        console.log('[CourtDetail] slots response SUCCESS', { courtId: this.courtId, dateKey, count: resp?.items?.length, items: resp?.items });
        const items = (resp?.items || []).slice().sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
        this.slotsForDay = items.map(s => ({
          id: s.id,
          start: (s.startTime || '').substring(11, 16),
          end: (s.endTime || '').substring(11, 16),
          available: !!s.available,
          price: s.price || 0
        }));
        console.log('[CourtDetail] slotsForDay mapped', { count: this.slotsForDay.length, slots: this.slotsForDay });
        this.cdr.detectChanges();
        this.handleInitialSlotSelection();
      },
      error: (err) => {
        console.error('[CourtDetail] slots fetch FAILED', { courtId: this.courtId, dateKey, error: err });
        this.slotsForDay = [];
        this.cdr.detectChanges();
        this.handleInitialSlotSelection();
      }
    });
  }

  onPickSlot(slot: { id: number; start: string; end: string; available?: boolean; price?: number }) {
    if (slot.available === false) return;
    this.selectedSlot = { id: slot.id, start: slot.start, end: slot.end, price: slot.price || 0 };
  }

  onBookNow() {
    if (!this.selectedSlot || !this.court) return;

    // Navigate to booking page with time slot ID and additional info as query params
    this.router.navigate(['/user/booking', this.selectedSlot.id], {
      queryParams: {
        courtId: this.courtId,
        date: this.dateKey(this.selectedDate),
        start: this.selectedSlot.start,
        end: this.selectedSlot.end,
        price: this.selectedSlot.price
      }
    });
  }

  private scrollToSelectedDay() {
    if (!this.isBrowser) {
      console.log('[CourtDetail] scrollToSelectedDay - not browser, skipping');
      return;
    }
    
    const selectedDateKey = this.dateKey(this.selectedDate);
    console.log('[CourtDetail] scrollToSelectedDay', { 
      selectedDateKey, 
      selectedDate: this.selectedDate,
      daysCount: this.days.length 
    });
    
    const selectedButton = document.querySelector(`[data-date-key="${selectedDateKey}"]`) as HTMLElement;
    console.log('[CourtDetail] scrollToSelectedDay - found button', { 
      selectedButton,
      selector: `[data-date-key="${selectedDateKey}"]`
    });
    
    if (selectedButton) {
      selectedButton.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center'
      });
      console.log('[CourtDetail] scrollToSelectedDay - scrolled to button');
    } else {
      console.warn('[CourtDetail] scrollToSelectedDay - button not found!');
      // Debug: log all available date keys
      const allButtons = document.querySelectorAll('.detail-day-btn');
      console.log('[CourtDetail] Available day buttons:', Array.from(allButtons).map(b => b.getAttribute('data-date-key')));
    }
  }

  private handleInitialSlotSelection() {
    if (!this.pendingScrollToSlots) {
      return;
    }

    if (!this.hasAppliedInitialSelection) {
      let selectedSlot = undefined as { id: number; start: string; end: string; available: boolean; price: number } | undefined;
      if (this.initialSlotIdParam != null) {
        selectedSlot = this.slotsForDay.find(s => s.id === this.initialSlotIdParam);
      }
      if (!selectedSlot && this.initialStartParam) {
        selectedSlot = this.slotsForDay.find(s => s.start === this.initialStartParam);
      }

      if (selectedSlot) {
        this.onPickSlot(selectedSlot);
      }

      this.hasAppliedInitialSelection = true;
    }

    setTimeout(() => this.scrollToTimeSlots(), 150);
    this.pendingScrollToSlots = false;
  }

  private scrollToTimeSlots() {
    if (!this.isBrowser) return;
    const section = document.getElementById('time-slots');
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  private parseDateKey(value: string): Date | null {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return null;
    }

    const [year, month, day] = value.split('-').map(part => Number(part));
    const parsed = new Date(year, month - 1, day);

    if (Number.isNaN(parsed.getTime())) {
      return null;
    }

    if (parsed.getFullYear() !== year || parsed.getMonth() !== month - 1 || parsed.getDate() !== day) {
      return null;
    }

    return parsed;
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/auth']);
  }

  toggleMobile() {
    this.mobileOpen = !this.mobileOpen;
  }

  // Map methods
  private async initializeMap() {
    if (!this.isBrowser || !this.clubLocation) return;

    try {
      await this.mapService.loadLeafletAssets();

      const mapContainer = document.getElementById('court-detail-map');
      if (!mapContainer) return;

      const L = (window as any).L;
      if (!L) return;

      // Create read-only map (no interaction)
      const map = L.map(mapContainer, {
        dragging: false,
        zoomControl: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        touchZoom: false
      }).setView([this.clubLocation.lat, this.clubLocation.lng], 15);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap'
      }).addTo(map);

      // Add marker at club location
      L.marker([this.clubLocation.lat, this.clubLocation.lng]).addTo(map);

      this.mapInitialized = true;
    } catch (error) {
      console.error('Failed to initialize map:', error);
    }
  }

  openGoogleMaps() {
    if (!this.clubLocation) return;
    const url = `https://www.google.com/maps?q=${this.clubLocation.lat},${this.clubLocation.lng}`;
    window.open(url, '_blank');
  }

  // utils
  addDays(base: Date, n: number) { const d = new Date(base); d.setDate(d.getDate() + n); return d; }
  dateKey(d: Date) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
  formatDay(d: Date) { return d.toLocaleDateString('en-US', { weekday: 'short', day: '2-digit', month: 'short' }); }
  formatWeekday(d: Date) { return d.toLocaleDateString('en-US', { weekday: 'short' }); }
  formatDayMonth(d: Date) { return d.toLocaleDateString('en-US', { day: '2-digit', month: 'short' }); }

  formatWeekdays(weekdays: number[]): string {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return weekdays.map(d => days[d]).join(', ');
  }

  surfaceFromTags(tags: string[]): string | null {
    const surfaces = ['clay','grass','hard','synthetic','carpet','acrylic','concrete','asphalt'];
    const found = (tags || []).find(t => surfaces.includes((t || '').toLowerCase()));
    return found || null;
  }

  environmentFromTags(tags: string[]): string | null {
    const tl = (tags || []).map(t => (t || '').toLowerCase());
    const parts: string[] = [];
    if (tl.includes('indoor')) parts.push('Indoor');
    if (tl.includes('outdoor')) parts.push('Outdoor');
    if (tl.includes('heated')) parts.push('Heated');
    if (tl.includes('unheated')) parts.push('Unheated');
    return parts.length ? parts.join(', ') : null;
  }

  featureTagsWithoutEnvSurface(tags: string[]): string[] {
    const env = new Set(['indoor','outdoor','heated','unheated']);
    const surface = new Set(['clay','grass','hard','synthetic','carpet','acrylic','concrete','asphalt']);
    const seen = new Set<string>();
    return (tags || []).filter(t => {
      const k = (t || '').toLowerCase();
      if (!k) return false;
      if (env.has(k) || surface.has(k)) return false;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }
}
