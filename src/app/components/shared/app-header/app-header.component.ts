import { CommonModule } from '@angular/common';
import { Component, computed, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, NavigationEnd } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { filter, Subscription } from 'rxjs';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './app-header.component.html',
  styleUrl: './app-header.component.scss'
})
export class AppHeaderComponent implements OnInit, OnDestroy {
  mobileOpen = false;
  private routerSubscription?: Subscription;
  isAdminRoute = false;

  userEmail = computed(() => {
    const user = this.auth.currentUser$();
    return user?.email || 'user@playora.com';
  });

  username = computed(() => {
    const user = this.auth.currentUser$();
    return user?.username || 'User';
  });

  profileImageUrl = computed(() => {
    const user = this.auth.currentUser$();
    return user?.profileImageUrl;
  });

  isAuthenticated = computed(() => {
    return this.auth.currentUser$() !== null;
  });

  constructor(private auth: AuthService, private router: Router) {}

  ngOnInit() {
    this.routerSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        this.mobileOpen = false;
        this.isAdminRoute = event.urlAfterRedirects.startsWith('/admin');
      });
  }

  ngOnDestroy() {
    this.routerSubscription?.unsubscribe();
  }

  toggleMobile() { this.mobileOpen = !this.mobileOpen; }

  goToProfile() {
    this.router.navigate(['/profile']);
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/auth']);
  }

  goToLogin() {
    this.router.navigate(['/auth']);
  }
}
