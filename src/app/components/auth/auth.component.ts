import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { LoginComponent } from '../login/login.component';
import { RegisterComponent } from '../register/register.component';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, ToastModule, LoginComponent, RegisterComponent],
  providers: [MessageService],
  templateUrl: './auth.component.html',
  styleUrl: './auth.component.scss'
})
export class AuthComponent implements OnInit {
  mode: 'login' | 'register' = 'login';

  constructor(private route: ActivatedRoute, private router: Router) {}

  ngOnInit(): void {
    const initial = (this.route.snapshot.queryParamMap.get('m') as 'login' | 'register') || 'login';
    this.mode = initial;
    this.route.queryParamMap.subscribe(params => {
      const m = (params.get('m') as 'login' | 'register') || 'login';
      this.mode = m;
    });
  }

  switchTo(next: 'login' | 'register') {
    this.mode = next;
    this.router.navigate([], { queryParams: { m: next }, queryParamsHandling: 'merge' });
  }
}
