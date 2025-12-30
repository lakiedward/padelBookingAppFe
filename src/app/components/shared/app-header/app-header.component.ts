import { CommonModule } from '@angular/common';
import { Component, computed, OnInit, OnDestroy, HostListener, ElementRef } from '@angular/core';
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
  private routerSubscription?: Subscription;
  isAdminRoute = false;
  profileDropdownOpen = false;

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

  constructor(
    private auth: AuthService, 
    private router: Router,
    private elementRef: ElementRef
  ) {}

  ngOnInit() {
    this.routerSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        this.isAdminRoute = event.urlAfterRedirects.startsWith('/admin');
      });
  }

  ngOnDestroy() {
    this.routerSubscription?.unsubscribe();
  }

  toggleProfileDropdown(event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    this.profileDropdownOpen = !this.profileDropdownOpen;
  }

  closeProfileDropdown() {
    this.profileDropdownOpen = false;
  }

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

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.closeProfileDropdown();
    }
  }
}
