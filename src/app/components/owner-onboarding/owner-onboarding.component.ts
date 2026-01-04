import { Component, OnInit, inject, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { PaymentsService } from '../../services/payments.service';

@Component({
  selector: 'app-owner-onboarding',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './owner-onboarding.component.html',
  styleUrls: ['./owner-onboarding.component.scss']
})
export class OwnerOnboardingComponent implements OnInit {
  private readonly payments = inject(PaymentsService);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);

  loading = true;
  error?: string;
  chargesEnabled = false;
  payoutsEnabled = false;
  due: string[] = [];

  ngOnInit(): void {
    this.refreshStatus();
  }

  refreshStatus() {
    this.loading = true;
    this.error = undefined;
    this.payments.getStatus().subscribe({
      next: (res) => {
        this.chargesEnabled = res.chargesEnabled;
        this.payoutsEnabled = res.payoutsEnabled;
        this.due = res.requirementsCurrentlyDue || [];
        this.loading = false;
        if (this.chargesEnabled) {
          this.goToAdmin();
        }
      },
      error: (err) => {
        this.error = err?.error?.message || 'Failed to load status';
        this.loading = false;
      }
    });
  }

  resumeOnboarding() {
    this.loading = true;
    
    let baseUrl = '';
    if (isPlatformBrowser(this.platformId)) {
      baseUrl = window.location.origin;
    }

    this.payments.initConnect({ baseUrl }).subscribe({
      next: (res) => { 
        if (isPlatformBrowser(this.platformId)) {
          window.location.href = res.url;
        }
      },
      error: (err) => { 
        this.error = err?.error?.message || 'Failed to start onboarding'; 
        this.loading = false; 
      }
    });
  }

  goToAdmin() {
    this.router.navigate(['/admin']);
  }
}
