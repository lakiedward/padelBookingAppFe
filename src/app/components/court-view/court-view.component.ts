import { Component, EventEmitter, OnInit, Output, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CourtService } from '../../services/court.service';
import { CourtSummaryResponse, CourtResponse, CourtAvailabilityRuleResponse, BackendAvailabilityRuleType, CourtEquipmentResponse } from '../../models/court.models';
import { SportKey, SPORT_OPTIONS } from '../../models/club.models';
import { forkJoin } from 'rxjs';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { ConvertMoneyPipe } from '../../pipes/convert-money.pipe';

type Tone = 'green' | 'blue' | 'gray';

interface TimeSlot {
  label: string;
  note?: string;
  price?: string;
  priceValue?: number;
  currency?: string;
  tone?: Tone;
  startHHmm?: string;
  endHHmm?: string;
}

interface DaySchedule {
  day: string;
  slots: TimeSlot[];
  dateStr: string;
}

interface CourtPanelData {
  id: number;
  title: string;
  subtitle: string;
  price: string;
  priceValue?: number;
  currency?: string;
  imageUrl?: string | null;
  status?: 'Active' | 'Inactive';
  tags: string[];
  sport: string;
  availabilityRules: CourtAvailabilityRuleResponse[];
  schedules: DaySchedule[];
  equipment: CourtEquipmentResponse[];
}

@Component({
  selector: 'app-court-view',
  standalone: true,
  imports: [CommonModule, ConfirmDialogModule, ConvertMoneyPipe],
  templateUrl: './court-view.component.html',
  styleUrl: './court-view.component.scss',
  providers: [ConfirmationService]
})
export class CourtViewComponent implements OnInit {
  activeTab = signal<'courts'>('courts');

  @Output() addCourt = new EventEmitter<void>();
  @Output() editCourt = new EventEmitter<number>();
  @Output() viewBookings = new EventEmitter<number>();

  courts: CourtPanelData[] = [];
  allCourts: CourtPanelData[] = [];
  isLoading = false;
  loadError: string | null = null;
  selectedSport: SportKey | 'all' = 'all';
  availableSports: (SportKey | 'all')[] = ['all'];

  constructor(
    private courtService: CourtService,
    private cdr: ChangeDetectorRef,
    private confirmationService: ConfirmationService
  ) {}

  ngOnInit(): void {
    setTimeout(() => {
      this.loadCourts();
    }, 100);
  }

