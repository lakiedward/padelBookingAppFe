import { Component, EventEmitter, Output, AfterViewInit, inject, PLATFORM_ID } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { CommonModule, DOCUMENT, isPlatformBrowser } from '@angular/common';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    InputTextModule,
    PasswordModule,
    ButtonModule,
    ToastModule
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent implements AfterViewInit {
  loginForm: FormGroup;
  submitted = false;
  loading = false;
  authError = false;
  @Output() switchToRegister = new EventEmitter<void>();
  private readonly platformId = inject(PLATFORM_ID);
  private readonly document = inject(DOCUMENT);

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private messageService: MessageService
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      rememberMe: [false]
    });

    // Reset auth error on any field change
    this.loginForm.valueChanges.subscribe(() => {
      if (this.authError) this.authError = false;
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
    this.authError = false;
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
        this.authError = true;
        // Mark fields as having auth error (non-validation) to show red state
        const emailCtrl = this.loginForm.get('email');
        const passCtrl = this.loginForm.get('password');
        emailCtrl?.markAsTouched();
        passCtrl?.markAsTouched();
        emailCtrl?.setErrors({ ...(emailCtrl.errors || {}), auth: true });
        passCtrl?.setErrors({ ...(passCtrl.errors || {}), auth: true });

        this.messageService.add({
          key: 'auth',
          severity: 'error',
          summary: 'Invalid credentials',
          detail: 'Your username or password are invalid.',
          life: 4000
        });
      }
    });
  }

  onSignUp() {
    this.switchToRegister.emit();
  }

  onForgotPassword() {
    console.log('Navigate to forgot password');
  }

  onGoogleSignIn() {
    if (this.loading) return;
    console.log('Continue with Google');
  }
}
