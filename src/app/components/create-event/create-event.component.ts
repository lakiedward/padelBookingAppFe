import { Component, EventEmitter, Input, OnInit, Output, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { EventService } from '../../services/event.service';
import { CourtService } from '../../services/court.service';
import { ClubService } from '../../services/club.service';
import {
  CreateEventRequest,
  UpdateEventRequest,
  EventStatus,
  ParticipationType,
  getStatusDisplayName
} from '../../models/event.models';
import { SportKey } from '../../models/club.models';
import { CourtSummaryResponse } from '../../models/court.models';

interface SportOption {
  label: string;
  value: SportKey;
}

interface StatusOption {
  label: string;
  value: EventStatus;
}

interface CourtOption {
  label: string;
  value: number;
  sport: string;
}

@Component({
  selector: 'app-create-event',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SelectModule, DatePickerModule],
  templateUrl: './create-event.component.html',
  styleUrl: './create-event.component.scss'
})
export class CreateEventComponent implements OnInit, OnChanges {
  @Input() eventId?: number;
  @Output() saved = new EventEmitter<any>();
  @Output() cancelled = new EventEmitter<void>();

  form: FormGroup;
  isLoading = false;
  saveError: string | null = null;

  coverImageFile: File | null = null;
  coverImagePreview: string | null = null;

  sportOptions: SportOption[] = [];

  statusOptions: StatusOption[] = [
    { label: getStatusDisplayName(EventStatus.DRAFT), value: EventStatus.DRAFT },
    { label: getStatusDisplayName(EventStatus.PUBLISHED), value: EventStatus.PUBLISHED },
    { label: getStatusDisplayName(EventStatus.ONGOING), value: EventStatus.ONGOING },
    { label: getStatusDisplayName(EventStatus.COMPLETED), value: EventStatus.COMPLETED },
    { label: getStatusDisplayName(EventStatus.CANCELLED), value: EventStatus.CANCELLED }
  ];

  allCourts: CourtSummaryResponse[] = [];
  filteredCourtOptions: CourtOption[] = [];
  selectedCourtIds: number[] = [];

