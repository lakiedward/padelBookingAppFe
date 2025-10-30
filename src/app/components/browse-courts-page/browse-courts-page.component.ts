import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, OnInit, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CourtListingCardComponent } from '../court-listing-card/court-listing-card.component';
import { AuthService } from '../../services/auth.service';
import { PublicService } from '../../services/public.service';
import { CourtService } from '../../services/court.service';
import { CourtAvailabilityRuleResponse } from '../../models/court.models';
import { AppHeaderComponent } from '../shared/app-header/app-header.component';

type SportFilter =
  | 'all'
  | 'tennis'
  | 'football'
  | 'basketball'
  | 'padel'
  | 'volleyball'
  | 'badminton'
  | 'squash'
  | 'table-tennis';
type VenueFilter = 'all' | 'indoor' | 'outdoor';
type HeatedFilter = 'all' | 'heated' | 'unheated';
type SortBy = 'earliest' | 'price-asc' | 'price-desc';

interface CourtItem {
  courtId: number;
  image: string;
  emoji: string;
  title: string;
  club: string;
  location: string;
  price: string; // e.g. "$40"
  unit?: string;
  tags: string[]; // e.g. ["Indoor","Synthetic"]
  availableDate?: string; // e.g. "2025-09-01"
  slots: string[]; // e.g. ["6:00 AM","7:00 AM","9:00 AM","+6 more"]
  sport: SportFilter;
}

@Component({
  selector: 'app-browse-courts-page',
  standalone: true,
  imports: [CommonModule, FormsModule, CourtListingCardComponent, AppHeaderComponent],
  templateUrl: './browse-courts-page.component.html',
  styleUrl: './browse-courts-page.component.scss'
})
export class BrowseCourtsPageComponent implements OnInit {
  mobileOpen = false;
  sportFilter: SportFilter = 'all';
  venueFilter: VenueFilter = 'all';
  heatedFilter: HeatedFilter = 'all';
  sortBy: SortBy = 'earliest';
  sortOptions: { label: string; value: SortBy }[] = [
    { label: 'Earliest availability', value: 'earliest' },
    { label: 'Price: Low to High', value: 'price-asc' },
    { label: 'Price: High to Low', value: 'price-desc' }
  ];
  moreSportsOpen = false;
  selectedDate: Date | null = null;
  selectedDateStr = '';
  // Simple time strings (HH:MM format)
  timeFromStr = '';
  timeToStr = '';

  // Time options (24h format with 15-minute intervals)
  timeOptions: { label: string; value: string }[] = [];

  // Prefer PrimeNG DatePicker "touch" modal experience on phones and keep
  // the overlay alive until user confirms selection (iOS/Safari quirks).
  // SSR-safe detection (window may be undefined during server render).
  get isTouch(): boolean {
    if (typeof window === 'undefined') return false;
    try {
      return (
        (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) ||
        (navigator as any).maxTouchPoints > 0 ||
        'ontouchstart' in window
      );
    } catch {
      return false;
    }
  }

  private ensurePhotoFromDetails(index: number, courtId: number) {
    this.publicService.getPublicCourtById(courtId).subscribe({
      next: (court) => {
        const photos = (court as any).photos || [];
        if (Array.isArray(photos) && photos.length > 0) {
          const primary = photos.find((p: any) => p.isPrimary) || photos[0];
          if (primary && primary.url) {
            const absolute = this.courtService.toAbsoluteUrl(primary.url);
            if (absolute) {
              this.items[index].image = absolute;
              this.cdr.detectChanges();
            }
          }
        }
      },
      error: () => {}
    });
  }

  private preloadAvailabilityFromRules(index: number, courtId: number) {
    this.publicService.getPublicCourtById(courtId).subscribe({
      next: (court) => {
        const fallback = this.computeFromRules(court.availabilityRules);
        if (fallback) {
          this.items[index].availableDate = fallback.dateStr;
          this.items[index].slots = fallback.times;
        }
      },
      error: () => {}
    });
  }

  readonly additionalSports: { key: SportFilter; label: string }[] = [
    { key: 'volleyball', label: '🏐 Volleyball' },
    { key: 'badminton', label: '🏸 Badminton' },
    { key: 'squash', label: 'Squash' },
    { key: 'table-tennis', label: '🏓 Table Tennis' }
  ];

  items: CourtItem[] = [];
  isLoading = false;

  private isBrowser: boolean;

  constructor(
    private auth: AuthService,
    private router: Router,
    private publicService: PublicService,
    private courtService: CourtService,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    this.generateTimeOptions();
  }

  ngOnInit(): void {
    if (!this.isBrowser) return;
    setTimeout(() => {
      this.loadCourts();
    }, 0);
  }

