import { Component, EventEmitter, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { CommonModule } from '@angular/common';

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

  constructor(private fb: FormBuilder) {
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
    console.log('Login form submitted:', this.loginForm.value);
    // TODO: Implement actual login logic
    // Simulate async finish
    setTimeout(() => {
      this.loading = false;
    }, 800);
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
