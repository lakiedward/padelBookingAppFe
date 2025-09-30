import { CommonModule } from '@angular/common';
import { Component, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CourtListingCardComponent } from '../court-listing-card/court-listing-card.component';
import { AuthService } from '../../services/auth.service';
import { DatePickerModule } from 'primeng/datepicker';
import { InputMaskModule } from 'primeng/inputmask';
import { DatePicker } from 'primeng/datepicker';

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
type SortBy = 'earliest' | 'price-asc' | 'price-desc';

interface CourtItem {
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
  imports: [CommonModule, FormsModule, DatePickerModule, InputMaskModule, CourtListingCardComponent],
  templateUrl: './browse-courts-page.component.html',
  styleUrl: './browse-courts-page.component.scss'
})
export class BrowseCourtsPageComponent {
  @ViewChild('fromPicker') fromPicker!: DatePicker;
  @ViewChild('toPicker') toPicker!: DatePicker;
  
  mobileOpen = false;
  sportFilter: SportFilter = 'all';
  venueFilter: VenueFilter = 'all';
  sortBy: SortBy = 'earliest';
  sortOptions: { label: string; value: SortBy }[] = [
    { label: 'Earliest availability', value: 'earliest' },
    { label: 'Price: Low to High', value: 'price-asc' },
    { label: 'Price: High to Low', value: 'price-desc' }
  ];
  moreSportsOpen = false;
  selectedDate: Date | null = null;
  // Time range filters (time-only pickers)
  timeFrom: Date | null = null;
  timeTo: Date | null = null;
  // Masked time strings for manual input on touch devices (HH:MM)
  timeFromStr = '';
  timeToStr = '';

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

  readonly additionalSports: { key: SportFilter; label: string }[] = [
    { key: 'volleyball', label: '🏐 Volleyball' },
    { key: 'badminton', label: '🏸 Badminton' },
    { key: 'squash', label: 'Squash' },
    { key: 'table-tennis', label: '🏓 Table Tennis' }
  ];

  // Placeholder demo data; images use remote placeholders for now.
  items: CourtItem[] = [
    {
      image: 'https://images.unsplash.com/photo-1599050751798-13b6ce8ce1b7?q=80&w=1200&auto=format&fit=crop',
      emoji: '🏀',
      title: 'Basketball Court 1',
      club: 'Elite Sports Center',
      location: 'Downtown Sports Complex',
      price: '$40',
      tags: ['Indoor', 'Synthetic'],
      slots: ['6:00 AM', '7:00 AM', '9:00 AM', '+6 more'],
      sport: 'basketball'
    },
    {
      image: 'https://images.unsplash.com/photo-1537824598505-99ee03483384?q=80&w=1200&auto=format&fit=crop',
      emoji: '⚽',
      title: 'Football Field 1',
      club: 'Premier Football Club',
      location: 'City Sports Park',
      price: '$80',
      tags: ['Outdoor', 'Grass'],
      slots: ['6:00 AM', '8:00 AM', '10:00 AM', '+5 more'],
      sport: 'football'
    },
    {
      image: 'https://images.unsplash.com/photo-1500835556837-99ac94a94552?q=80&w=1200&auto=format&fit=crop',
      emoji: '🎾',
      title: 'Elite Tennis Court 2',
      club: 'Elite Tennis Club',
      location: 'Downtown Sports Complex',
      price: '$45',
      tags: ['Outdoor', 'Clay'],
      slots: ['7:00 AM', '8:00 AM', '10:00 AM', '+5 more'],
      sport: 'tennis'
    },
    {
      image: 'https://images.unsplash.com/photo-1512163143273-bde0e3cc740e?q=80&w=1200&auto=format&fit=crop',
      emoji: '🎾',
      title: 'Elite Tennis Court 1',
      club: 'Elite Tennis Club',
      location: 'Downtown Sports Complex',
      price: '$50',
      tags: ['Indoor', 'Hard Court'],
      slots: ['8:00 AM', '9:00 AM', '11:00 AM', '+6 more'],
      sport: 'tennis'
    },
    {
      image: 'https://images.unsplash.com/photo-1593111776706-b6400dd9fec4?q=80&w=1200&auto=format&fit=crop',
      emoji: '🏓',
      title: 'Padel Court 1',
      club: 'Padel Pro Center',
      location: 'North District',
      price: '$35',
      tags: ['Indoor', 'Artificial Turf'],
      slots: ['9:00 AM', '11:00 AM', '1:00 PM', '+4 more'],
      sport: 'padel'
    }
  ];

  constructor(private auth: AuthService, private router: Router) {}