  loadCourts() {
    this.isLoading = true;
    this.loadError = null;
    this.cdr.detectChanges();
    
    this.courtService.getCourts().subscribe({
      next: (courts) => {
        
        if (courts.length === 0) {
          this.courts = [];
          this.isLoading = false;
          this.cdr.detectChanges();
          return;
        }

        const detailRequests = courts.map(court => 
          this.courtService.getCourtById(court.id)
        );

        forkJoin(detailRequests).subscribe({
          next: (detailedCourts) => {
            this.allCourts = detailedCourts.map(c => this.mapCourtToPanel(c));
            this.extractAvailableSports();
            this.filterCourts();
            this.isLoading = false;
            this.cdr.detectChanges();
          },
          error: () => {
            this.loadError = 'Failed to load court details';
            this.isLoading = false;
            this.cdr.detectChanges();
          }
        });
      },
      error: () => {
        this.loadError = 'Failed to load courts';
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  onAddCourtClick() { this.addCourt.emit(); }

  onEditCourt(courtId: number) {
    this.editCourt.emit(courtId);
  }

  onViewBookings(courtId: number) {
    this.viewBookings.emit(courtId);
  }

  onSportFilterChange() {
    this.filterCourts();
  }

  onSportButtonClick(sport: SportKey | 'all') {
    this.selectedSport = sport;
    this.filterCourts();
  }

  private extractAvailableSports() {
    const sportsSet = new Set<SportKey>();
    this.allCourts.forEach(court => {
      if (court.sport) {
        sportsSet.add(court.sport as SportKey);
      }
    });
    this.availableSports = ['all', ...Array.from(sportsSet).sort()];
  }

  private filterCourts() {
    if (this.selectedSport === 'all') {
      this.courts = this.allCourts;
    } else {
      this.courts = this.allCourts.filter(court => court.sport === this.selectedSport);
    }
  }

  onDeleteCourt(courtId: number, courtName: string) {
    this.confirmationService.confirm({
      header: 'Delete Court',
      message: `Are you sure you want to delete "${courtName}"? This action cannot be undone.`,
      icon: 'pi pi-exclamation-triangle',
      rejectLabel: 'Cancel',
      acceptLabel: 'Delete',
      acceptButtonStyleClass: 'confirm-delete-btn',
      rejectButtonStyleClass: 'confirm-cancel-btn',
      accept: () => {
        this.courtService.deleteCourt(courtId).subscribe({
          next: () => {
            this.loadCourts();
          },
          error: (err) => {
            alert('Failed to delete court: ' + (err.error?.error || err.message));
          }
        });
      }
    });
  }

  private mapCourtToPanel(court: CourtResponse): CourtPanelData {
    let imageUrl: string | null = null;
    
    if (court.photos && court.photos.length > 0) {
      const primaryPhoto = court.photos.find(p => p.isPrimary);
      if (primaryPhoto && primaryPhoto.url) {
        imageUrl = this.courtService.toAbsoluteUrl(primaryPhoto.url);
      } else {
        const firstPhoto = court.photos[0];
        if (firstPhoto && firstPhoto.url) {
          imageUrl = this.courtService.toAbsoluteUrl(firstPhoto.url);
        }
      }
    }

    const tags = Array.isArray(court.tags) ? court.tags : [];
    const subtitle = tags.length > 0 
      ? tags.join(' • ')
      : court.sport;

    const prices = court.availabilityRules.map(rule => rule.price);
    const minPrice = prices.length > 0 ? Math.min(...prices) : 0;

    const schedules = this.build7DayCalendar(court.availabilityRules);

    return {
      id: court.id,
      title: court.name,
      subtitle,
      price: minPrice > 0 ? `€${minPrice}` : 'N/A',
      priceValue: minPrice,
      currency: 'EUR',
      imageUrl,
      status: 'Active',
      tags,
      sport: court.sport,
      availabilityRules: court.availabilityRules,
      schedules,
      equipment: court.equipment || []
    };
  }

  private build7DayCalendar(rules: CourtAvailabilityRuleResponse[]): DaySchedule[] {
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const today = new Date();
    const schedules: DaySchedule[] = [];
    
    const currentDay = today.getDay();
    let mondayOffset = 0;
    
    if (currentDay === 0) {
      mondayOffset = -6;
    } else {
      mondayOffset = -(currentDay - 1);
    }
    
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);
    
    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(monday);
      currentDate.setDate(monday.getDate() + i);
      const label = `${dayNames[i]} ${String(currentDate.getDate()).padStart(2, '0')}`;
      const dateStr = this.formatDate(currentDate);
      
      const dayOfWeek = (i + 1) % 7;
      const applicableRules = this.getApplicableRules(rules, currentDate, dayOfWeek);
      
      const slots = this.generateTimeSlotsFromRules(applicableRules);
      
      schedules.push({ day: label, slots, dateStr });
    }
    
    return schedules;
  }

  private getApplicableRules(
    rules: CourtAvailabilityRuleResponse[], 
    date: Date, 
    dayOfWeek: number
  ): CourtAvailabilityRuleResponse[] {
    const dateString = this.formatDate(date);
    const applicable: CourtAvailabilityRuleResponse[] = [];
    
    for (const rule of rules) {
      if (rule.type === BackendAvailabilityRuleType.DATE && rule.date === dateString) {
        applicable.push(rule);
      } else if (rule.type === BackendAvailabilityRuleType.WEEKLY && 
                 rule.weekdays && 
                 rule.weekdays.includes(dayOfWeek)) {
        applicable.push(rule);
      }
    }
    
    return applicable;
  }

  private generateTimeSlotsFromRules(rules: CourtAvailabilityRuleResponse[]): TimeSlot[] {
    if (rules.length === 0) {
      return [];
    }

    const slotMap = new Map<string, TimeSlot>();
    const tones: Tone[] = ['green', 'blue', 'gray'];
    let toneIndex = 0;

    for (const rule of rules) {
      const key = `${rule.startTime}-${rule.endTime}-${rule.price}`;
      
      if (!slotMap.has(key)) {
        slotMap.set(key, {
          label: `${rule.startTime} – ${rule.endTime}`,
          note: `every ${rule.slotMinutes} min`,
          price: `€${rule.price}`,
          priceValue: rule.price,
          currency: 'EUR',
          tone: tones[toneIndex % tones.length]
          , startHHmm: rule.startTime
          , endHHmm: rule.endTime
        });
        toneIndex++;
      }
    }

    return Array.from(slotMap.values());
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  trackByIndex(index: number) { return index; }

  private hhmmToMinutes(hhmm: string): number {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
  }
}