  constructor(
    private fb: FormBuilder,
    private eventService: EventService,
    private courtService: CourtService,
    private clubService: ClubService
  ) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(200)]],
      description: [''],
      sport: new FormControl<SportKey | ''>('', { nonNullable: true, validators: [Validators.required] }),
      format: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(100)]],
      startDate: [null, Validators.required],
      endDate: [null, Validators.required],
      registrationDeadline: [null],
      participationType: ['INDIVIDUAL'],
      numberOfTeams: [null, [Validators.min(1), Validators.max(100)]],
      playersPerTeam: [null, [Validators.min(1), Validators.max(20)]],
      maxParticipants: [null, [Validators.min(2), Validators.max(1000)]],
      price: [null, [Validators.min(0), Validators.max(99999.99)]],
      status: new FormControl<EventStatus>(EventStatus.DRAFT, { nonNullable: true })
    });
  }

  ngOnInit(): void {
    this.loadClubSports();
    this.loadCourts();
    this.setupSportWatcher();

    if (this.eventId) {
      this.loadEvent();
    }
  }

  loadClubSports() {
    this.clubService.getMyClub().subscribe({
      next: (club) => {
        this.sportOptions = (club.sports || []).map(sport => ({
          label: this.formatSportLabel(sport),
          value: sport
        }));
      },
      error: (err) => {
        console.error('Failed to load club sports:', err);
      }
    });
  }

  private formatSportLabel(sport: SportKey): string {
    const labels: Record<string, string> = {
      'tennis': 'Tennis',
      'padel': 'Padel',
      'football': 'Football',
      'basketball': 'Basketball',
      'volleyball': 'Volleyball',
      'badminton': 'Badminton',
      'squash': 'Squash',
      'pingpong': 'Ping Pong',
      'handball': 'Handball'
    };
    return labels[sport] || sport.charAt(0).toUpperCase() + sport.slice(1);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['eventId'] && !changes['eventId'].firstChange) {
      if (this.eventId) {
        this.loadEvent();
      } else {
        this.resetForm();
      }
    }
  }

  loadCourts() {
    this.courtService.getCourts().subscribe({
      next: (courts) => {
        this.allCourts = courts;
        this.updateFilteredCourts();
      },
      error: (err) => {
        console.error('Failed to load courts:', err);
      }
    });
  }

  setupSportWatcher() {
    this.form.get('sport')?.valueChanges.subscribe((sport: SportKey | '') => {
      if (sport) {
        this.updateFilteredCourts();

        this.selectedCourtIds = this.selectedCourtIds.filter(courtId => {
          const court = this.allCourts.find(c => c.id === courtId);
          return court && court.sport.toLowerCase() === sport.toLowerCase();
        });
      } else {
        this.filteredCourtOptions = [];
      }
    });
  }

  updateFilteredCourts() {
    const selectedSport = this.form.get('sport')?.value;
    if (!selectedSport) {
      this.filteredCourtOptions = [];
      return;
    }

    this.filteredCourtOptions = this.allCourts
      .filter(court => court.sport.toLowerCase() === selectedSport.toLowerCase())
      .map(court => ({
        label: court.name,
        value: court.id,
        sport: court.sport
      }));
  }

  loadEvent() {
    if (!this.eventId) return;

    this.isLoading = true;
    this.eventService.getEventById(this.eventId).subscribe({
      next: (event) => {
        this.form.patchValue({
          name: event.name,
          description: event.description,
          sport: event.sportKey as SportKey,
          format: event.format,
          startDate: new Date(event.startDate),
          endDate: new Date(event.endDate),
          registrationDeadline: event.registrationDeadline ? new Date(event.registrationDeadline) : null,
          participationType: event.participationType || 'INDIVIDUAL',
          numberOfTeams: event.numberOfTeams,
          playersPerTeam: event.playersPerTeam,
          maxParticipants: event.maxParticipants,
          price: event.price,
          status: event.status as EventStatus
        });

        this.selectedCourtIds = event.courts.map(c => c.id);

        if (event.coverImageUrl) {
          this.coverImagePreview = this.eventService.toAbsoluteUrl(event.coverImageUrl);
        }

        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load event:', err);
        this.saveError = 'Failed to load event details';
        this.isLoading = false;
      }
    });
  }

  onCoverImageChange(event: any) {
    const file = event.target.files?.[0];
    if (file) {
      this.coverImageFile = file;

      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.coverImagePreview = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  removeCoverImage() {
    this.coverImageFile = null;
    this.coverImagePreview = null;
  }

  toggleCourtSelection(courtId: number) {
    const index = this.selectedCourtIds.indexOf(courtId);
    if (index > -1) {
      this.selectedCourtIds.splice(index, 1);
    } else {
      this.selectedCourtIds.push(courtId);
    }
  }

  isCourtSelected(courtId: number): boolean {
    return this.selectedCourtIds.includes(courtId);
  }

  onSave() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.saveError = 'Please fill in all required fields correctly';
      return;
    }

    if (this.selectedCourtIds.length === 0) {
      this.saveError = 'Please select at least one court';
      return;
    }

    this.isLoading = true;
    this.saveError = null;

    const formValue = this.form.value;

    // Calculate maxParticipants based on participation type
    let maxParticipants: number | null = null;
    if (formValue.participationType === 'TEAM') {
      const teams = formValue.numberOfTeams || 0;
      const playersPerTeam = formValue.playersPerTeam || 0;
      maxParticipants = teams * playersPerTeam;
    } else {
      maxParticipants = formValue.maxParticipants || null;
    }

    const details: CreateEventRequest | UpdateEventRequest = {
      name: formValue.name,
      description: formValue.description || null,
      sportKey: formValue.sport,
      format: formValue.format,
      startDate: this.formatDateForBackend(formValue.startDate),
      endDate: this.formatDateForBackend(formValue.endDate),
      registrationDeadline: formValue.registrationDeadline ? this.formatDateForBackend(formValue.registrationDeadline) : null,
      participationType: formValue.participationType as ParticipationType,
      numberOfTeams: formValue.numberOfTeams || null,
      playersPerTeam: formValue.playersPerTeam || null,
      maxParticipants: maxParticipants,
      price: formValue.price || null,
      courtIds: this.selectedCourtIds,
      status: formValue.status
    };

    const request$ = this.eventId
      ? this.eventService.updateEvent(this.eventId, details as UpdateEventRequest, this.coverImageFile || undefined)
      : this.eventService.createEvent(details as CreateEventRequest, this.coverImageFile || undefined);

    request$.subscribe({
      next: (result) => {
        this.isLoading = false;
        this.saved.emit(result);
      },
      error: (err) => {
        this.isLoading = false;
        this.saveError = err.error?.error || 'Failed to save event';
      }
    });
  }

  onCancel() {
    this.cancelled.emit();
  }

  resetForm() {
    this.form.reset({
      sport: '',
      format: '',
      participationType: 'INDIVIDUAL',
      status: EventStatus.DRAFT
    });
    this.selectedCourtIds = [];
    this.coverImageFile = null;
    this.coverImagePreview = null;
    this.saveError = null;
  }

  private formatDateForBackend(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  get isEditMode(): boolean {
    return !!this.eventId;
  }

  get modalTitle(): string {
    return this.isEditMode ? 'Edit Event' : 'Create Event';
  }
}
