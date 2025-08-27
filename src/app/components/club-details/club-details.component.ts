import { Component, ElementRef, ViewChild, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { PasswordModule } from 'primeng/password';

@Component({
  selector: 'app-club-details',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, InputTextModule, ButtonModule, PasswordModule],
  templateUrl: './club-details.component.html',
  styleUrl: './club-details.component.scss'
})
export class ClubDetailsComponent {
  form: FormGroup;

  @ViewChild('profileInput') profileInput?: ElementRef<HTMLInputElement>;
  @ViewChild('wallpaperInput') wallpaperInput?: ElementRef<HTMLInputElement>;

  // upload state and previews (signals for zoneless change detection)
  isUploadingProfile = signal(false);
  isUploadingWallpaper = signal(false);
  profilePreviewUrl = signal<string | null>(null);
  wallpaperPreviewUrl = signal<string | null>(null);

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

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required]],
      name: ['', Validators.required],
      location: ['', Validators.required],
      description: [''],
    });
  }

  toggleSportSelection(key: string) {
    const index = this.sports.findIndex(s => s.key === key);
    if (index === -1) return;
    this.sports[index] = { ...this.sports[index], selected: !this.sports[index].selected };
  }

  save() {
    if (this.form.invalid) return;
    console.log('Save club:', this.form.value);
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
      // create local preview
      const previousUrl = this.profilePreviewUrl();
      if (previousUrl) URL.revokeObjectURL(previousUrl);
      this.profilePreviewUrl.set(URL.createObjectURL(file));
      // simulate upload
      this.isUploadingProfile.set(true);
      this.simulateUpload(file)
        .catch(() => { /* keep preview even if upload fails in this simulation */ })
        .finally(() => {
          this.isUploadingProfile.set(false);
          // allow selecting the same file again
          input.value = '';
        });
    } else {
      // ensure next change event fires even for same file selection later
      input.value = '';
    }
  }

  onWallpaperSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      // create local preview
      const previousUrl = this.wallpaperPreviewUrl();
      if (previousUrl) URL.revokeObjectURL(previousUrl);
      this.wallpaperPreviewUrl.set(URL.createObjectURL(file));
      // simulate upload
      this.isUploadingWallpaper.set(true);
      this.simulateUpload(file)
        .catch(() => { /* keep preview even if upload fails in this simulation */ })
        .finally(() => {
          this.isUploadingWallpaper.set(false);
          // allow selecting the same file again
          input.value = '';
        });
    } else {
      // ensure next change event fires even for same file selection later
      input.value = '';
    }
  }

  // Edit actions simply trigger file selection again
  onEditProfileImage(event?: Event) {
    if (event) event.stopPropagation();
    this.onClickProfileUpload();
  }

  onEditWallpaperImage(event?: Event) {
    if (event) event.stopPropagation();
    this.onClickWallpaperUpload();
  }

  // Delete actions clear preview and reset inputs
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

  // Simulate upload call (replace with real service when available)
  private simulateUpload(file: File): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 1200));
  }

  ngOnDestroy() {
    const profileUrl = this.profilePreviewUrl();
    const wallpaperUrl = this.wallpaperPreviewUrl();
    if (profileUrl) URL.revokeObjectURL(profileUrl);
    if (wallpaperUrl) URL.revokeObjectURL(wallpaperUrl);
  }
}


