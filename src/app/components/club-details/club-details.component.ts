import { Component, ElementRef, ViewChild, signal, OnDestroy, AfterViewInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { PasswordModule } from 'primeng/password';

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

  // upload state and previews (signals for zoneless change detection)
  isUploadingProfile = signal(false);
  isUploadingWallpaper = signal(false);
  profilePreviewUrl = signal<string | null>(null);
  wallpaperPreviewUrl = signal<string | null>(null);

  // map state
  private map?: any; // Leaflet map (typed as any to avoid requiring type deps)
  private marker?: any;
  currentLat = signal<number | null>(null);
  currentLng = signal<number | null>(null);
  isGeocoding = signal(false);
  savedLocations: SavedLocation[] = [];
  geocodeDebounce?: any;

  sports = [
    { key: 'tennis', icon: '', label: 'Tennis', selected: true },
    { key: 'padel', icon: '', label: 'Padel' },
    { key: 'football', icon: '', label: 'Football' },
    { key: 'basketball', icon: '', label: 'Basketball' },
    { key: 'volleyball', icon: '', label: 'Volleyball' },
    { key: 'badminton', icon: '', label: 'Badminton' },
    { key: 'squash', icon: '', label: 'Squash' },
    { key: 'pingpong', icon: '', label: 'Ping Pong' },
    { key: 'handball', icon: '', label: 'Handball' }
  ];


  constructor(private fb: FormBuilder, @Inject(PLATFORM_ID) platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required]],
      name: ['', Validators.required],
      address: ['', Validators.required],
      location: ['', Validators.required],
      description: [''],
    });


    // Watch address field for geocoding
    this.form.get('address')!.valueChanges.subscribe(value => {
      if (this.geocodeDebounce) clearTimeout(this.geocodeDebounce);
      this.geocodeDebounce = setTimeout(() => this.forwardGeocode(String(value || '')), 500);
    });
  }

  ngAfterViewInit(): void {
    if (!this.isBrowser) return;
    // Dynamically load Leaflet CSS/JS if not present to minimize project changes
    this.injectLeafletAssets().then(() => {
      this.initMap();
      this.tryInitFromGeolocation();
    }).catch(err => console.error('Leaflet load error', err));
  }

  private async injectLeafletAssets(): Promise<void> {
    if (!this.isBrowser) return;
    const cssId = 'leaflet-css';
    const jsId = 'leaflet-js';
    if (!document.getElementById(cssId)) {
      const link = document.createElement('link');
      link.id = cssId;
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }
    if (!document.getElementById(jsId)) {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.id = jsId;
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.onload = () => resolve();
        script.onerror = () => reject();
        document.body.appendChild(script);
      });
    }
  }

  private initMap(): void {
    if (!this.isBrowser) return;
    const L = (window as any).L;
    if (!L || !this.mapContainer) return;
    this.map = L.map(this.mapContainer.nativeElement, { zoomControl: true }).setView([45.9432, 24.9668], 6); // Romania center
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.map);

    this.marker = L.marker([45.9432, 24.9668], { draggable: true }).addTo(this.map);
    this.marker.on('dragend', () => {
      const pos = this.marker.getLatLng();
      this.updateFromCoords(pos.lat, pos.lng, true);
    });
    this.map.on('click', (e: any) => {
      this.updateFromCoords(e.latlng.lat, e.latlng.lng, true);
    });
  }

  private async forwardGeocode(query: string): Promise<void> {
    if (!this.isBrowser) return;
    if (!query || query.trim().length < 3) return;
    try {
      this.isGeocoding.set(true);
      const resp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=1`, {
        headers: { 'Accept-Language': 'en', 'User-Agent': 'PadelBookingAppFe/1.0 (contact@example.com)' }
      });
      const data = await resp.json();
      if (Array.isArray(data) && data[0]) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        this.setMapPosition(lat, lon);
        // Keep location text in sync with a readable display name
        this.form.patchValue({ location: data[0].display_name }, { emitEvent: false });
      }
    } catch (e) {
      console.warn('Geocoding failed', e);
    } finally {
      this.isGeocoding.set(false);
    }
  }

  private async reverseGeocode(lat: number, lon: number): Promise<void> {
    if (!this.isBrowser) return;
    try {
      this.isGeocoding.set(true);
      const resp = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`, {
        headers: { 'Accept-Language': 'en', 'User-Agent': 'PadelBookingAppFe/1.0 (contact@example.com)' }
      });
      const data = await resp.json();
      const display = data?.display_name || `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
      this.form.patchValue({ address: display, location: display }, { emitEvent: false });
    } catch (e) {
      console.warn('Reverse geocoding failed', e);
    } finally {
      this.isGeocoding.set(false);
    }
  }

  private setMapPosition(lat: number, lon: number): void {
    if (!this.isBrowser) return;
    this.currentLat.set(lat);
    this.currentLng.set(lon);
    const L = (window as any).L;
    if (this.map) this.map.setView([lat, lon], Math.max(this.map.getZoom(), 14));
    if (this.marker && L) {
      this.marker.setLatLng([lat, lon]);
    }
  }

  private updateFromCoords(lat: number, lon: number, doReverse = false): void {
    this.setMapPosition(lat, lon);
    if (doReverse) this.reverseGeocode(lat, lon);
  }

  private tryInitFromGeolocation(): void {
    if (!this.isBrowser) return;
    if (!('geolocation' in navigator)) return;
    try {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          this.setMapPosition(lat, lon);
          // Update address, country, and city from coordinates
          this.reverseGeocode(lat, lon);
        },
        (err) => {
          console.warn('Geolocation error', err);
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 300000 }
      );
    } catch (e) {
      console.warn('Geolocation not available', e);
    }
  }


  toggleSportSelection(key: string) {
    const index = this.sports.findIndex(s => s.key === key);
    if (index === -1) return;
    this.sports[index] = { ...this.sports[index], selected: !this.sports[index].selected };
  }

  save() {
    if (this.form.invalid) return;
    console.log('Save club:', this.form.value, 'savedLocations:', this.savedLocations);
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
    if (this.map) {
      try { this.map.remove(); } catch {}
    }
  }
}


