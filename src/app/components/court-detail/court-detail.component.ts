import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ChangeDetectorRef, Component, Inject, OnDestroy, OnInit, PLATFORM_ID, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePickerModule } from 'primeng/datepicker';
import { PublicService } from '../../services/public.service';
import { CourtService } from '../../services/court.service';
import { CourtAvailabilityRuleResponse, CourtPhotoResponse, CourtResponse } from '../../models/court.models';
import { AuthService } from '../../services/auth.service';
import { ClubDetails } from '../../models/club.models';
import { MapService } from '../../services/map.service';
import { Subject, combineLatest } from 'rxjs';
import { ConvertMoneyPipe } from '../../pipes/convert-money.pipe';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-court-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePickerModule, ConvertMoneyPipe, RouterLink],
  templateUrl: './court-detail.component.html',
  styleUrl: './court-detail.component.scss',
  encapsulation: ViewEncapsulation.None
})
export class CourtDetailComponent implements OnInit, OnDestroy {
  isLoading = true;
  courtId!: number;
  court?: CourtResponse;
  club?: ClubDetails;
  heroImage = '';
  mobileOpen = false;

  selectedDate: Date = new Date();
  days: Date[] = [];
  slotsForDay: { id: number; start: string; end: string; available: boolean; price: number; currency?: string }[] = [];
  selectedSlot?: { id: number; start: string; end: string; price: number; currency?: string };
  loadingSlots = false;

  clubLocation?: { address: string; lat: number; lng: number };
  private mapInitialized = false;

  private isBrowser: boolean;
  private destroy$ = new Subject<void>();
  private initialDateParam?: string;
  private initialSlotIdParam?: number;
  private initialStartParam?: string;
  private hasAppliedInitialSelection = false;
  private pendingScrollToSlots = false;
  minDate = new Date();

