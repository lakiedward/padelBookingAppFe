import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CourtListingCardComponent } from '../court-listing-card/court-listing-card.component';
import { Time24Pipe } from '../../pipes/time24.pipe';

type ViewMode = 'month' | 'week' | 'day';

type Reservation = {
  id: string;
  date: string;   // YYYY-MM-DD
  start: string;  // HH:MM
  end: string;    // HH:MM
  club: string;
  court: string;
  sport: string;  // emoji or short
  city?: string;
};

@Component({
  selector: 'app-calendar-page',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, CourtListingCardComponent, Time24Pipe],
  templateUrl: './calendar-page.component.html',
  styleUrl: './calendar-page.component.scss'
})
export class CalendarPageComponent {
  constructor(private auth: AuthService, private router: Router) {}

  // Header/mobile
  mobileOpen = false;

  // State
  anchor = signal(new Date(2025, 9, 1)); // 1 Oct 2025 (demo)
  viewMode = signal<ViewMode>('month');

  // Demo reservations
  readonly reservations: Reservation[] = [
    { id: 'r1', date: '2025-10-01', start: '08:00', end: '09:00', club: 'Elite Tennis Club', court: 'Elite Tennis Court 1', sport: '🎾', city: 'Downtown' },
    { id: 'r2', date: '2025-10-01', start: '18:00', end: '19:30', club: 'Elite Tennis Club', court: 'Elite Tennis Court 1', sport: '🎾', city: 'Downtown' },
    { id: 'r3', date: '2025-10-03', start: '10:00', end: '11:00', club: 'Padel Pro Center', court: 'Padel Court 1', sport: '🏓', city: 'North District' },
    { id: 'r4', date: '2025-10-05', start: '19:00', end: '20:00', club: 'Elite Sports Center', court: 'Basketball Court 1', sport: '🏀', city: 'Downtown' },
    { id: 'r5', date: '2025-10-07', start: '09:00', end: '10:00', club: 'Elite Tennis Club', court: 'Elite Tennis Court 2', sport: '🎾', city: 'Downtown' },
    { id: 'r6', date: '2025-10-12', start: '17:00', end: '18:00', club: 'Padel Pro Center', court: 'Padel Court 1', sport: '🏓', city: 'North District' },
    { id: 'r7', date: '2025-10-24', start: '07:30', end: '08:30', club: 'Elite Sports Center', court: 'Basketball Court 1', sport: '🏀', city: 'Downtown' },
  ];

  // Derived helpers
  readonly eventsByDay = computed<Record<string, string[]>>(() => {
    const m: Record<string, string[]> = {};
    for (const r of this.reservations) {
      (m[r.date] ??= []).push(`${r.sport} ${r.court} ${r.start}`);
    }
    return m;
  });

  // UI handlers
  toggleMobile() { this.mobileOpen = !this.mobileOpen; }
  logout() { this.auth.logout(); this.router.navigate(['/auth']); }

  setView(mode: ViewMode) { this.viewMode.set(mode); }
  
  onDayClick(date: Date) {
    this.anchor.set(date);
    this.viewMode.set('day');
  }
  goPrev() {
    const a = this.anchor();
    const mode = this.viewMode();
    this.anchor.set(mode === 'month'
      ? new Date(a.getFullYear(), a.getMonth() - 1, 1)
      : mode === 'week'
      ? this.addDays(a, -7)
      : this.addDays(a, -1)
    );
  }
  goNext() {
    const a = this.anchor();
    const mode = this.viewMode();
    this.anchor.set(mode === 'month'
      ? new Date(a.getFullYear(), a.getMonth() + 1, 1)
      : mode === 'week'
      ? this.addDays(a, +7)
      : this.addDays(a, +1)
    );
  }
  goToday() {
    const t = new Date();
    this.anchor.set(new Date(t.getFullYear(), t.getMonth(), t.getDate()));
  }

  // Headline
  readonly headline = computed(() => {
    const a = this.anchor();
    const mode = this.viewMode();
    return mode === 'month'
      ? this.niceMonthYear(this.startOfMonth(a))
      : mode === 'week'
      ? this.weekRangeLabel(a)
      : this.niceDayLong(a);
  });

