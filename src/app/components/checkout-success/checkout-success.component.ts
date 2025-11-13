import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AppHeaderComponent } from '../shared/app-header/app-header.component';
import { PaymentsService } from '../../services/payments.service';

@Component({
  selector: 'app-checkout-success',
  standalone: true,
  imports: [CommonModule, AppHeaderComponent],
  templateUrl: './checkout-success.component.html',
  styleUrls: ['./checkout-success.component.scss']
})
export class CheckoutSuccessComponent implements OnInit {
  confirming = false;
  error?: string | null;
  created?: boolean;
  bookingId?: number | null;

  constructor(private router: Router, private route: ActivatedRoute, private payments: PaymentsService) {}

  ngOnInit(): void {
    const sessionId = this.route.snapshot.queryParamMap.get('session_id');
    if (sessionId) {
      this.confirming = true;
      this.payments.confirmCheckout(sessionId).subscribe({
        next: (res) => {
          this.created = res.created;
          this.bookingId = res.bookingId ?? null;
          if (!res.created && res.message) this.error = res.message;
          // eslint-disable-next-line no-console
          console.log('[CheckoutSuccess] confirm result', res);
        },
        error: (err) => {
          this.error = err?.error?.message || 'Confirm failed';
          // eslint-disable-next-line no-console
          console.error('[CheckoutSuccess] confirm error', err);
        },
        complete: () => { this.confirming = false; }
      });
    }
  }

  goToCalendar() { this.router.navigate(['/calendar']); }
  goHome() { this.router.navigate(['/user']); }
}