  isAuthenticated = false;

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
    this.isAuthenticated = this.auth.isLoggedIn();
  }

  ngOnInit(): void {
    this.days = Array.from({ length: 7 }, (_, i) => this.addDays(new Date(), i));
    combineLatest([this.route.paramMap, this.route.queryParamMap])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([params, query]) => {
        const id = Number(params.get('id'));
        if (!id) {
          this.router.navigate(['/courts']);
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

        if (this.clubLocation && this.isBrowser) {
          setTimeout(() => this.initializeMap(), 150);
        }

        if (court.clubId) {
          this.loadClubDetails(court.clubId);
        }

        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoading = false;
        this.router.navigate(['/courts']);
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

  private pickHeroImage(photos: CourtPhotoResponse[] | undefined): string {
    if (!photos || photos.length === 0) return '';
    const primary = photos.find(p => p.isPrimary) || photos[0];
    return this.courtService.toAbsoluteUrl(primary.url) || '';
  }

  onBack() {
    this.router.navigate(['/courts']);
  }

  onSelectDay(d: Date) {
    this.selectedDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    
    this.ensureDateInDaysArray(this.selectedDate);
    
    this.selectedSlot = undefined;
    this.loadSlotsForSelectedDate();
    
    setTimeout(() => this.scrollToSelectedDay(), 150);
  }

  private ensureDateInDaysArray(date: Date) {
    const selectedDay = new Date(date);
    const dayOfWeek = selectedDay.getDay();
    
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    
    const monday = new Date(selectedDay);
    monday.setDate(selectedDay.getDate() - daysToMonday);
    monday.setHours(0, 0, 0, 0);
    
    this.days = Array.from({ length: 7 }, (_, i) => {
      const day = new Date(monday);
      day.setDate(monday.getDate() + i);
      return day;
    });
    
    this.cdr.detectChanges();
  }

  onDateInputChange(evt: Event) {
    const input = evt.target as HTMLInputElement;
    let next: Date | null = null;
    if ((input as any).valueAsDate) {
      next = (input as any).valueAsDate as Date;
    } else if (input.value) {
      next = new Date(input.value);
    }
    if (next) {
      this.onSelectDay(next);
    }
  }

  onDateSelect(date: Date) {
    if (date) {
      this.onSelectDay(date);
    }
  }

  setToday() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    this.onSelectDay(today);
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

  private loadSlotsForSelectedDate() {
    this.loadingSlots = true;
    this.slotsForDay = [];
    this.selectedSlot = undefined;
    const dateKey = this.dateKey(this.selectedDate);
    
    this.publicService.getAllTimeSlotsByCourtAndDate(this.courtId, dateKey).subscribe({
      next: (resp) => {
        const items = (resp?.items || []).slice().sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
        this.slotsForDay = items.map(s => ({
          id: s.id,
          start: (s.startTime || '').substring(11, 16),
          end: (s.endTime || '').substring(11, 16),
          available: !!s.available,
          price: s.price || 0,
          currency: 'EUR'
        }));
        this.loadingSlots = false;
        this.cdr.detectChanges();
        this.handleInitialSlotSelection();
      },
      error: () => {
        this.slotsForDay = [];
        this.loadingSlots = false;
        this.cdr.detectChanges();
        this.handleInitialSlotSelection();
      }
    });
  }

  onPickSlot(slot: { id: number; start: string; end: string; available?: boolean; price?: number; currency?: string }) {
    if (slot.available === false) return;
    if (this.isPastSlot(slot)) return;
    this.selectedSlot = { id: slot.id, start: slot.start, end: slot.end, price: slot.price || 0, currency: 'EUR' };
  }

  onBookNow() {
    if (!this.selectedSlot || !this.court) return;
    
    if (this.isPastDate(this.selectedDate) || this.isPastSlot(this.selectedSlot)) {
      return;
    }

    const bookingParams = {
      courtId: this.courtId.toString(),
      date: this.dateKey(this.selectedDate),
      start: this.selectedSlot.start,
      end: this.selectedSlot.end,
      price: this.selectedSlot.price.toString(),
      currency: 'EUR'
    };

    if (!this.isAuthenticated) {
      const queryString = new URLSearchParams(bookingParams).toString();
      const returnUrl = `/booking/${this.selectedSlot.id}?${queryString}`;
      
      this.router.navigate(['/auth'], {
        queryParams: { returnUrl }
      });
      return;
    }

    this.router.navigate(['/booking', this.selectedSlot.id], {
      queryParams: bookingParams
    });
  }

  private scrollToSelectedDay() {
    if (!this.isBrowser) return;
    
    const selectedDateKey = this.dateKey(this.selectedDate);
    const selectedButton = document.querySelector(`[data-date-key="${selectedDateKey}"]`) as HTMLElement;
    
    if (selectedButton) {
      selectedButton.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center'
      });
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

  private async initializeMap() {
    if (!this.isBrowser || !this.clubLocation) return;

    try {
      await this.mapService.loadLeafletAssets();

      const mapContainer = document.getElementById('court-detail-map');
      if (!mapContainer) return;

      const L = (window as any).L;
      if (!L) return;

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

  addDays(base: Date, n: number) { const d = new Date(base); d.setDate(d.getDate() + n); return d; }
  dateKey(d: Date) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
  formatDay(d: Date) { return d.toLocaleDateString('en-US', { weekday: 'short', day: '2-digit', month: 'short' }); }
  formatWeekday(d: Date) { return d.toLocaleDateString('en-US', { weekday: 'short' }); }
  formatDayMonth(d: Date) { return d.toLocaleDateString('en-US', { day: '2-digit', month: 'short' }); }

  formatWeekdays(weekdays: number[]): string {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return weekdays.map(d => days[d]).join(', ');
  }

  isPastDate(date: Date): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);
    return compareDate < today;
  }

  isPastSlot(slot: { start: string }): boolean {
    if (!this.isToday()) return false;
    
    const now = new Date();
    const [hours, minutes] = slot.start.split(':').map(Number);
    const slotTime = new Date();
    slotTime.setHours(hours, minutes, 0, 0);
    
    return slotTime <= now;
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

  copyToClipboard(text: string): void {
    if (!text) return;
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        this.showCopyToast(text);
      }).catch(err => {
        console.error('Failed to copy:', err);
        this.fallbackCopyToClipboard(text);
      });
    } else {
      this.fallbackCopyToClipboard(text);
    }
  }

  private fallbackCopyToClipboard(text: string): void {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      document.execCommand('copy');
      this.showCopyToast(text);
    } catch (err) {
      console.error('Fallback copy failed:', err);
    }
    
    document.body.removeChild(textArea);
  }

  private showCopyToast(text: string): void {
    const toast = document.createElement('div');
    toast.className = 'copy-toast';
    toast.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
      <span>Copied to clipboard!</span>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 10);
    
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => document.body.removeChild(toast), 300);
    }, 2000);
  }
}
