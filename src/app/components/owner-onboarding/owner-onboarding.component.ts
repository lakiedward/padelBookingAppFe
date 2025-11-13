import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
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
    this.payments.initConnect({}).subscribe({
      next: (res) => { try { window.location.href = res.url; } catch {} },
      error: (err) => { this.error = err?.error?.message || 'Failed to start onboarding'; this.loading = false; }
    });
  }

  goToAdmin() {
    this.router.navigate(['/admin']);
  }
}
