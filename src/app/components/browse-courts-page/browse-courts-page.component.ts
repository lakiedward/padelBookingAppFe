import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, OnInit, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CourtListingCardComponent } from '../court-listing-card/court-listing-card.component';
import { AuthService } from '../../services/auth.service';
import { PublicService } from '../../services/public.service';
import { CourtService } from '../../services/court.service';
import { CourtAvailabilityRuleResponse } from '../../models/court.models';
import { DatePickerModule } from 'primeng/datepicker';
import { Select } from 'primeng/select';
import { sportEmoji } from '../../utils/sport-emoji.util';
import { catchError, forkJoin, map, of } from 'rxjs';

type SportFilter =
  | 'all'
  | 'tennis'
  | 'football'
  | 'basketball'
  | 'padel'
  | 'volleyball'
  | 'badminton'
  | 'squash'
  | 'handball'
  | 'pingpong'
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
  price: string;
  unit?: string;
  tags: string[];
  availableDate?: string;
  slots: string[];
  sport: SportFilter;
  fullSlots: SlotInterval[];
}

@Component({
  selector: 'app-browse-courts-page',
  standalone: true,
  imports: [CommonModule, FormsModule, CourtListingCardComponent, DatePickerModule, Select],
  templateUrl: './browse-courts-page.component.html',
  styleUrl: './browse-courts-page.component.scss'
})
export class BrowseCourtsPageComponent implements OnInit {
  mobileOpen = false;
  filtersExpanded = false;
  sportFilter: SportFilter = 'all';
  venueFilter: VenueFilter = 'all';
  heatedFilter: HeatedFilter = 'all';
  sortBy: SortBy = 'earliest';
  sortOptions: { label: string; value: SortBy }[] = [
    { label: 'Earliest availability', value: 'earliest' },
    { label: 'Price: Low to High', value: 'price-asc' },
    { label: 'Price: High to Low', value: 'price-desc' }
  ];
  
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
  
  moreSportsOpen = false;
  selectedDate: Date | null = null;
  selectedDateStr = '';
  timeFromStr: string = '';
  timeToStr: string = '';
  timeFrom: Date | null = null;
  timeTo: Date | null = null;
  overlayAppendTarget: string | null = null;

  timeOptions: { label: string; value: string }[] = [];

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
  isLoading = true;

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
    
    if (!this.selectedDate) {
      const now = new Date();
      this.selectedDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      this.selectedDateStr = this.formatDateForInput(this.selectedDate);
    }
    this.timeFromStr = this.timeFromStr;
    this.timeToStr = this.timeToStr;
    
    this.loadClubs();
    