  // Month grid
  readonly monthMatrix = computed(() => {
    const a = this.anchor();
    return this.buildCalendarMatrix(a.getFullYear(), a.getMonth());
  });

  // Weeks in month
  getWeeksInMonth(): { date: Date; inCurrent: boolean }[][] {
    const matrix = this.monthMatrix();
    const weeks: { date: Date; inCurrent: boolean }[][] = [];
    
    for (let i = 0; i < matrix.length; i += 7) {
      weeks.push(matrix.slice(i, i + 7));
    }
    
    return weeks;
  }

  formatWeekRange(week: { date: Date; inCurrent: boolean }[]): string {
    const firstDay = week[0].date;
    const lastDay = week[6].date;
    
    const firstMonth = firstDay.toLocaleDateString('en-US', { month: 'short' });
    const lastMonth = lastDay.toLocaleDateString('en-US', { month: 'short' });
    
    if (firstMonth === lastMonth) {
      return `${firstMonth} ${firstDay.getDate()}-${lastDay.getDate()}`;
    } else {
      return `${firstMonth} ${firstDay.getDate()} - ${lastMonth} ${lastDay.getDate()}`;
    }
  }

  // Week/day derived
  readonly weekDays = computed(() => {
    const start = this.startOfWeekMon(this.anchor());
    return Array.from({ length: 7 }, (_, i) => this.addDays(start, i));
  });

  reservationsByDay(date: Date): Reservation[] {
    const key = this.toDateKey(date);
    return this.reservations
      .filter(r => r.date === key)
      .sort((a, b) => a.start.localeCompare(b.start));
  }

  getUniqueCourts(): { court: string; club: string; sport: string }[] {
    const unique = new Map<string, { court: string; club: string; sport: string }>();
    
    // Filter reservations based on current view mode
    const filteredReservations = this.viewMode() === 'day' 
      ? this.reservations.filter(r => r.date === this.toDateKey(this.anchor()))
      : this.reservations;
    
    filteredReservations.forEach(r => {
      const key = `${r.court}-${r.club}`;
      if (!unique.has(key)) {
        unique.set(key, { court: r.court, club: r.club, sport: r.sport });
      }
    });
    return Array.from(unique.values());
  }

