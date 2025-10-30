import { CommonModule } from '@angular/common';
import { Component, computed, signal, OnInit } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { BookingService } from '../../services/booking.service';
import { CourtListingCardComponent } from '../court-listing-card/court-listing-card.component';
import { Time24Pipe } from '../../pipes/time24.pipe';

type ViewMode = 'month' | 'week' | 'day';

type Reservation = {
  id: string;
  courtId: number;
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
export class CalendarPageComponent implements OnInit {
  constructor(
    private auth: AuthService,
    private router: Router,
    private bookingService: BookingService
  ) {}

  // Header/mobile
  mobileOpen = false;
  isLoading = true;

  // State
  anchor = signal(new Date()); // Start with today
  viewMode = signal<ViewMode>('month');

  // Real user reservations from backend
  reservations = signal<Reservation[]>([]);

  ngOnInit(): void {
    this.loadUserBookings();
  }

  private loadUserBookings(): void {
    console.log('[CalendarPage] Loading user bookings...');
    this.isLoading = true;
    
    this.bookingService.getMyBookings().subscribe({
      next: (bookings) => {
        console.log('[CalendarPage] Bookings received:', bookings);
        console.log('[CalendarPage] Booking details:', bookings.map(b => ({
          id: b.id,
          courtId: b.courtId,
          courtName: b.courtName,
          timeSlotId: b.timeSlotId
        })));
        
        // Transform backend BookingSummaryResponse to Reservation format
        const reservations: Reservation[] = bookings.map(booking => {
          const startDateTime = new Date(booking.startTime);
          const endDateTime = new Date(booking.endTime);
          
          console.log('[CalendarPage] Processing booking:', {
            bookingId: booking.id,
            courtId: booking.courtId,
            courtName: booking.courtName,
            imageUrl: this.getCourtImage(booking.courtId)
          });
          
          return {
            id: booking.id.toString(),
            courtId: booking.courtId,
            date: this.formatDateToKey(startDateTime),
            start: this.formatTimeToHHMM(startDateTime),
            end: this.formatTimeToHHMM(endDateTime),
            club: 'Club', // Backend doesn't return club name in booking summary
            court: booking.courtName,
            sport: this.getSportEmoji(booking.activityName),
            city: 'City' // Backend doesn't return city
          };
        });
        
        this.reservations.set(reservations);
        console.log('[CalendarPage] Reservations set:', reservations);
        this.isLoading = false;
      },
      error: (err) => {
        console.error('[CalendarPage] Error loading bookings:', err);
        this.reservations.set([]);
        this.isLoading = false;
      }
    });
  }

  private formatDateToKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  private formatTimeToHHMM(date: Date): string {
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }

  private getSportEmoji(activityName: string): string {
    const emojiMap: Record<string, string> = {
      'tennis': '🎾',
      'padel': '🏓',
      'basketball': '🏀',
      'volleyball': '🏐',
      'football': '⚽',
      'soccer': '⚽'
    };
    
    const normalized = activityName.toLowerCase();
    return emojiMap[normalized] || '🎯';
  }

  // Derived helpers
  readonly eventsByDay = computed<Record<string, string[]>>(() => {
    const m: Record<string, string[]> = {};
    for (const r of this.reservations()) {
      (m[r.date] ??= []).push(`${r.sport} ${r.court} ${r.start}`);
    }
    return m;
  });

  // UI handlers
  toggleMobile() { this.mobileOpen = !this.mobileOpen; }
  logout() { this.auth.logout(); this.router.navigate(['/auth']); }

  setView(mode: ViewMode) { 
    console.log('[CalendarPage] setView called', { mode, currentReservations: this.reservations().length });
    this.viewMode.set(mode); 
    console.log('[CalendarPage] viewMode set, uniqueCourts:', this.getUniqueCourts());
  }
  
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
    return this.reservations()
      .filter(r => r.date === key)
      .sort((a, b) => a.start.localeCompare(b.start));
  }

  getUniqueCourts(): { courtId: number; court: string; club: string; sport: string }[] {
    const unique = new Map<string, { courtId: number; court: string; club: string; sport: string }>();
    
    console.log('[CalendarPage] getUniqueCourts called', { 
      viewMode: this.viewMode(), 
      anchor: this.toDateKey(this.anchor()),
      totalReservations: this.reservations().length 
    });
    
    // Filter reservations based on current view mode
    const filteredReservations = this.viewMode() === 'day' 
      ? this.reservations().filter(r => r.date === this.toDateKey(this.anchor()))
      : this.reservations();
    
    console.log('[CalendarPage] filteredReservations:', filteredReservations.length, filteredReservations);
    
    filteredReservations.forEach(r => {
      const key = `${r.court}-${r.club}`;
      if (!unique.has(key)) {
        unique.set(key, { courtId: r.courtId, court: r.court, club: r.club, sport: r.sport });
      }
    });
    
    const result = Array.from(unique.values());
    console.log('[CalendarPage] uniqueCourts result:', result);
    return result;
  }

  getReservationsForCourt(courtName: string): Reservation[] {
    let filteredReservations = this.reservations().filter(r => r.court === courtName);
    
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
  // Note: Backend BookingSummaryResponse now includes courtId
  getCourtImage(courtId: number): string {
    // Use the new endpoint that accepts courtId and returns primary photo
    // GET /api/public/courts/{courtId}/photo
    const baseUrl = 'https://padelbookingappbe-production.up.railway.app';
    return `${baseUrl}/api/public/courts/${courtId}/photo`;
  }

  getCourtLocation(courtName: string): string {
    // Generic location since backend doesn't provide club address in booking summary
    return 'Sports Complex';
  }

  getCourtPrice(courtName: string): string {
    // Price info not available in calendar view - would need to fetch court details
    return '—';
  }

  getCourtTags(courtName: string): string[] {
    // Tags not available in booking summary
    return [];
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

