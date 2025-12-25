import { Component, signal } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AppHeaderComponent } from './components/shared/app-header/app-header.component';
import { filter } from 'rxjs';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CommonModule, AppHeaderComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('PadelBookingFe');
  protected readonly showHeader = signal(true);

  constructor(private router: Router) {
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.showHeader.set(!event.url.startsWith('/auth') && !event.url.startsWith('/admin'));
      });
    
    this.showHeader.set(!this.router.url.startsWith('/auth') && !this.router.url.startsWith('/admin'));
  }
}