    setTimeout(() => {
      this.isLoading = true;
      this.loadCourts();
    }, 0);
  }
  
  private loadClubs(): void {
    this.publicService.getPublicClubs().subscribe({
      next: (clubs) => {
        
        const clubNames = new Set<string>();
        const locations = new Map<string, string>();
        
        clubs.forEach(club => {
          if (club.name) {
            clubNames.add(club.name);
          }
          if (club.locations && club.locations.length > 0) {
            club.locations.forEach(loc => {
              const formatted = this.formatLocation(loc.address);
              if (formatted) {
                locations.set(formatted, loc.address);
                if (club.name) {
                  this.clubToLocationMap.set(club.name, formatted);
                }
              }
            });
          }
        });
        
        this.allClubOptions = [
          { label: 'All clubs', value: 'all' },
          ...Array.from(clubNames).sort().map(name => ({
            label: name,
            value: name
          }))
        ];
        
        this.clubOptions = [...this.allClubOptions];
        
        this.locationOptions = [
          { label: 'All locations', value: 'all' },
          ...Array.from(locations.keys()).sort().map(formatted => ({
            label: formatted,
            value: formatted
          }))
        ];
        
        this.cdr.detectChanges();
      },
      error: () => {
      }
    });
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

  private formatLocation(address: string): string {
    const parts = address.split(',').map(p => p.trim());
    
    if (parts.length >= 6) {
      const city = parts[2];
      const country = parts[5];
      return `${city}, ${country}`;
    } else if (parts.length === 5) {
      const city = parts[1];
      const country = parts[4];
      return `${city}, ${country}`;
    } else if (parts.length === 4) {
      const city = parts[0];
      const country = parts[3];
      return `${city}, ${country}`;
    } else if (parts.length >= 2) {
      const lastPart = parts[parts.length - 1];
      const secondToLast = parts[parts.length - 2];
      
      if (/^\d+$/.test(secondToLast) && parts.length >= 3) {
        const city = parts[parts.length - 3];
        return `${city}, ${lastPart}`;
      } else {
        return `${secondToLast}, ${lastPart}`;
      }
    }
    
    return address;
  }

  private loadCourts(): void {
    this.isLoading = true;
    this.publicService.getPublicCourts().subscribe({
      next: (courts) => {
        
        const baseItems = courts.map(c => ({
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

        const dateStr = this.selectedDateStr;

        this.items = baseItems;
        this.refreshAvailabilityBatch(dateStr, () => {
          this.items.forEach((it, idx) => {
            if (!courts[idx].primaryPhotoUrl) {
              this.ensurePhotoFromDetails(idx, it.courtId);
            }
          });
        });
      },
      error: () => {
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  private refreshAvailabilityBatch(dateStr: string, afterUpdate?: () => void): void {
    const availabilityRequests = this.items.map((it) =>
      this.publicService.getAllTimeSlotsByCourtAndDate(it.courtId, dateStr).pipe(
        map((response) => {
          const slots = response?.items || [];
          if (!Array.isArray(slots) || slots.length === 0) {
            return {
              availableDate: dateStr,
              fullSlots: [] as SlotInterval[],
              slots: ['No slots available'] as string[]
            };
          }

          const sorted = slots.slice().sort((a, b) => a.startTime.localeCompare(b.startTime));
          const intervals: SlotInterval[] = sorted.map((s) => ({
            start: s.startTime.substring(11, 16),
            end: s.endTime.substring(11, 16),
            available: s.available
          }));

          const availableIntervals = intervals.filter((i) => i.available !== false);
          const chips: string[] =
            availableIntervals.length > 0
              ? this.toChipLabels(availableIntervals.map((i) => i.start))
              : ['No slots available'];

          return {
            availableDate: dateStr,
            fullSlots: intervals,
            slots: chips
          };
        }),
        catchError(() =>
          of({
            availableDate: dateStr,
            fullSlots: [] as SlotInterval[],
            slots: ['No slots available'] as string[]
          })
        )
      )
    );

    forkJoin(availabilityRequests).subscribe({
      next: (availability) => {
        this.items = this.items.map((it, idx) => ({
          ...it,
          ...availability[idx]
        }));
        afterUpdate?.();
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  trackByCourtId(_: number, item: CourtItem): number {
    return item.courtId;
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
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  goToDetail(courtId: number) {
    this.router.navigate(['/court', courtId]);
  }

  private loadAvailabilityFor(index: number, courtId: number) {
    const dateStr = this.selectedDateStr;
    
    this.publicService.getAllTimeSlotsByCourtAndDate(courtId, dateStr).subscribe({
      next: (response) => {
        const slots = response?.items || [];
        
        if (!Array.isArray(slots) || slots.length === 0) {
          this.items[index] = {
            ...this.items[index],
            availableDate: dateStr,
            fullSlots: [],
            slots: ['No slots available']
          };
          this.cdr.detectChanges();
          return;
        }
        
        const sorted = slots.slice().sort((a, b) => a.startTime.localeCompare(b.startTime));
        
        const intervals: SlotInterval[] = sorted.map(s => ({
          start: s.startTime.substring(11, 16),
          end: s.endTime.substring(11, 16),
          available: s.available
        }));
        
        const availableIntervals = intervals.filter(i => i.available !== false);
        
        const chips: string[] = availableIntervals.length > 0 
          ? this.toChipLabels(availableIntervals.map(i => i.start))
          : ['No slots available'];
        
        
        this.items[index] = {
          ...this.items[index],
          availableDate: dateStr,
          fullSlots: intervals,
          slots: chips
        };
        this.cdr.detectChanges();
      },
      error: () => {
        this.items[index] = {
          ...this.items[index],
          availableDate: dateStr,
          fullSlots: [],
          slots: ['No slots available']
        };
        this.cdr.detectChanges();
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
    const raw = (event && event.target && typeof event.target.value === 'string')
      ? event.target.value
      : (event && event.value)
        ?? event;

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

    if (this.timeFromStr && this.timeToStr) {
      if (this.timeFromStr >= this.timeToStr) {
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
    return next % DAY;
  }

  private sanitizeToQuarter(raw: string): string {
    if (!raw) return '';
    const mins = this.parseTimeString(raw);
    if (mins == null) return '';
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

    const clubMatch = (it: CourtItem) =>
      this.selectedClub === 'all' || it.club === this.selectedClub;

    const locationMatch = (it: CourtItem) => {
      if (this.selectedLocation === 'all') return true;
      const clubLocation = this.clubToLocationMap.get(it.club);
      return clubLocation === this.selectedLocation;
    };

    const timeInRange = (item: CourtItem): boolean => {
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
        if (interval.available === false) continue;

        const startMin = this.parseTimeString(interval.start);
        const endMin = this.parseTimeString(interval.end);
        if (startMin == null || endMin == null) continue;

        if (fromMin != null && toMin != null) {
          if (fromMin <= toMin) {
            if (startMin < toMin && endMin > fromMin) return true;
          } else {
            if (startMin >= fromMin || endMin <= toMin) return true;
          }
        } else if (fromMin != null) {
          if (startMin >= fromMin) return true;
        } else if (toMin != null) {
          if (endMin <= toMin) return true;
        }
      }
      return false;
    };

    const parsed = this.items.filter((it) => sportMatch(it) && venueMatch(it) && clubMatch(it) && locationMatch(it) && timeInRange(it));

    const toPrice = (p: string) => Number((p || '').replace(/[^0-9.]/g, '')) || 0;
    if (this.sortBy === 'price-asc') parsed.sort((a, b) => toPrice(a.price) - toPrice(b.price));
    if (this.sortBy === 'price-desc') parsed.sort((a, b) => toPrice(b.price) - toPrice(a.price));
    return parsed;
  }

  toggleMobile() { this.mobileOpen = !this.mobileOpen; }

  toggleFilters() {
    this.filtersExpanded = !this.filtersExpanded;
  }

  toggleMoreSports(event: Event) {
    event.stopPropagation();
    this.moreSportsOpen = !this.moreSportsOpen;
  }

  selectSport(key: SportFilter) {
    this.sportFilter = key;
    this.moreSportsOpen = false;
  }

  getActiveFilterCount(): number {
    let count = 0;
    if (this.sportFilter !== 'all') count++;
    if (this.venueFilter !== 'all') count++;
    if (this.heatedFilter !== 'all') count++;
    if (this.selectedLocation !== 'all') count++;
    if (this.selectedClub !== 'all') count++;
    return count;
  }

  setToday() {
    const now = new Date();
    this.selectedDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    this.selectedDateStr = this.formatDateForInput(this.selectedDate);

    this.isLoading = true;
    this.refreshAvailabilityBatch(this.selectedDateStr);
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

  onDateChange(event: any) {
    const value = event.target.value;
    if (value) {
      this.selectedDate = new Date(value);
      this.selectedDateStr = value;
    } else {
      this.selectedDate = null;
      this.selectedDateStr = '';
    }

    this.isLoading = true;
    this.refreshAvailabilityBatch(this.selectedDateStr);
  }
  
  onDateSelect(date: Date) {
    if (date) {
      this.selectedDate = date;
      this.selectedDateStr = this.formatDateForInput(date);

      this.isLoading = true;
      this.refreshAvailabilityBatch(this.selectedDateStr);
    }
  }

  private formatDateForInput(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  clearTime() {
    this.timeFrom = null;
    this.timeTo = null;
    this.timeFromStr = '';
    this.timeToStr = '';
    this.cdr.detectChanges();
  }
  
  clearAllFilters() {
    this.sportFilter = 'all';
    
    this.venueFilter = 'all';
    
    this.heatedFilter = 'all';
    
    this.selectedLocation = 'all';
    
    this.selectedClub = 'all';
    this.clubOptions = [...this.allClubOptions];
    
    this.sortBy = 'earliest';
    
    this.selectedDate = null;
    this.selectedDateStr = '';
    
    this.timeFrom = null;
    this.timeTo = null;
    this.timeFromStr = '';
    this.timeToStr = '';
    
    this.moreSportsOpen = false;
    
    this.cdr.detectChanges();
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

    const trimmed = candidate.trim();
    const h24 = /^(\d{1,2}):(\d{2})$/.exec(trimmed);
    if (h24) {
      const h = parseInt(h24[1], 10);
      const min = parseInt(h24[2], 10);
      if (h >= 0 && h < 24 && min >= 0 && min < 60) return h * 60 + min;
    }
    return null;
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/auth']);
  }
}
