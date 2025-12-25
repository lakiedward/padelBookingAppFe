import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-checkout-cancel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './checkout-cancel.component.html',
  styleUrls: ['./checkout-cancel.component.scss']
})
export class CheckoutCancelComponent {
  constructor(private router: Router) {}
  goHome() { this.router.navigate(['/courts']); }
  goToCourts() { this.router.navigate(['/courts']); }
}
