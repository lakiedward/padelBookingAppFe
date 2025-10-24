import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ChangeDetectorRef, Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PublicService } from '../../services/public.service';
import { CourtService } from '../../services/court.service';
import { CourtAvailabilityRuleResponse, CourtPhotoResponse, CourtResponse, PublicAvailableTimeSlot } from '../../models/court.models';
import { AuthService } from '../../services/auth.service';
import { AppHeaderComponent } from '../shared/app-header/app-header.component';
import { MapService } from '../../services/map.service';

@Component({
  selector: 'app-court-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, AppHeaderComponent],
  templateUrl: './court-detail.component.html',
  styleUrl: './court-detail.component.scss'
})
export class CourtDetailComponent implements OnInit {
  isLoading = true;
  courtId!: number;
  court?: CourtResponse;
  heroImage = '';
  mobileOpen = false;

  // date/state
  selectedDate: Date = new Date();
  days: Date[] = [];
  slotsForDay: { start: string; end: string }[] = [];
  selectedSlot?: { start: string; end: string };

  // location/map state
  clubLocation?: { address: string; lat: number; lng: number };
  private mapInitialized = false;

  private isBrowser: boolean;

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
    this.route.paramMap.subscribe(params => {
      const id = Number(params.get('id'));
      if (!id) {
        this.router.navigate(['/user']);
        return;
      }
      this.courtId = id;
      this.load();
    });
  }

  private load() {
    this.isLoading = true;
    this.publicService.getPublicCourtById(this.courtId).subscribe({
      next: (court) => {
        this.court = court;
        this.clubLocation = court.clubLocation;
        this.heroImage = this.pickHeroImage(court.photos);
        this.loadSlotsForSelectedDate();

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
    this.loadSlotsForSelectedDate();
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
    this.publicService.getAvailableTimeSlotsByCourt(this.courtId).subscribe({
      next: (slots) => {
        const key = this.dateKey(this.selectedDate);
        const sameDay = (slots || []).filter(s => (s.startTime ?? '').substring(0, 10) === key)
                                      .sort((a, b) => a.startTime.localeCompare(b.startTime));
        this.slotsForDay = sameDay.map(s => ({
          start: s.startTime.substring(11, 16),
          end: s.endTime.substring(11, 16)
        }));
        this.cdr.detectChanges();
      },
      error: () => {
        this.slotsForDay = [];
      }
    });
  }

  onPickSlot(slot: { start: string; end: string }) {
    this.selectedSlot = slot;
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
}
