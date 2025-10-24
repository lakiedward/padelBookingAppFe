import { CommonModule } from '@angular/common';
import { Component, computed } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './app-header.component.html',
  styleUrl: './app-header.component.scss'
})
export class AppHeaderComponent {
  mobileOpen = false;

  // Use computed signal for reactive email display
  userEmail = computed(() => {
    const user = this.auth.currentUser$();
    return user?.email || 'user@playora.com';
  });

  constructor(private auth: AuthService, private router: Router) {}

  toggleMobile() { this.mobileOpen = !this.mobileOpen; }

  logout() {
    this.auth.logout();
    this.router.navigate(['/auth']);
  }
}
