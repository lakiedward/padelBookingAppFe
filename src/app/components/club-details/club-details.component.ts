import { Component, ElementRef, ViewChild, signal, OnDestroy, AfterViewInit, Inject, PLATFORM_ID, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { PasswordModule } from 'primeng/password';
import { ToastModule } from 'primeng/toast';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MapService } from '../../services/map.service';
import { ClubService, ClubDetailsRequest } from '../../services/club.service';
import { finalize } from 'rxjs/operators';
import { ClubDetails, SportKey, SPORT_OPTIONS } from '../../models/club.models';
import { ClubPreviewComponent } from '../club-preview/club-preview.component';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

interface SavedLocation {
  address: string;
  lat: number;
  lng: number;
}

  @Component({
  selector: 'app-club-details',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, InputTextModule, ButtonModule, RippleModule, PasswordModule, ToastModule, ConfirmDialogModule, ClubPreviewComponent],
  templateUrl: './club-details.component.html',
  styleUrl: './club-details.component.scss',
  providers: [MessageService, ConfirmationService]
})
export class ClubDetailsComponent implements OnInit, AfterViewInit, OnDestroy {
  form: FormGroup;
  private readonly isBrowser: boolean;
  submitted = false;

  @ViewChild('profileInput') profileInput?: ElementRef<HTMLInputElement>;
  @ViewChild('wallpaperInput') wallpaperInput?: ElementRef<HTMLInputElement>;
  @ViewChild('mapContainer') mapContainer?: ElementRef<HTMLDivElement>;

  isUploadingProfile = signal(false);
  isUploadingWallpaper = signal(false);
  profilePreviewUrl = signal<string | null>(null);
  wallpaperPreviewUrl = signal<string | null>(null);
  private selectedProfileFile?: File | null;
  private selectedWallpaperFile?: File | null;

  isDragOverProfile = signal(false);
  isDragOverWallpaper = signal(false);

  private map?: any;
  private mapInitialized = false;
  private marker?: any;
  currentLat = signal<number | null>(null);
  currentLng = signal<number | null>(null);
  isGeocoding = signal(false);
  savedLocations: SavedLocation[] = [];
  geocodeDebounce?: any;

  sports = SPORT_OPTIONS;

  selectedSports = new Set<SportKey>(['tennis']);


  isEditing = signal(true);
  isSaving = signal(false);
  // Show centered spinner while loading existing club
  isLoading = signal(true);

  @Output() courtsRequested = new EventEmitter<void>();
  @Output() manageBookingRequested = new EventEmitter<number>();

  hasExistingClub = false;

