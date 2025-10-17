import { Component, EventEmitter, OnInit, Output, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CourtService } from '../../services/court.service';
import { CourtSummaryResponse } from '../../models/court.models';

type Tone = 'green' | 'blue' | 'gray';

interface TimeSlot {
  label: string;
  note?: string;
  price?: string;
  tone?: Tone;
}

interface DaySchedule {
  day: string; // e.g., "Mon 08"
  slots: TimeSlot[];
}

interface CourtPanelData {
  id: number;
  title: string;
  subtitle: string;
  price: string;
  imageUrl?: string | null;
  status?: 'Active' | 'Inactive';
  tags: string[];
  sport: string;
}

@Component({
  selector: 'app-court-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './court-view.component.html',
  styleUrl: './court-view.component.scss'
})
export class CourtViewComponent implements OnInit {
  activeTab = signal<'courts'>('courts');

  @Output() addCourt = new EventEmitter<void>();
  @Output() editCourt = new EventEmitter<number>();

  courts: CourtPanelData[] = [];
  isLoading = false;
  loadError: string | null = null;

  days: DaySchedule[] = [];

  constructor(
    private courtService: CourtService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.days = this.build7DayCalendar();
    // Load courts after a brief delay to ensure component is fully mounted
    // This fixes the "need to click twice" issue with *ngIf mounting/unmounting
    setTimeout(() => {
      console.log('[CourtView] ngOnInit - Loading courts after delay');
      this.loadCourts();
    }, 100);
  }

  loadCourts() {
    console.log('[CourtView] loadCourts() called');
    this.isLoading = true;
    this.loadError = null;
    this.cdr.detectChanges(); // Force detection for loading state
    
    this.courtService.getCourts().subscribe({
      next: (courts) => {
        console.log('[CourtView] Courts loaded:', courts);
        this.courts = courts.map(c => this.mapCourtToPanel(c));
        this.isLoading = false;
        console.log('[CourtView] Courts array length:', this.courts.length);
        this.cdr.detectChanges(); // Force detection after data is loaded
      },
      error: (err) => {
        console.error('[CourtView] Failed to load courts:', err);
        this.loadError = 'Failed to load courts';
        this.isLoading = false;
        this.cdr.detectChanges(); // Force detection for error state
      }
    });
  }

  onAddCourtClick() { this.addCourt.emit(); }

  onEditCourt(courtId: number) {
    // Emit event with court ID for parent to handle
    this.editCourt.emit(courtId);
  }

  onDeleteCourt(courtId: number, courtName: string) {
    if (!confirm(`Are you sure you want to delete "${courtName}"?`)) {
      return;
    }

    this.courtService.deleteCourt(courtId).subscribe({
      next: () => {
        console.log('Court deleted successfully');
        this.loadCourts(); // Refresh the list
      },
      error: (err) => {
        console.error('Failed to delete court:', err);
        alert('Failed to delete court: ' + (err.error?.error || err.message));
      }
    });
  }

  private mapCourtToPanel(court: CourtSummaryResponse): CourtPanelData {
    // TODO: Load photos properly through HttpClient with Authorization
    // For now, don't load images to avoid 403 errors
    const imageUrl = null;

    // Build subtitle from tags
    const tags = Array.isArray(court.tags) ? court.tags : [];
    const subtitle = tags.length > 0 
      ? tags.join(' • ')
      : court.sport;

    return {
      id: court.id,
      title: court.name,
      subtitle,
      price: '€50', // TODO: Get actual price from availability rules
      imageUrl,
      status: 'Active',
      tags,
      sport: court.sport
    };
  }

  private build7DayCalendar(): DaySchedule[] {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();
    const schedules: DaySchedule[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const label = `${dayNames[d.getDay()]} ${String(d.getDate()).padStart(2, '0')}`;
      const slots: TimeSlot[] = (i === 1 || i === 2 || i === 3 || i === 4 || i === 5)
        ? [
            { label: '08:00 – 10:00', note: 'every 60 min', price: '€50', tone: 'green' },
            { label: '10:00 – 22:00', note: 'every 60 min', price: '€50', tone: 'blue' },
          ]
        : [];
      schedules.push({ day: label, slots });
    }
    return schedules;
  }

  trackByIndex(index: number) { return index; }
}