  getReservationsForCourt(courtName: string): Reservation[] {
    let filteredReservations = this.reservations.filter(r => r.court === courtName);
    
    // In day view, only show reservations for the selected day
    if (this.viewMode() === 'day') {
      filteredReservations = filteredReservations.filter(r => r.date === this.toDateKey(this.anchor()));
    }
    
    return filteredReservations.sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start));
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      weekday: 'short'
    });
  }

  // Court data methods for court cards
  getCourtImage(courtName: string): string {
    const courtImages: Record<string, string> = {
      'Elite Tennis Court 1': 'https://images.unsplash.com/photo-1512163143273-bde0e3cc740e?q=80&w=1200&auto=format&fit=crop',
      'Elite Tennis Court 2': 'https://images.unsplash.com/photo-1500835556837-99ac94a94552?q=80&w=1200&auto=format&fit=crop',
      'Padel Court 1': 'https://images.unsplash.com/photo-1593111776706-b6400dd9fec4?q=80&w=1200&auto=format&fit=crop',
      'Basketball Court 1': 'https://images.unsplash.com/photo-1599050751798-13b6ce8ce1b7?q=80&w=1200&auto=format&fit=crop'
    };
    return courtImages[courtName] || 'https://images.unsplash.com/photo-1512163143273-bde0e3cc740e?q=80&w=1200&auto=format&fit=crop';
  }

  getCourtLocation(courtName: string): string {
    const courtLocations: Record<string, string> = {
      'Elite Tennis Court 1': 'Downtown Sports Complex',
      'Elite Tennis Court 2': 'Downtown Sports Complex',
      'Padel Court 1': 'North District',
      'Basketball Court 1': 'Downtown Sports Complex'
    };
    return courtLocations[courtName] || 'Sports Complex';
  }

  getCourtPrice(courtName: string): string {
    const courtPrices: Record<string, string> = {
      'Elite Tennis Court 1': '$50',
      'Elite Tennis Court 2': '$45',
      'Padel Court 1': '$35',
      'Basketball Court 1': '$40'
    };
    return courtPrices[courtName] || '$40';
  }

  getCourtTags(courtName: string): string[] {
    const courtTags: Record<string, string[]> = {
      'Elite Tennis Court 1': ['Indoor', 'Hard Court'],
      'Elite Tennis Court 2': ['Outdoor', 'Clay'],
      'Padel Court 1': ['Indoor', 'Artificial Turf'],
      'Basketball Court 1': ['Indoor', 'Synthetic']
    };
    return courtTags[courtName] || ['Indoor'];
  }

  getNextAvailableDate(courtName: string): string {
    const reservations = this.getReservationsForCourt(courtName);
    if (reservations.length === 0) return '';
    
    // Find the next available date after the last reservation
    const lastReservation = reservations[reservations.length - 1];
    const lastDate = new Date(lastReservation.date);
    const nextDate = new Date(lastDate);
    nextDate.setDate(nextDate.getDate() + 1);
    
    return nextDate.toISOString().split('T')[0];
  }

  getCourtSlots(courtName: string): string[] {
    const reservations = this.getReservationsForCourt(courtName);
    if (reservations.length === 0) return ['6:00 AM', '7:00 AM', '9:00 AM', '+6 more'];
    
    // Return some sample slots for demo
    return ['6:00 AM', '7:00 AM', '9:00 AM', '+6 more'];
  }

  // ===================
  // Date helpers
  // ===================
  readonly WD_LABELS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  weekdayShort(d: Date) { return this.WD_LABELS[d.getDay()]; }
  toDateKey(d: Date) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  // Check if date is today
  isToday(date: Date): boolean {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  }
  addDays(date: Date, n: number) { const d = new Date(date); d.setDate(d.getDate() + n); return d; }
  startOfWeekMon(date: Date) { const d = new Date(date.getFullYear(), date.getMonth(), date.getDate()); const dow = d.getDay(); const offset = (dow + 6) % 7; return this.addDays(d, -offset); }
  endOfWeekMon(date: Date) { return this.addDays(this.startOfWeekMon(date), 6); }
  startOfMonth(date: Date) { return new Date(date.getFullYear(), date.getMonth(), 1); }
  niceMonthYear(d: Date) { return d.toLocaleString('en-US', { month: 'long', year: 'numeric' }); }
  niceDayLong(d: Date) { return d.toLocaleString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); }
  weekRangeLabel(d: Date) {
    const a = this.startOfWeekMon(d); const b = this.endOfWeekMon(d);
    const sameMonth = a.getMonth() === b.getMonth();
    const mA = a.toLocaleString('en-US', { month: 'short' });
    const mB = b.toLocaleString('en-US', { month: 'short' });
    return sameMonth ? `${mA} ${a.getDate()}–${b.getDate()}, ${b.getFullYear()}` : `${mA} ${a.getDate()} – ${mB} ${b.getDate()}, ${b.getFullYear()}`;
  }
  buildCalendarMatrix(year: number, month0: number) {
    const first = new Date(year, month0, 1);
    const daysInMonth = new Date(year, month0 + 1, 0).getDate();
    const daysInPrev = new Date(year, month0, 0).getDate();
    const mondayIndex = (first.getDay() + 6) % 7;
    const cells: { date: Date; inCurrent: boolean }[] = [];
    for (let i = mondayIndex - 1; i >= 0; i--) cells.push({ date: new Date(year, month0 - 1, daysInPrev - i), inCurrent: false });
    for (let d = 1; d <= daysInMonth; d++) cells.push({ date: new Date(year, month0, d), inCurrent: true });
    while (cells.length < 42) { const nextIndex = cells.length - (mondayIndex + daysInMonth) + 1; cells.push({ date: new Date(year, month0 + 1, nextIndex), inCurrent: false }); }
    return cells;
  }
}

