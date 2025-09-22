import { Component, ElementRef, ViewChild, signal, OnDestroy, AfterViewInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { PasswordModule } from 'primeng/password';
import { MapService } from '../../services/map.service';
import { ClubService } from '../../services/club.service';
import { ClubDetails, SportKey, SPORT_OPTIONS } from '../../models/club.models';

interface SavedLocation {
  address: string;
  lat: number;
  lng: number;
}

  @Component({
  selector: 'app-club-details',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, InputTextModule, ButtonModule, PasswordModule],
  templateUrl: './club-details.component.html',
  styleUrl: './club-details.component.scss'
})
export class ClubDetailsComponent implements AfterViewInit, OnDestroy {
  form: FormGroup;
  private readonly isBrowser: boolean;

  @ViewChild('profileInput') profileInput?: ElementRef<HTMLInputElement>;
  @ViewChild('wallpaperInput') wallpaperInput?: ElementRef<HTMLInputElement>;
  @ViewChild('mapContainer') mapContainer?: ElementRef<HTMLDivElement>;

  isUploadingProfile = signal(false);
  isUploadingWallpaper = signal(false);
  profilePreviewUrl = signal<string | null>(null);
  wallpaperPreviewUrl = signal<string | null>(null);

  private map?: any;
  private marker?: any;
  currentLat = signal<number | null>(null);
  currentLng = signal<number | null>(null);
  isGeocoding = signal(false);
  savedLocations: SavedLocation[] = [];
  geocodeDebounce?: any;

  sports = SPORT_OPTIONS;

  selectedSports = new Set<SportKey>(['tennis']);


  constructor(private fb: FormBuilder, @Inject(PLATFORM_ID) platformId: Object, private mapService: MapService, private clubService: ClubService) {
    this.isBrowser = isPlatformBrowser(platformId);
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required]],
      name: ['', Validators.required],
      address: ['', Validators.required],
      location: ['', Validators.required],
      description: [''],
    });

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

  ngAfterViewInit(): void {
    if (!this.isBrowser) return;
    this.mapService.loadLeafletAssets().then(() => {
      if (!this.mapContainer) return;
      this.mapService.initMap(this.mapContainer.nativeElement, (lat, lon) => {
        this.currentLat.set(lat);
        this.currentLng.set(lon);
        this.isGeocoding.set(true);
        this.mapService.reverseGeocode(lat, lon)
          .then(display => {
            this.form.patchValue({ address: display, location: display }, { emitEvent: false });
          })
          .finally(() => this.isGeocoding.set(false));
      });
      this.mapService.tryInitFromGeolocation((lat, lon) => {
        this.currentLat.set(lat);
        this.currentLng.set(lon);
        this.isGeocoding.set(true);
        this.mapService.reverseGeocode(lat, lon)
          .then(display => {
            this.form.patchValue({ address: display, location: display }, { emitEvent: false });
          })
          .finally(() => this.isGeocoding.set(false));
      });
    }).catch(err => console.error('Leaflet load error', err));
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
    if (this.form.invalid) return;
    const v = this.form.value;
    const selectedSports: SportKey[] = Array.from(this.selectedSports);
    const details: ClubDetails = {
      id: undefined,
      name: v.name,
      email: v.email,
      phone: v.phone,
      description: v.description || null,
      locations: this.savedLocations.map(l => ({ address: l.address, lat: l.lat, lng: l.lng })),
      sports: selectedSports,
      profileImageUrl: this.profilePreviewUrl(),
      wallpaperImageUrl: this.wallpaperPreviewUrl(),
      updatedAt: new Date().toISOString(),
    };
    this.clubService.saveClub(details);
    console.log('Club saved', details);
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
      this.isUploadingProfile.set(true);
      this.simulateUpload(file)
        .catch(() => {})
        .finally(() => {
          this.isUploadingProfile.set(false);
          input.value = '';
        });
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
      this.isUploadingWallpaper.set(true);
      this.simulateUpload(file)
        .catch(() => {})
        .finally(() => {
          this.isUploadingWallpaper.set(false);
          input.value = '';
        });
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
    if (this.profileInput?.nativeElement) {
      this.profileInput.nativeElement.value = '';
    }
  }

  onDeleteWallpaperImage(event?: Event) {
    if (event) event.stopPropagation();
    const url = this.wallpaperPreviewUrl();
    if (url) URL.revokeObjectURL(url);
    this.wallpaperPreviewUrl.set(null);
    if (this.wallpaperInput?.nativeElement) {
      this.wallpaperInput.nativeElement.value = '';
    }
  }

  private simulateUpload(file: File): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 1200));
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


