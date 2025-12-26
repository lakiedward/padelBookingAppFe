import { Component, OnInit, signal, computed, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { PublicService } from '../../services/public.service';
import { CourtService } from '../../services/court.service';
import { ClubDetails, SportKey } from '../../models/club.models';
import { CourtListingCardComponent } from '../court-listing-card/court-listing-card.component';
import { forkJoin } from 'rxjs';
import { Time24Pipe } from '../../pipes/time24.pipe';
import { normalizeSportName } from '../../utils/normalize-sport-name.util';

interface CourtListingData {
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
  sport: SportKey;
  fullSlots: any[];
}

@Component({
  selector: 'app-club-detail-page',
  standalone: true,
  imports: [CommonModule, CourtListingCardComponent],
  templateUrl: './club-detail-page.html',
  styleUrls: ['./club-detail-page.scss']
})
export class ClubDetailPageComponent implements OnInit {
  club = signal<ClubDetails | null>(null);
  isLoading = signal(true);
  loadError = signal<string | null>(null);

  activeCourtFilter = signal<'all' | SportKey>('all');
  realCourts = signal<CourtListingData[]>([]);
  isLoadingCourts = signal(false);
  courtsLoadError = signal<string | null>(null);

  private time24Pipe = new Time24Pipe();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private publicService: PublicService,
    private courtService: CourtService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    const clubId = this.route.snapshot.paramMap.get('id');
    if (clubId) {
      this.loadClubDetails(Number(clubId));
    } else {
      this.loadError.set('Invalid club ID');
      this.isLoading.set(false);
    }
  }

  private loadClubDetails(clubId: number) {
    this.isLoading.set(true);
    this.loadError.set(null);

    this.publicService.getPublicClubById(clubId).subscribe({
      next: (club) => {
        this.club.set(club);
        this.isLoading.set(false);
        this.loadRealCourts();
      },
      error: (err) => {
        console.error('Failed to load club details:', err);
        this.loadError.set('Failed to load club details');
        this.isLoading.set(false);
      }
    });
  }

  private loadRealCourts(): void {
    const clubId = this.club()?.id;
    if (!clubId) {
      this.isLoadingCourts.set(false);
      return;
    }

    this.isLoadingCourts.set(true);
    this.courtsLoadError.set(null);
    
    this.publicService.getPublicCourtsByClubId(clubId).subscribe({
      next: (courts) => {
        
        if (courts.length === 0) {
          this.realCourts.set([]);
          this.isLoadingCourts.set(false);
          return;
        }
        
        const mappedCourts = courts.map(c => this.mapCourtSummaryToCourt(c));
        this.realCourts.set(mappedCourts);
        
        mappedCourts.forEach((court, index) => {
          this.loadAvailabilityFor(index, court.courtId);
        });
        
        this.isLoadingCourts.set(false);
      },
      error: () => {
        this.courtsLoadError.set('Failed to load courts');
        this.isLoadingCourts.set(false);
        this.realCourts.set([]);
      }
    });
  }

  private mapCourtSummaryToCourt(c: any): CourtListingData {
    return {
      courtId: c.id,
      image: this.courtService.toAbsoluteUrl(c.primaryPhotoUrl) || 'https://placehold.co/1200x800?text=Court',
      emoji: normalizeSportName(c.sport),
      title: c.name,
      club: this.club()?.name || '',
      location: this.club()?.locations?.[0]?.address || '',
      price: '',
      tags: c.tags || [],
      availableDate: '',
      slots: [],
      sport: (c.sport || 'tennis') as SportKey,
      fullSlots: []
    };
  }

  trackByIndex(index: number): number {
    return index;
  }

  goBack() {
    this.router.navigate(['/clubs']);
  }

  setCourtFilter(filter: 'all' | SportKey) {
    this.activeCourtFilter.set(filter);
  }

  getUniqueSportsFromCourts(): SportKey[] {
    const courts = this.realCourts();
    const sportsSet = new Set<SportKey>();
    courts.forEach(c => {
      if (c.sport) sportsSet.add(c.sport);
    });
    return Array.from(sportsSet);
  }

  courtsBySport(s: SportKey | 'all'): CourtListingData[] {
    const all = this.realCourts();
    if (s === 'all') return all;
    return all.filter(c => c.sport === s);
  }

  onCourtCardClick(court: CourtListingData) {
    this.router.navigate(['/court', court.courtId]);
  }

  getClubProfileImageUrl(): string | null {
    const clubId = this.club()?.id;
    return clubId ? this.publicService.getClubProfileImageUrl(clubId) : null;
  }

  getClubWallpaperImageUrl(): string | null {
    const clubId = this.club()?.id;
    return clubId ? this.publicService.getClubWallpaperImageUrl(clubId) : null;
  }

  private loadAvailabilityFor(index: number, courtId: number) {
    const targetDate = new Date();
    const dateStr = this.formatDateForInput(targetDate);
    
    this.publicService.getAllTimeSlotsByCourtAndDate(courtId, dateStr).subscribe({
      next: (response) => {
        const slots = response?.items || [];
        
        if (!Array.isArray(slots) || slots.length === 0) {
          const courts = this.realCourts();
          courts[index] = {
            ...courts[index],
            availableDate: dateStr,
            slots: ['No slots available']
          };
          this.realCourts.set([...courts]);
          this.cdr.detectChanges();
          return;
        }
        
        const sorted = slots.slice().sort((a, b) => a.startTime.localeCompare(b.startTime));
        
        const intervals = sorted.map(s => ({
          start: s.startTime.substring(11, 16),
          end: s.endTime.substring(11, 16),
          available: s.available
        }));
        
        const availableIntervals = intervals.filter(i => i.available !== false);
        
        const chips: string[] = availableIntervals.length > 0 
          ? this.toChipLabels(availableIntervals.map(i => i.start))
          : ['No slots available'];
        
        const courts = this.realCourts();
        courts[index] = {
          ...courts[index],
          availableDate: dateStr,
          slots: chips
        };
        this.realCourts.set([...courts]);
        this.cdr.detectChanges();
      },
      error: () => {
        const courts = this.realCourts();
        courts[index] = {
          ...courts[index],
          availableDate: dateStr,
          slots: ['No slots available']
        };
        this.realCourts.set([...courts]);
        this.cdr.detectChanges();
      }
    });
  }

  private formatDateForInput(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private toChipLabels(allTimes: string[]): string[] {
    if (allTimes.length <= 3) {
      return [...allTimes];
    }
    const first3 = allTimes.slice(0, 3);
    const remaining = allTimes.length - 3;
    return [...first3, `+${remaining} more`];
  }
}
