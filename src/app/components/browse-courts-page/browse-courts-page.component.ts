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
import { DatePickerModule } from 'primeng/datepicker';
import { sportEmoji } from '../../utils/sport-emoji.util';

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

type SlotInterval = { start: string; end: string; available?: boolean };

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
  fullSlots: SlotInterval[]; // full start/end slots used for filtering
}

@Component({
  selector: 'app-browse-courts-page',
  standalone: true,
  imports: [CommonModule, FormsModule, CourtListingCardComponent, AppHeaderComponent, DatePickerModule],
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
  // Simple time strings (HH:MM format) used for filtering
  timeFromStr: string = '';
  timeToStr: string = '';
  // Date models bound to PrimeNG time-only pickers
  timeFrom: Date | null = null;
  timeTo: Date | null = null;
  overlayAppendTarget: string | null = null;

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
          this.items[index].fullSlots = fallback.intervals;
          this.items[index].slots = fallback.displayTimes;
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
    if (this.isBrowser) {
      this.overlayAppendTarget = 'body';
    }
  }

  ngOnInit(): void {
    if (!this.isBrowser) return;
    
    // Set today as default if no date selected
    if (!this.selectedDate) {
      const now = new Date();
      this.selectedDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      this.selectedDateStr = this.formatDateForInput(this.selectedDate);
    }
    // Sanitize any pre-filled time strings to strict quarter steps
    this.timeFromStr = this.timeFromStr;
    this.timeToStr = this.timeToStr;
    
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
          emoji: sportEmoji(c.sport),
          title: c.name,
          club: c.clubName,
          location: c.clubName,
          price: '',
          tags: c.tags || [],
          slots: [],
          sport: (c.sport as any),
          fullSlots: []
        }));
        this.items.forEach((it, idx) => {
          // Only use loadAvailabilityFor - it will use fallback if needed
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

  private computeFromRules(rules: CourtAvailabilityRuleResponse[]): { dateStr: string; displayTimes: string[]; intervals: SlotInterval[] } | null {
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
    const intervals = this.buildIntervals(chosen.rule.startTime, chosen.rule.endTime, chosen.rule.slotMinutes);
    if (!intervals.length) return null;
    const starts = intervals.map(i => i.start);
    const displayTimes = this.toChipLabels(starts);
    return { dateStr, displayTimes, intervals };
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

  private buildIntervals(startHHmm: string, endHHmm: string, slotMinutes: number, limit?: number): SlotInterval[] {
    const start = this.parseTimeString(startHHmm);
    const end = this.parseTimeString(endHHmm);
    if (start == null || end == null || !slotMinutes || slotMinutes <= 0) {
      return [];
    }

    const results: SlotInterval[] = [];
    for (let current = start; current + slotMinutes <= end; current += slotMinutes) {
      const next = current + slotMinutes;
      results.push({
        start: this.minutesToHHMM(current),
        end: this.minutesToHHMM(next)
      });
      if (limit && results.length >= limit) break;
    }
    return results;
  }

  private toChipLabels(allTimes: string[]): string[] {
    if (allTimes.length <= 3) {
      return [...allTimes];
    }
    const displayed = allTimes.slice(0, 3);
    displayed.push(`+${allTimes.length - 3} more`);
    return displayed;
  }

  private minutesToHHMM(totalMinutes: number): string {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const clampedHours = (hours + 24) % 24;
    return `${String(clampedHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  goToDetail(courtId: number) {
    this.router.navigate(['/user/court', courtId]);
  }

  private loadAvailabilityFor(index: number, courtId: number) {
    console.log('[BrowseCourts] Loading availability for court', courtId);
    
    // Use today's date or selected date for availability check
    const targetDate = this.selectedDate || new Date();
    const dateStr = this.formatDateForInput(targetDate);
    
    this.publicService.getAllTimeSlotsByCourtAndDate(courtId, dateStr).subscribe({
      next: (response) => {
        console.log('[BrowseCourts] All timeslots for court', courtId, ':', response);
        const slots = response?.items || [];
        
        if (!Array.isArray(slots) || slots.length === 0) {
          console.log('[BrowseCourts] No timeslots found, trying fallback from rules for court', courtId);
          this.publicService.getPublicCourtById(courtId).subscribe({
            next: (court) => {
              console.log('[BrowseCourts] Court details for fallback:', court);
              const fallback = this.computeFromRules(court.availabilityRules);
              if (fallback) {
                console.log('[BrowseCourts] Fallback availability computed:', fallback);
                this.items[index] = {
                  ...this.items[index],
                  availableDate: fallback.dateStr,
                  fullSlots: fallback.intervals,
                  slots: fallback.displayTimes
                };
                this.items = [...this.items];
                this.cdr.detectChanges();
              } else {
                console.warn('[BrowseCourts] No fallback could be computed from rules for court', courtId);
              }
            },
            error: (err) => {
              console.error('[BrowseCourts] Failed to load court details for fallback:', err);
            }
          });
          return;
        }
        
        // Sort slots by time
        const sorted = slots.slice().sort((a, b) => a.startTime.localeCompare(b.startTime));
        
        // Build arrays of HH:mm times for filtering and chips (with availability status)
        const intervals: SlotInterval[] = sorted.map(s => ({
          start: s.startTime.substring(11, 16),
          end: s.endTime.substring(11, 16),
          available: s.available
        }));
        
        // Only show available slots in chips
        const availableIntervals = intervals.filter(i => i.available !== false);
        const chips: string[] = this.toChipLabels(availableIntervals.map(i => i.start));
        
        console.log('[BrowseCourts] Setting availability for court', courtId, ':', { 
          date: dateStr, 
          totalSlots: intervals.length,
          availableSlots: availableIntervals.length,
          chips 
        });
        
        // Create new object to force change detection
        this.items[index] = {
          ...this.items[index],
          availableDate: dateStr,
          fullSlots: intervals, // All slots with availability status
          slots: chips // Only available slots for display
        };
        this.items = [...this.items]; // Force array reference change
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('[BrowseCourts] Failed to load availability for court', courtId, ':', err);
      }
    });
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

  onTimeInputChange(which: 'from' | 'to', event: any) {
    // Support both native input events and PrimeNG Date objects
    const raw = (event && event.target && typeof event.target.value === 'string')
      ? event.target.value
      : (event && event.value) // PrimeNG often sends { value: Date }
        ?? event; // fallback

    const mins = this.coerceToMinutes(raw);
    if (mins != null) {
      const nextQuarter = this.roundToNextQuarter(mins);
      const hhmm = this.minutesToHHMM(nextQuarter);
      const hours = Math.floor(nextQuarter / 60);
      const minutes = nextQuarter % 60;
      const snappedDate = new Date(1970, 0, 1, hours, minutes, 0, 0);
      if (which === 'from') {
        this.timeFromStr = hhmm;
        this.timeFrom = snappedDate;
      } else {
        this.timeToStr = hhmm;
        this.timeTo = snappedDate;
      }
    }

    // Validate time range
    if (this.timeFromStr && this.timeToStr) {
      if (this.timeFromStr >= this.timeToStr) {
        console.warn('End time must be after start time');
        // Reset the invalid time
        if (which === 'to') {
          this.timeToStr = '';
          this.timeTo = null;
        } else {
          this.timeFromStr = '';
          this.timeFrom = null;
        }
      }
    }
  }

  private coerceToMinutes(raw: any): number | null {
    if (raw instanceof Date) {
      return raw.getHours() * 60 + raw.getMinutes();
    }
    if (typeof raw === 'string') {
      return this.parseTimeString(raw);
    }
    // Try toString() if available
    if (raw && typeof raw.toString === 'function') {
      const str = raw.toString();
      return this.parseTimeString(str);
    }
    return null;
  }

  private roundToNextQuarter(totalMinutes: number): number {
    const rem = totalMinutes % 15;
    const add = rem === 0 ? 15 : (15 - rem);
    const next = totalMinutes + add;
    const DAY = 24 * 60;
    return next % DAY; // wrap around midnight
  }

  private sanitizeToQuarter(raw: string): string {
    if (!raw) return '';
    const mins = this.parseTimeString(raw);
    if (mins == null) return '';
    // Snap to NEXT 15-minute increment to avoid illegal minutes like :46
    const rem = mins % 15;
    const snapped = rem === 0 ? mins : mins + (15 - rem);
    const DAY = 24 * 60;
    const normalized = ((snapped % DAY) + DAY) % DAY;
    return this.minutesToHHMM(normalized);
  }

  get filtered(): CourtItem[] {
    const sportMatch = (it: CourtItem) =>
      this.sportFilter === 'all' || it.sport === this.sportFilter;

    const venueMatch = (it: CourtItem) =>
      this.venueFilter === 'all' ||
      (this.venueFilter === 'indoor' && it.tags.includes('Indoor')) ||
      (this.venueFilter === 'outdoor' && it.tags.includes('Outdoor'));

    const timeInRange = (item: CourtItem): boolean => {
      // Derive minutes from Date models first; fall back to strings for safety
      const fromMin = this.timeFrom
        ? this.timeFrom.getHours() * 60 + this.timeFrom.getMinutes()
        : (this.timeFromStr ? this.parseTimeString(this.timeFromStr) : null);
      const toMin = this.timeTo
        ? this.timeTo.getHours() * 60 + this.timeTo.getMinutes()
        : (this.timeToStr ? this.parseTimeString(this.timeToStr) : null);

      if (fromMin == null && toMin == null) return true;

      const intervals: SlotInterval[] = item.fullSlots && item.fullSlots.length > 0
        ? item.fullSlots
        : (item.slots || [])
            .filter((s) => !s.startsWith('+'))
            .map((start) => ({ start, end: start }));

      for (const interval of intervals) {
        // Skip unavailable/booked slots
        if (interval.available === false) continue;

        const startMin = this.parseTimeString(interval.start);
        const endMin = this.parseTimeString(interval.end);
        if (startMin == null || endMin == null) continue;

        if (fromMin != null && toMin != null) {
          if (fromMin <= toMin) {
            // Check for overlap: slot overlaps with filter window if:
            // slot starts before filter ends AND slot ends after filter starts
            if (startMin < toMin && endMin > fromMin) return true;
          } else {
            // Over-midnight case (e.g., From 22:00, To 02:00)
            // Slot overlaps if it's either late (>= fromMin) or early (<= toMin)
            if (startMin >= fromMin || endMin <= toMin) return true;
          }
        } else if (fromMin != null) {
          // Only "From" specified - any slot starting at or after fromMin
          if (startMin >= fromMin) return true;
        } else if (toMin != null) {
          // Only "To" specified - any slot ending at or before toMin
          if (endMin <= toMin) return true;
        }
      }
      return false;
    };

    const parsed = this.items.filter((it) => sportMatch(it) && venueMatch(it) && timeInRange(it));

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
    
    // Reload availability for all courts with today's date
    this.items.forEach((item, idx) => {
      this.loadAvailabilityFor(idx, item.courtId);
    });
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
    
    // Reload availability for all courts with new date
    this.items.forEach((item, idx) => {
      this.loadAvailabilityFor(idx, item.courtId);
    });
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
    this.timeFrom = null;
    this.timeTo = null;
  }

  private parseTimeString(raw: unknown): number | null {
    if (raw == null) return null;

    let candidate: string | null = null;
    if (typeof raw === 'string') {
      candidate = raw;
    } else if (typeof raw === 'number') {
      candidate = raw.toString();
    } else if (typeof raw === 'object' && raw !== null) {
      const maybeToString = (raw as { toString?: () => string }).toString;
      if (typeof maybeToString === 'function') {
        candidate = maybeToString.call(raw);
      }
    }

    if (typeof candidate !== 'string') return null;

    // Parse HH:MM format
    const trimmed = candidate.trim();
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
