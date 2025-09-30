import { Component, EventEmitter, Output, AfterViewInit, inject, PLATFORM_ID } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { CommonModule, DOCUMENT, isPlatformBrowser } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    InputTextModule,
    PasswordModule,
    ButtonModule
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent implements AfterViewInit {
  loginForm: FormGroup;
  submitted = false;
  loading = false;
  @Output() switchToRegister = new EventEmitter<void>();
  private readonly platformId = inject(PLATFORM_ID);
  private readonly document = inject(DOCUMENT);

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      rememberMe: [false]
    });
  }

  ngAfterViewInit(): void {
    // Handle browser autofill not triggering Angular change detection (SSR-safe)
    if (!isPlatformBrowser(this.platformId)) return;
    setTimeout(() => {
      const emailEl = this.document?.getElementById('email') as HTMLInputElement | null;
      const passEl = this.document?.getElementById('password') as HTMLInputElement | null;
      const email = emailEl?.value?.trim();
      const password = passEl?.value ?? '';
      if (email) {
        const ctrl = this.loginForm.get('email');
        if (ctrl && !ctrl.value) ctrl.setValue(email);
      }
      if (password) {
        const ctrl = this.loginForm.get('password');
        if (ctrl && !ctrl.value) ctrl.setValue(password);
      }
    }, 0);
  }

  onSignIn() {
    this.submitted = true;
    if (!this.loginForm.valid || this.loading) return;

    this.loading = true;
    const { email, password } = this.loginForm.value;

    this.authService.login(email, password).subscribe({
      next: (response) => {
        console.log('Login successful:', response);
        this.loading = false;
        if (this.authService.isAdmin()) {
          this.router.navigate(['/admin']);
        } else if (this.authService.isUser()) {
          this.router.navigate(['/user']);
        } else {
          // Fallback: no recognized role
          console.warn('Logged in without recognized role; staying on auth');
        }
      },
      error: (error) => {
        console.error('Login failed:', error);
        this.loading = false;
      }
    });
  }

  onSignUp() {
    this.switchToRegister.emit();
  }

  onForgotPassword() {
    console.log('Navigate to forgot password');
    // TODO: Implement navigation to forgot password component
  }

  onGoogleSignIn() {
    if (this.loading) return;
    console.log('Continue with Google');
    // TODO: Implement Google OAuth flow
  }
}
