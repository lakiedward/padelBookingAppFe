import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CourtListingCardComponent } from '../court-listing-card/court-listing-card.component';
import { AuthService } from '../../services/auth.service';
import { DatePickerModule } from 'primeng/datepicker';

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
  imports: [CommonModule, FormsModule, DatePickerModule, CourtListingCardComponent],
  templateUrl: './browse-courts-page.component.html',
  styleUrl: './browse-courts-page.component.scss'
})
export class BrowseCourtsPageComponent {
  mobileOpen = false;
  sportFilter: SportFilter = 'all';
  venueFilter: VenueFilter = 'all';
  sortBy: SortBy = 'earliest';
  moreSportsOpen = false;
  selectedDate: Date | null = null;

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

    const parsed = this.items.filter((it) => sportMatch(it) && venueMatch(it));

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
  }

  setToday() {
    const now = new Date();
    // zero out time for clearer comparisons
    this.selectedDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  // No global click listener needed for inline expansion

  logout() {
    this.auth.logout();
    this.router.navigate(['/auth']);
  }
}
