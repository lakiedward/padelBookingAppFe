import { CommonModule } from '@angular/common';
import { Component, computed, signal, ViewChild, ElementRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-profile.component.html',
  styleUrl: './user-profile.component.scss'
})
export class UserProfileComponent {
  isEditing = signal(false);
  
  currentUser!: any;
  
  username = signal('');
  profileImageUrl = signal<string | undefined>(undefined);
  phoneNumber = signal('');
  
  selectedFile: File | null = null;
  imagePreview: string | null = null;
  isUploading = signal(false);

  // ViewChild reference to file input
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  // Getter methods for user properties
  firstName = () => this.currentUser()?.firstName;
  lastName = () => this.currentUser()?.lastName;
  email = () => this.currentUser()?.email;
  phone = () => this.phoneNumber();
  skillLevel = () => this.currentUser()?.skillLevel;

  constructor(
    private auth: AuthService,
    private router: Router,
    private http: HttpClient
  ) {
    // Initialize currentUser after auth is available
    this.currentUser = this.auth.currentUser$;
    
    const user = this.currentUser();
    if (user) {
      this.username.set(user.username || '');
      this.profileImageUrl.set(user.profileImageUrl);
      this.phoneNumber.set(user.phone || '');
    }
  }

  toggleEdit() {
    if (this.isEditing()) {
      const user = this.currentUser();
      if (user) {
        this.username.set(user.username || '');
        this.profileImageUrl.set(user.profileImageUrl);
        this.phoneNumber.set(user.phone || '');
      }
      this.selectedFile = null;
      this.imagePreview = null;
    }
    this.isEditing.set(!this.isEditing());
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.selectedFile = input.files[0];
      this.isUploading.set(true);
      
      const reader = new FileReader();
      reader.onload = (e) => {
        this.imagePreview = e.target?.result as string;
        this.isUploading.set(false);
      };
      reader.onerror = () => {
        this.isUploading.set(false);
        alert('Error loading image. Please try again.');
      };
      reader.readAsDataURL(this.selectedFile);
    }
  }

  triggerFileInput() {
    this.fileInput.nativeElement.click();
  }

  removeImage() {
    this.selectedFile = null;
    this.imagePreview = null;
    this.profileImageUrl.set(undefined);
  }

  saveProfile() {
    const user = this.currentUser();
    if (!user) {
      alert('User not found. Please log in again.');
      return;
    }

    const formData = new FormData();
    formData.append('username', this.username());
    formData.append('phone', this.phoneNumber());
    
    if (this.selectedFile) {
      this.isUploading.set(true);
      formData.append('profileImage', this.selectedFile);
    }

    // Call the update profile API
    this.http.put(`${environment.apiBaseUrl}/api/user/profile`, formData).subscribe({
      next: (updatedUser: any) => {
        // Update the local user data
        const updatedUserData = {
          ...user,
          username: this.username(),
          phone: this.phoneNumber(),
          profileImageUrl: updatedUser.profileImageUrl || user.profileImageUrl
        };
        
        // Update state service
        this.auth['stateService'].setUser(updatedUserData);
        
        // Update localStorage
        if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
          localStorage.setItem('user', JSON.stringify(updatedUserData));
        }
        
        this.isEditing.set(false);
        this.selectedFile = null;
        this.imagePreview = null;
        this.isUploading.set(false);
        
        alert('Profile updated successfully!');
      },
      error: (error) => {
        console.error('Error updating profile:', error);
        this.isUploading.set(false);
        alert('Error updating profile. Please try again.');
      }
    });
  }
}