  get filtered(): CourtItem[] {
    const sportMatch = (it: CourtItem) =>
      this.sportFilter === 'all' || it.sport === this.sportFilter;

    const venueMatch = (it: CourtItem) =>
      this.venueFilter === 'all' ||
      (this.venueFilter === 'indoor' && it.tags.includes('Indoor')) ||
      (this.venueFilter === 'outdoor' && it.tags.includes('Outdoor'));

    const timeInRange = (slots: string[]): boolean => {
      // If no time filter, accept
      if (!this.timeFrom && !this.timeTo) return true;

      const fromMin = this.timeFrom ? this.minutesOfDate(this.timeFrom) : null;
      const toMin = this.timeTo ? this.minutesOfDate(this.timeTo) : null;

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
  }

  clearTime() {
    this.timeFrom = null;
    this.timeTo = null;
    this.timeFromStr = '';
    this.timeToStr = '';
  }

  private minutesOfDate(d: Date): number {
    return d.getHours() * 60 + d.getMinutes();
  }

  private parseTimeString(s: string): number | null {
    // Accept formats like "6:00 AM", "18:30", "6:05PM"
    const trimmed = s.trim();
    const ampm = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(trimmed);
    if (ampm) {
      let h = parseInt(ampm[1], 10);
      const min = parseInt(ampm[2], 10);
      const mer = ampm[3].toUpperCase();
      if (mer === 'PM' && h !== 12) h += 12;
      if (mer === 'AM' && h === 12) h = 0;
      return h * 60 + min;
    }
    const h24 = /^(\d{1,2}):(\d{2})$/.exec(trimmed);
    if (h24) {
      const h = parseInt(h24[1], 10);
      const min = parseInt(h24[2], 10);
      if (h >= 0 && h < 24 && min >= 0 && min < 60) return h * 60 + min;
    }
    return null;
  }

  onTimeMaskComplete(which: 'from' | 'to') {
    let str = which === 'from' ? this.timeFromStr : this.timeToStr;
    const re = /^(\d{1,2}):(\d{2})$/;
    const m = re.exec((str || '').trim());
    if (!m) return;
    let h = Math.min(23, Math.max(0, parseInt(m[1], 10)));
    let min = Math.min(59, Math.max(0, parseInt(m[2], 10)));
    const d = new Date();
    d.setHours(h, min, 0, 0);
    // Normalize displayed value to HH:MM
    const norm = `${h.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
    if (which === 'from') {
      this.timeFrom = d;
      this.timeFromStr = norm;
    } else {
      this.timeTo = d;
      this.timeToStr = norm;
    }
  }

  onTimePickerChange(value: Date | null, which: 'from' | 'to') {
    if (!value) {
      if (which === 'from') this.timeFromStr = '';
      else this.timeToStr = '';
      return;
    }
    const h = value.getHours();
    const m = value.getMinutes();
    const norm = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    if (which === 'from') this.timeFromStr = norm; else this.timeToStr = norm;
  }

  onTimeSelect(value: Date | null, which: 'from' | 'to') {
    if (!value) return;
    
    // Validate time range
    if (which === 'to' && this.timeFrom) {
      const fromMinutes = this.minutesOfDate(this.timeFrom);
      const toMinutes = this.minutesOfDate(value);
      
      if (toMinutes <= fromMinutes) {
        // If "To" time is before or equal to "From" time, show warning
        console.warn('End time must be after start time');
        // Optionally, you could show a toast notification here
        return;
      }
    }
    
    if (which === 'from' && this.timeTo) {
      const fromMinutes = this.minutesOfDate(value);
      const toMinutes = this.minutesOfDate(this.timeTo);
      
      if (fromMinutes >= toMinutes) {
        console.warn('Start time must be before end time');
        return;
      }
    }
    
    // Update the time values
    if (which === 'from') {
      this.timeFrom = value;
    } else {
      this.timeTo = value;
    }
    
    // Update the string representation
    const h = value.getHours();
    const m = value.getMinutes();
    const norm = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    if (which === 'from') this.timeFromStr = norm; else this.timeToStr = norm;
    
    // Close the picker after selection
    setTimeout(() => {
      if (which === 'from' && this.fromPicker) {
        this.fromPicker.hideOverlay();
      } else if (which === 'to' && this.toPicker) {
        this.toPicker.hideOverlay();
      }
    }, 100);
  }

  onTimePickerHide(which: 'from' | 'to') {
    // This method is called when the time picker is hidden
    // We can use this to ensure proper cleanup or additional validation
    console.log(`Time picker ${which} hidden`);
  }

  // No global click listener needed for inline expansion

  logout() {
    this.auth.logout();
    this.router.navigate(['/auth']);
  }
}
