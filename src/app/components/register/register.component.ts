import { Component, EventEmitter, Output, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, InputTextModule, PasswordModule, ButtonModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss'
})
export class RegisterComponent {
  success = false;
  registerForm: FormGroup;
  submitted = false;
  loading = false;
  @Output() switchToLogin = new EventEmitter<void>();

  constructor(private fb: FormBuilder, private authService: AuthService, private router: Router, private cdr: ChangeDetectorRef) {
    this.registerForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      phoneNumber: ['', [Validators.required, Validators.pattern(/^\+?[0-9\s\-()]{7,}$/)]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  onSubmit() {
    this.submitted = true;
    if (!this.registerForm.valid || this.loading) return;
    this.loading = true;
    const { username, email, phoneNumber, password } = this.registerForm.value;
    this.authService.register({ username, email, phoneNumber, password })
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: () => {
          this.success = true;
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Registration failed:', error);
        }
      });
  }

  onGoogleSignUp() {
    if (this.loading) return;
    console.log('Continue with Google (register)');
  }

  onSwitchToLogin() {
    this.switchToLogin.emit();
  }
}


