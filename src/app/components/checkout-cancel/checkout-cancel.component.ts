import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AppHeaderComponent } from '../shared/app-header/app-header.component';

@Component({
  selector: 'app-checkout-cancel',
  standalone: true,
  imports: [CommonModule, AppHeaderComponent],
  templateUrl: './checkout-cancel.component.html',
  styleUrls: ['./checkout-cancel.component.scss']
})
export class CheckoutCancelComponent {
  constructor(private router: Router) {}
  goHome() { this.router.navigate(['/user']); }
  goToCourts() { this.router.navigate(['/user']); }
}
