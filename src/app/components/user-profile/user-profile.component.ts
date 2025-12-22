import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { AppHeaderComponent } from '../shared/app-header/app-header.component';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, AppHeaderComponent],
  templateUrl: './user-profile.component.html',
  styleUrl: './user-profile.component.scss'
})
export class UserProfileComponent {
  isEditing = signal(false);
  
  currentUser = computed(() => this.auth.currentUser$());
  
  username = signal('');
  profileImageUrl = signal<string | undefined>(undefined);
  
  selectedFile: File | null = null;
  imagePreview: string | null = null;

  constructor(
    private auth: AuthService,
    private router: Router
  ) {
    const user = this.currentUser();
    if (user) {
      this.username.set(user.username || '');
      this.profileImageUrl.set(user.profileImageUrl);
    }
  }

  toggleEdit() {
    if (this.isEditing()) {
      const user = this.currentUser();
      if (user) {
        this.username.set(user.username || '');
        this.profileImageUrl.set(user.profileImageUrl);
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
      
      const reader = new FileReader();
      reader.onload = (e) => {
        this.imagePreview = e.target?.result as string;
      };
      reader.readAsDataURL(this.selectedFile);
    }
  }

  removeImage() {
    this.selectedFile = null;
    this.imagePreview = null;
    this.profileImageUrl.set(undefined);
  }

  saveProfile() {
    console.log('Saving profile:', {
      username: this.username(),
      profileImage: this.selectedFile
    });
    
    this.isEditing.set(false);
    
    alert('Profile updated successfully! (API call not implemented yet)');
  }
}
