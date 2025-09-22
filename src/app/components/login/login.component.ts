import { Component, EventEmitter, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { CommonModule } from '@angular/common';
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
export class LoginComponent {
  loginForm: FormGroup;
  submitted = false;
  loading = false;
  @Output() switchToRegister = new EventEmitter<void>();

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
        } else {
          console.log('Regular user logged in');
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
  }

  onGoogleSignIn() {
    if (this.loading) return;
    console.log('Continue with Google');
  }
}
