import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { CourtListingCardComponent } from '../court-listing-card/court-listing-card.component';
import { AuthService } from '../../services/auth.service';

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
  imports: [CommonModule, FormsModule, CourtListingCardComponent, RouterLink, RouterLinkActive],
  templateUrl: './browse-courts-page.component.html',
  styleUrl: './browse-courts-page.component.scss'
})
export class BrowseCourtsPageComponent {
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

  constructor(private auth: AuthService, private router: Router) {
    this.generateTimeOptions();
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
