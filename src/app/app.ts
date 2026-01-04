import { CommonModule, DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Component, Inject, OnDestroy, PLATFORM_ID, signal } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { AppHeaderComponent } from './components/shared/app-header/app-header.component';
import { filter, Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CommonModule, AppHeaderComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnDestroy {
  protected readonly title = signal('PadelBookingFe');
  protected readonly showHeader = signal(true);
  private readonly scrollLockClass = 'admin-scroll-lock';
  private readonly subscriptions = new Subscription();

  constructor(
    private router: Router,
    @Inject(DOCUMENT) private document: Document,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.subscriptions.add(
      this.router.events.pipe(filter(event => event instanceof NavigationEnd)).subscribe((event: NavigationEnd) => {
        this.applyRouteUiState(event.url);
      })
    );

    this.applyRouteUiState(this.router.url);
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
    // Safety: never leave the body locked if the root is torn down (e.g. tests).
    this.setScrollLock(false);
  }

  private applyRouteUiState(url: string) {
    const isAdmin = url.startsWith('/admin');
    const isAuth = url.startsWith('/auth');
    this.showHeader.set(!isAuth && !isAdmin);
    this.setScrollLock(isAdmin);
  }

  private setScrollLock(enabled: boolean) {
    if (!isPlatformBrowser(this.platformId)) return;
    this.document?.documentElement?.classList.toggle(this.scrollLockClass, enabled);
    this.document?.body?.classList.toggle(this.scrollLockClass, enabled);
  }
}