  private loadCourts(): void {
    this.isLoading = true;
    this.publicService.getPublicCourts().subscribe({
      next: (courts) => {
        console.log('[BrowseCourts] Loaded courts from BE:', courts);
        this.items = courts.map(c => ({
          courtId: c.id,
          image: this.courtService.toAbsoluteUrl(c.primaryPhotoUrl) || 'https://placehold.co/1200x800?text=Court',
          emoji: this.emojiFor(c.sport),
          title: c.name,
          club: c.clubName,
          location: c.clubName,
          price: '',
          tags: c.tags || [],
          slots: [],
          sport: (c.sport as any)
        }));
        this.items.forEach((it, idx) => {
          this.preloadAvailabilityFromRules(idx, it.courtId);
          this.loadAvailabilityFor(idx, it.courtId);
          if (!courts[idx].primaryPhotoUrl) {
            this.ensurePhotoFromDetails(idx, it.courtId);
          }
        });
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('[BrowseCourts] Failed to load courts:', err);
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  private computeFromRules(rules: CourtAvailabilityRuleResponse[]): { dateStr: string; times: string[] } | null {
    if (!Array.isArray(rules) || rules.length === 0) return null;
    const today = new Date();
    const candidates: { date: Date; rule: CourtAvailabilityRuleResponse }[] = [];
    for (const r of rules) {
      if ((r as any).type === 'DATE' && r.date) {
        const d = new Date(r.date as string);
        if (this.isOnOrAfter(d, today)) candidates.push({ date: d, rule: r });
      } else if ((r as any).type === 'WEEKLY' && Array.isArray(r.weekdays)) {
        for (const wd of r.weekdays as number[]) {
          const d = this.nextDateForWeekday(today, wd);
          candidates.push({ date: d, rule: r });
        }
      }
    }
    if (candidates.length === 0) return null;
    candidates.sort((a, b) => a.date.getTime() - b.date.getTime());
    const chosen = candidates[0];
    const dateStr = this.formatDateForInput(chosen.date);
    const times = this.buildTimeChips(chosen.rule.startTime, chosen.rule.endTime, chosen.rule.slotMinutes);
    return { dateStr, times };
  }

  private nextDateForWeekday(ref: Date, weekday: number): Date {
    const d = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
    const delta = (weekday - d.getDay() + 7) % 7;
    d.setDate(d.getDate() + delta);
    return d;
  }

  private isOnOrAfter(a: Date, b: Date): boolean {
    const da = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
    const db = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
    return da >= db;
  }

  private buildTimeChips(startHHmm: string, endHHmm: string, slotMinutes: number): string[] {
    const toMin = (s: string) => {
      const [h, m] = s.split(':').map(Number);
      return h * 60 + m;
    };
    const toHHMM = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
    const start = toMin(startHHmm);
    const end = toMin(endHHmm);
    const times: string[] = [];
    for (let t = start; t + slotMinutes <= end; t += slotMinutes) {
      times.push(toHHMM(t));
      if (times.length === 3) break;
    }
    return times;
  }

  goToDetail(courtId: number) {
    this.router.navigate(['/user/court', courtId]);
  }

  private loadAvailabilityFor(index: number, courtId: number) {
    this.publicService.getAvailableTimeSlotsByCourt(courtId).subscribe({
      next: (slots) => {
        console.log('[BrowseCourts] Timeslots for court', courtId, slots);
        if (!Array.isArray(slots) || slots.length === 0) {
          this.publicService.getPublicCourtById(courtId).subscribe({
            next: (court) => {
              const fallback = this.computeFromRules(court.availabilityRules);
              if (fallback) {
                this.items[index].availableDate = fallback.dateStr;
                this.items[index].slots = fallback.times;
              }
            },
            error: () => {}
          });
          return;
        }
        // Find earliest date (yyyy-MM-dd)
        const dates = slots.map(s => s.startTime.substring(0, 10));
        const earliest = dates.sort()[0];
        const sameDay = slots
          .filter(s => s.startTime.substring(0, 10) === earliest)
          .sort((a, b) => a.startTime.localeCompare(b.startTime));
        // Build up to 3 time chips HH:mm
        const chips: string[] = sameDay.slice(0, 3).map(s => s.startTime.substring(11, 16));
        if (sameDay.length > 3) chips.push(`+${sameDay.length - 3} more`);
        this.items[index].availableDate = earliest;
        this.items[index].slots = chips;
      },
      error: (err) => {
        console.warn('[BrowseCourts] Failed to load availability for court', courtId, err);
      }
    });
  }


  private emojiFor(sport: string): string {
    const key = (sport || '').toLowerCase();
    if (key.includes('tennis') || key.includes('padel')) return '🎾';
    if (key.includes('basket')) return '🏀';
    if (key.includes('foot') || key.includes('soccer')) return '⚽';
    if (key.includes('volley')) return '🏐';
    if (key.includes('badminton')) return '🏸';
    if (key.includes('table')) return '🏓';
    return '🎾';
  }

  private generateTimeOptions() {
    const options: { label: string; value: string }[] = [];
    
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        options.push({
          label: timeString,
          value: timeString
        });
      }
    }
    
    this.timeOptions = options;
  }

  onTimeChange(which: 'from' | 'to', event: Event) {
    const target = event.target as HTMLSelectElement;
    const value = target.value;
    
    if (which === 'from') {
      this.timeFromStr = value;
    } else {
      this.timeToStr = value;
    }
    
    // Validate time range
    if (this.timeFromStr && this.timeToStr) {
      if (this.timeFromStr >= this.timeToStr) {
        console.warn('End time must be after start time');
        // Reset the invalid time
        if (which === 'to') {
          this.timeToStr = '';
        } else {
          this.timeFromStr = '';
        }
      }
    }
  }

  get filtered(): CourtItem[] {
    const sportMatch = (it: CourtItem) =>
      this.sportFilter === 'all' || it.sport === this.sportFilter;

    const venueMatch = (it: CourtItem) =>
      this.venueFilter === 'all' ||
      (this.venueFilter === 'indoor' && it.tags.includes('Indoor')) ||
      (this.venueFilter === 'outdoor' && it.tags.includes('Outdoor'));

    const timeInRange = (slots: string[]): boolean => {
      // If no time filter, accept
      if (!this.timeFromStr && !this.timeToStr) return true;

      const fromMin = this.timeFromStr ? this.parseTimeString(this.timeFromStr) : null;
      const toMin = this.timeToStr ? this.parseTimeString(this.timeToStr) : null;

      // Iterate slot strings like "6:00 AM"
      for (const s of slots) {
        if (s.startsWith('+')) continue; // "+6 more" etc.
        const m = this.parseTimeString(s);
        if (m == null) continue;
        if (fromMin != null && toMin != null) {
          if (fromMin <= toMin) {
            if (m >= fromMin && m <= toMin) return true;
          } else {
            // Over midnight case
            if (m >= fromMin || m <= toMin) return true;
          }
        } else if (fromMin != null) {
          if (m >= fromMin) return true;
        } else if (toMin != null) {
          if (m <= toMin) return true;
        }
      }
      return false;
    };

    const parsed = this.items.filter((it) => sportMatch(it) && venueMatch(it) && timeInRange(it.slots));

    const toPrice = (p: string) => Number((p || '').replace(/[^0-9.]/g, '')) || 0;
    if (this.sortBy === 'price-asc') parsed.sort((a, b) => toPrice(a.price) - toPrice(b.price));
    if (this.sortBy === 'price-desc') parsed.sort((a, b) => toPrice(b.price) - toPrice(a.price));
    // 'earliest' is demo only; left as-is
    return parsed;
  }

  toggleMobile() { this.mobileOpen = !this.mobileOpen; }

  toggleMoreSports(event: Event) {
    event.stopPropagation();
    this.moreSportsOpen = !this.moreSportsOpen;
  }

  selectSport(key: SportFilter) {
    this.sportFilter = key;
    // Close the extra sports panel after selecting, including 'Show all'
    this.moreSportsOpen = false;
  }

  setToday() {
    const now = new Date();
    // zero out time for clearer comparisons
    this.selectedDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    this.selectedDateStr = this.formatDateForInput(this.selectedDate);
  }

  onDateChange(event: any) {
    const value = event.target.value;
    if (value) {
      this.selectedDate = new Date(value);
      this.selectedDateStr = value;
    } else {
      this.selectedDate = null;
      this.selectedDateStr = '';
    }
  }

  private formatDateForInput(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  clearTime() {
    this.timeFromStr = '';
    this.timeToStr = '';
  }

  private parseTimeString(s: string): number | null {
    // Parse HH:MM format
    const trimmed = s.trim();
    const h24 = /^(\d{1,2}):(\d{2})$/.exec(trimmed);
    if (h24) {
      const h = parseInt(h24[1], 10);
      const min = parseInt(h24[2], 10);
      if (h >= 0 && h < 24 && min >= 0 && min < 60) return h * 60 + min;
    }
    return null;
  }

  // No global click listener needed for inline expansion

  logout() {
    this.auth.logout();
    this.router.navigate(['/auth']);
  }
}