  constructor(private fb: FormBuilder, @Inject(PLATFORM_ID) platformId: Object, private mapService: MapService, public clubService: ClubService, private messageService: MessageService, private host: ElementRef<HTMLElement>, private router: Router, private authService: AuthService, private confirmationService: ConfirmationService) {
    this.isBrowser = isPlatformBrowser(platformId);
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern(/^\+?[0-9\s\-().]{7,20}$/)]],
      name: ['', Validators.required],
      address: ['', Validators.required],
      location: ['', Validators.required],
      description: ['', Validators.required],
    });

    // Start in editing mode until backend data is loaded

    this.form.get('address')!.valueChanges.subscribe(value => {
      if (this.geocodeDebounce) clearTimeout(this.geocodeDebounce);
      this.geocodeDebounce = setTimeout(async () => {
        const query = String(value || '');
        if (!query) return;
        this.isGeocoding.set(true);
        try {
          const res = await this.mapService.forwardGeocode(query);
          if (res) {
            this.mapService.setPosition(res.lat, res.lon);
            this.currentLat.set(res.lat);
            this.currentLng.set(res.lon);
            this.form.patchValue({ location: res.display }, { emitEvent: false });
          }
        } finally {
          this.isGeocoding.set(false);
        }
      }, 500);
    });
  }

  ngOnInit(): void {
    if (!this.isBrowser) { this.isLoading.set(false); return; }
    // Load existing club from backend with spinner
    this.isLoading.set(true);
    this.clubService.getMyClub().pipe(
      finalize(() => { this.isLoading.set(false); setTimeout(() => this.initMapOnce()); })
    ).subscribe({
      next: (club) => {
        this.hasExistingClub = true;
        this.applyDetailsToForm(club);
        this.isEditing.set(false);
      },
      error: (err) => {
        if (err && err.status === 404) {
          this.hasExistingClub = false;
          this.isEditing.set(true);
        } else {
          console.error('Failed to load club details', err);
          this.messageService.add({ key: 'error', severity: 'error', summary: 'Error', detail: 'Failed to load club details', life: 4000 });
        }
      }
    });
  }

  ngAfterViewInit(): void {
    if (!this.isBrowser) return;
    this.initMapOnce();
  }

  private initMapOnce() {
    if (this.mapInitialized) return;
    setTimeout(() => {
      if (!this.isBrowser || !this.mapContainer) return;
      this.mapService
        .loadLeafletAssets()
        .then(() => {
          if (!this.mapContainer || this.mapInitialized) return;
          this.mapService.initMap(this.mapContainer.nativeElement, (lat, lon) => {
            this.currentLat.set(lat);
            this.currentLng.set(lon);
            this.mapService.setPosition(lat, lon);
            this.isGeocoding.set(true);
            this.mapService
              .reverseGeocode(lat, lon)
              .then(display => {
                this.form.patchValue({ address: display, location: display }, { emitEvent: false });
              })
              .finally(() => this.isGeocoding.set(false));
          });
          this.mapService.tryInitFromGeolocation((lat, lon) => {
            this.currentLat.set(lat);
            this.currentLng.set(lon);
            this.mapService.setPosition(lat, lon);
            this.isGeocoding.set(true);
            this.mapService
              .reverseGeocode(lat, lon)
              .then(display => {
                this.form.patchValue({ address: display, location: display }, { emitEvent: false });
              })
              .finally(() => this.isGeocoding.set(false));
          });
          this.mapInitialized = true;
        })
        .catch(err => console.error('Leaflet load error', err));
    });
  }

  onEditCourtsRequested() {
    this.courtsRequested.emit();
  }

  onManageBooking(courtId: number) {
    this.manageBookingRequested.emit(courtId);
  }

  toggleSportSelection(key: SportKey) {
    if (this.selectedSports.has(key)) {
      this.selectedSports.delete(key);
    } else {
      this.selectedSports.add(key);
    }
  }

  isSelected(key: SportKey): boolean {
    return this.selectedSports.has(key);
  }

  labelFromKey(key: SportKey): string {
    if (!key) return '';
    return key.charAt(0).toUpperCase() + key.slice(1).toLowerCase();
  }

  save() {
    if (this.isSaving()) return; // Prevent multiple saves

    this.submitted = true;
    this.form.markAllAsTouched();
    this.form.updateValueAndValidity({ onlySelf: false, emitEvent: false });

    const { missing, invalid } = this.buildValidationIssues();
    const hasBlockingIssues = this.form.invalid || missing.length > 0 || invalid.length > 0;
    if (hasBlockingIssues) {
      const parts: string[] = [];
      if (missing.length > 0) parts.push(`Missing: ${missing.join(', ')}`);
      if (invalid.length > 0) parts.push(`Invalid format: ${invalid.join(', ')}`);
      const detail = parts.join(' • ');
      this.messageService.add({ key: 'error', severity: 'error', summary: 'Validation Error', detail, life: 5000 });
      return;
    }

    this.isSaving.set(true);
    const v = this.form.value;
    const req: ClubDetailsRequest = {
      name: v.name,
      email: v.email,
      phone: v.phone,
      description: v.description || null,
      locations: this.savedLocations.map(l => ({ address: l.address, lat: l.lat, lng: l.lng })),
      sports: Array.from(this.selectedSports)
    };

    const isCreating = !this.hasExistingClub;
    const op$ = this.hasExistingClub
      ? this.clubService.updateClub(req, this.selectedProfileFile || undefined, this.selectedWallpaperFile || undefined)
      : this.clubService.createClub(req, this.selectedProfileFile || undefined, this.selectedWallpaperFile || undefined);

    op$.subscribe({
      next: (saved) => {
        this.hasExistingClub = true;
        this.applyDetailsToForm(saved);
        this.isEditing.set(false);
        const successMsg = isCreating ? 'Club created successfully!' : 'Club updated successfully!';
        this.messageService.add({ key: 'success', severity: 'success', summary: 'Success', detail: successMsg, life: 3000 });
        this.isSaving.set(false);
      },
      error: (err) => {
        console.error('Save failed', err);
        const msg = err?.error?.message || 'Failed to save club';
        this.messageService.add({ key: 'error', severity: 'error', summary: 'Error', detail: msg, life: 5000 });
        this.isSaving.set(false);
      }
    });
    try {
      const container = this.host.nativeElement.closest('.content') as HTMLElement | null;
      if (container) {
        container.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        this.host.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch {}
      }
    } catch {}
    // Scrolling handled above; editing state toggled on success
  }

  showError() {
    this.submitted = true;
    this.form.markAllAsTouched();
    const { missing, invalid } = this.buildValidationIssues();
    if (missing.length === 0 && invalid.length === 0) {
      this.messageService.add({ severity: 'info', summary: 'No Errors', detail: 'All fields look good.', life: 2500 });
      return;
    }
    const parts: string[] = [];
    if (missing.length > 0) parts.push(`Missing: ${missing.join(', ')}`);
    if (invalid.length > 0) parts.push(`Invalid format: ${invalid.join(', ')}`);
    const detail = parts.join(' • ');
    this.messageService.add({ severity: 'error', summary: 'Validation Error', detail, life: 5000 });
  }

  private buildValidationIssues(): { missing: string[]; invalid: string[] } {
    const missing: string[] = [];
    const invalid: string[] = [];
    const controls = this.form.controls;
    const isEmpty = (v: any) => (typeof v === 'string' ? v.trim() === '' : v == null);

    if (isEmpty(controls['name'].value)) missing.push('Name');
    if (isEmpty(controls['email'].value)) missing.push('Email');
    if (isEmpty(controls['phone'].value)) missing.push('Phone');
    if (isEmpty(controls['address'].value)) missing.push('Address');
    if (isEmpty(controls['location'].value)) missing.push('Location');
    if (isEmpty(controls['description'].value)) missing.push('Description');

    if (this.savedLocations.length === 0) missing.push('Added Location');
    if (!this.profilePreviewUrl()) missing.push('Profile Image');
    if (!this.wallpaperPreviewUrl()) missing.push('Wallpaper Image');

    if (!isEmpty(controls['email'].value) && controls['email'].invalid && controls['email'].errors?.['email']) {
      invalid.push('Email');
    }
    if (!isEmpty(controls['phone'].value) && controls['phone'].invalid && controls['phone'].errors?.['pattern']) {
      invalid.push('Phone');
    }

    return { missing, invalid };
  }

  startEdit() {
    const saved = this.clubService.lastSaved();
    if (saved) {
      this.applyDetailsToForm(saved);
    }
    this.submitted = false;
    this.isEditing.set(true);
    try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch {}
    this.initMapOnce();
  }

  private applyDetailsToForm(details: ClubDetails) {
    this.form.patchValue({
      name: details.name || '',
      email: details.email || '',
      phone: details.phone || '',
      description: details.description || '',
      address: details.locations && details.locations[0] ? details.locations[0].address : '',
      location: details.locations && details.locations[0] ? details.locations[0].address : ''
    }, { emitEvent: false });

    this.savedLocations = (details.locations || []).map(l => ({ address: l.address, lat: l.lat, lng: l.lng }));

    this.selectedSports = new Set<SportKey>(details.sports || []);


    const prevProfile = this.profilePreviewUrl();
    const prevWallpaper = this.wallpaperPreviewUrl();
    if (prevProfile && prevProfile.startsWith('blob:')) URL.revokeObjectURL(prevProfile);
    if (prevWallpaper && prevWallpaper.startsWith('blob:')) URL.revokeObjectURL(prevWallpaper);

    this.profilePreviewUrl.set(details.profileImageUrl || null);
    this.wallpaperPreviewUrl.set(details.wallpaperImageUrl || null);
  }

  onAddLocation() {
    const address: string = this.form.get('address')?.value || this.form.get('location')?.value || '';
    const lat = this.currentLat();
    const lng = this.currentLng();
    if (!address || lat == null || lng == null) {
      console.log('Please pick an address on map or type a valid address before adding.');
      return;
    }
    this.savedLocations.push({ address, lat, lng });
  }

  removeLocation(index: number) {
    this.savedLocations.splice(index, 1);
  }

  onClickProfileUpload() {
    if (this.isUploadingProfile()) return;
    this.profileInput?.nativeElement.click();
  }

  onClickWallpaperUpload() {
    if (this.isUploadingWallpaper()) return;
    this.wallpaperInput?.nativeElement.click();
  }

  onProfileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const previousUrl = this.profilePreviewUrl();
      if (previousUrl) URL.revokeObjectURL(previousUrl);
      this.profilePreviewUrl.set(URL.createObjectURL(file));
      this.selectedProfileFile = file;
      input.value = '';
    } else {
      input.value = '';
    }
  }

  onWallpaperSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const previousUrl = this.wallpaperPreviewUrl();
      if (previousUrl) URL.revokeObjectURL(previousUrl);
      this.wallpaperPreviewUrl.set(URL.createObjectURL(file));
      this.selectedWallpaperFile = file;
      input.value = '';
    } else {
      input.value = '';
    }
  }

  onEditProfileImage(event?: Event) {
    if (event) event.stopPropagation();
    this.onClickProfileUpload();
  }

  onEditWallpaperImage(event?: Event) {
    if (event) event.stopPropagation();
    this.onClickWallpaperUpload();
  }

  onDeleteProfileImage(event?: Event) {
    if (event) event.stopPropagation();
    const url = this.profilePreviewUrl();
    if (url) URL.revokeObjectURL(url);
    this.profilePreviewUrl.set(null);
    this.selectedProfileFile = null;
    if (this.profileInput?.nativeElement) {
      this.profileInput.nativeElement.value = '';
    }
  }

  onDeleteWallpaperImage(event?: Event) {
    if (event) event.stopPropagation();
    const url = this.wallpaperPreviewUrl();
    if (url) URL.revokeObjectURL(url);
    this.wallpaperPreviewUrl.set(null);
    this.selectedWallpaperFile = null;
    if (this.wallpaperInput?.nativeElement) {
      this.wallpaperInput.nativeElement.value = '';
    }
  }

  // Real upload occurs on save via ClubService (multipart)

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();

    const target = event.currentTarget as HTMLElement;
    if (target.classList.contains('profile')) {
      this.isDragOverProfile.set(true);
    } else if (target.classList.contains('wallpaper')) {
      this.isDragOverWallpaper.set(true);
    }
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();

    this.isDragOverProfile.set(false);
    this.isDragOverWallpaper.set(false);
  }

  onProfileDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();

    this.isDragOverProfile.set(false);
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (this.isValidImageFile(file)) {
        const previousUrl = this.profilePreviewUrl();
        if (previousUrl) URL.revokeObjectURL(previousUrl);
        this.profilePreviewUrl.set(URL.createObjectURL(file));
        this.selectedProfileFile = file;
      }
    }
  }

  onWallpaperDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();

    this.isDragOverWallpaper.set(false);
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (this.isValidImageFile(file)) {
        const previousUrl = this.wallpaperPreviewUrl();
        if (previousUrl) URL.revokeObjectURL(previousUrl);
        this.wallpaperPreviewUrl.set(URL.createObjectURL(file));
        this.selectedWallpaperFile = file;
      }
    }
  }

  private isValidImageFile(file: File): boolean {
    return file.type.startsWith('image/');
  }

  // Removed handleProfileFile/handleWallpaperFile helpers in favor of direct assignment

  onDeleteClub() {
    this.confirmationService.confirm({
      header: 'Delete Club',
      message: 'This will permanently delete your club, all courts, bookings and also your owner account. You will be logged out. Continue?',
      icon: 'pi pi-exclamation-triangle',
      rejectLabel: 'Cancel',
      acceptLabel: 'Continue',
      accept: () => {
        // Defer to next tick so the first dialog fully closes before opening the second
        setTimeout(() => {
          this.confirmationService.confirm({
            header: 'Confirm Deletion',
            message: 'This action cannot be undone. Are you absolutely sure you want to permanently delete your club and owner account?',
            icon: 'pi pi-exclamation-triangle',
            rejectLabel: 'Cancel',
            acceptLabel: 'Delete',
            accept: () => {
              this.clubService.deleteClub().subscribe({
                next: () => {
                  // Reset local state
                  this.clubService.lastSaved.set(null);
                  this.hasExistingClub = false;
                  this.form.reset();
                  this.savedLocations = [];
                  this.selectedSports = new Set<SportKey>(['tennis']);
                  const p = this.profilePreviewUrl(); if (p) URL.revokeObjectURL(p);
                  const w = this.wallpaperPreviewUrl(); if (w) URL.revokeObjectURL(w);
                  this.profilePreviewUrl.set(null);
                  this.wallpaperPreviewUrl.set(null);
                  this.selectedProfileFile = null;
                  this.selectedWallpaperFile = null;
                  this.isEditing.set(true);
                  this.messageService.add({ key: 'success', severity: 'success', summary: 'Deleted', detail: 'Club deleted successfully', life: 3000 });
                  // Owner account will also be deleted on backend; logout locally and redirect to auth
                  try { this.authService.logout(); } catch {}
                  try { this.router.navigate(['/auth']); } catch {}
                },
                error: (err) => {
                  console.error('Delete failed', err);
                  const msg = err?.error?.message || 'Failed to delete club';
                  this.messageService.add({ key: 'error', severity: 'error', summary: 'Error', detail: msg, life: 5000 });
                }
              });
            }
          });
        }, 0);
      }
    });
  }


  ngOnDestroy() {
    const profileUrl = this.profilePreviewUrl();
    const wallpaperUrl = this.wallpaperPreviewUrl();
    if (profileUrl) URL.revokeObjectURL(profileUrl);
    if (wallpaperUrl) URL.revokeObjectURL(wallpaperUrl);
    if (this.geocodeDebounce) {
      clearTimeout(this.geocodeDebounce);
      this.geocodeDebounce = undefined;
    }
    this.mapService.destroy();
  }
}
