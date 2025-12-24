import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { PublicService } from '../../services/public.service';
import { ClubDetails, SportKey, SPORT_OPTIONS } from '../../models/club.models';
import { AppHeaderComponent } from '../shared/app-header/app-header.component';

@Component({
  selector: 'app-clubs-page',
  standalone: true,
  imports: [CommonModule, AppHeaderComponent, RouterLink, FormsModule, SelectModule],
  templateUrl: './clubs-page.html',
  styleUrl: './clubs-page.scss'
})
export class ClubsPage implements OnInit {
  clubs = signal<ClubDetails[]>([]);
  filteredClubs = signal<ClubDetails[]>([]);
  isLoading = signal(true);
  loadError = signal<string | null>(null);
  
  selectedSport = signal<SportKey | 'all'>('all');
  selectedLocation: string = 'all';
  selectedClubName: string = 'all';
  selectedClubType = signal<string>('all');
  searchQuery = signal('');
  filtersExpanded = signal(false);
  
  sportOptions: (SportKey | 'all')[] = ['all', ...SPORT_OPTIONS];
  locationOptions: { label: string; value: string }[] = [{ label: 'All locations', value: 'all' }];
  clubNameOptions: { label: string; value: string }[] = [{ label: 'All clubs', value: 'all' }];
  private allClubNameOptions: { label: string; value: string }[] = [];
  private clubToLocationMap = new Map<string, string>();
  clubTypeOptions: string[] = ['all', 'public', 'private', 'semi-private'];

  constructor(
    private publicService: PublicService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadClubs();
  }

  private loadClubs(): void {
    this.isLoading.set(true);
    this.loadError.set(null);

    this.publicService.getPublicClubs().subscribe({
      next: (clubs) => {
        this.clubs.set(clubs);
        this.extractLocationOptions(clubs);
        this.applyFilters();
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load clubs:', err);
        this.loadError.set('Failed to load clubs. Please try again later.');
        this.isLoading.set(false);
      }
    });
  }

  private extractLocationOptions(clubs: ClubDetails[]): void {
    const locationMap = new Map<string, string>();
    const clubNames = new Set<string>();

    clubs.forEach(club => {
      if (club.name) {
        clubNames.add(club.name);
      }

      club.locations.forEach(loc => {
        const formatted = this.formatLocation(loc.address);
        if (formatted) {
          locationMap.set(formatted, formatted);
          
          if (club.name) {
            this.clubToLocationMap.set(club.name, formatted);
          }
        }
      });
    });

    this.locationOptions = [
      { label: 'All locations', value: 'all' },
      ...Array.from(locationMap.keys()).sort().map(formatted => ({
        label: formatted,
        value: formatted
      }))
    ];

    this.allClubNameOptions = [
      { label: 'All clubs', value: 'all' },
      ...Array.from(clubNames).sort().map(name => ({
        label: name,
        value: name
      }))
    ];
    this.clubNameOptions = [...this.allClubNameOptions];
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

  onSportFilter(sport: SportKey | 'all'): void {
    this.selectedSport.set(sport);
    this.applyFilters();
  }

  onLocationChange(): void {
    if (this.selectedLocation === 'all') {
      this.clubNameOptions = [...this.allClubNameOptions];
    } else {
      this.clubNameOptions = [
        { label: 'All clubs', value: 'all' },
        ...this.allClubNameOptions
          .filter(opt => opt.value !== 'all')
          .filter(opt => this.clubToLocationMap.get(opt.value) === this.selectedLocation)
      ];
    }
    this.selectedClubName = 'all';
    this.applyFilters();
  }

  onClubNameChange(): void {
    this.applyFilters();
  }

  onClubTypeFilter(type: string): void {
    this.selectedClubType.set(type);
    this.applyFilters();
  }

  onSearchChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value.toLowerCase());
    this.applyFilters();
  }

  private applyFilters(): void {
    let filtered = this.clubs();

    if (this.selectedSport() !== 'all') {
      filtered = filtered.filter(club => 
        club.sports.includes(this.selectedSport() as SportKey)
      );
    }

    if (this.selectedLocation !== 'all') {
      filtered = filtered.filter(club =>
        club.locations.some(loc => {
          const formatted = this.formatLocation(loc.address);
          return formatted === this.selectedLocation;
        })
      );
    }

    if (this.selectedClubName !== 'all') {
      filtered = filtered.filter(club => club.name === this.selectedClubName);
    }

    if (this.selectedClubType() !== 'all') {
      const type = this.selectedClubType();
      filtered = filtered.filter(club => {
        const sportCount = club.sports.length;
        if (type === 'public') return sportCount >= 4;
        if (type === 'private') return sportCount === 1;
        if (type === 'semi-private') return sportCount >= 2 && sportCount <= 3;
        return true;
      });
    }

    const query = this.searchQuery();
    if (query) {
      filtered = filtered.filter(club =>
        club.name.toLowerCase().includes(query) ||
        club.email.toLowerCase().includes(query) ||
        (club.description && club.description.toLowerCase().includes(query)) ||
        club.locations.some(loc => loc.address.toLowerCase().includes(query))
      );
    }

    this.filteredClubs.set(filtered);
  }

  onClubClick(clubId: string): void {
    this.router.navigate(['/clubs', clubId]);
  }

  trackByClubId(index: number, club: ClubDetails): string {
    return club.id || index.toString();
  }

  trackBySport(index: number, sport: SportKey | 'all'): string {
    return sport;
  }

  getSportLabel(sport: SportKey | 'all'): string {
    if (sport === 'all') return 'All Sports';
    return sport.charAt(0).toUpperCase() + sport.slice(1);
  }

  getLocationLabel(location: string): string {
    if (location === 'all') return 'All Locations';
    return location;
  }

  getClubTypeLabel(type: string): string {
    if (type === 'all') return 'All Types';
    return type.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }

  toggleFilters(): void {
    this.filtersExpanded.set(!this.filtersExpanded());
  }

  getActiveFilterCount(): number {
    let count = 0;
    if (this.selectedSport() !== 'all') count++;
    if (this.selectedLocation !== 'all') count++;
    if (this.selectedClubName !== 'all') count++;
    if (this.selectedClubType() !== 'all') count++;
    return count;
  }

  clearAllFilters(): void {
    this.selectedSport.set('all');
    this.selectedLocation = 'all';
    this.selectedClubName = 'all';
    this.selectedClubType.set('all');
    this.clubNameOptions = [...this.allClubNameOptions];
    this.applyFilters();
  }
}
