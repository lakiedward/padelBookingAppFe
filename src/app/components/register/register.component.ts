/// <reference types="google.accounts" />
import { Component, EventEmitter, Output, ChangeDetectorRef, AfterViewInit, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, DOCUMENT, isPlatformBrowser } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import { MessageService } from 'primeng/api';
import { environment } from '../../../environments/environment';

type GoogleIdentity = {
  accounts: typeof google.accounts;
};

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, InputTextModule, PasswordModule, ButtonModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss'
})
export class RegisterComponent implements AfterViewInit {
  success = false;
  registerForm: FormGroup;
  submitted = false;
  loading = false;
  useGoogleButton = true;
  private readonly googleClientId = environment.googleClientId;
  private googleInitialized = false;
  @Output() switchToLogin = new EventEmitter<void>();
  private readonly platformId = inject(PLATFORM_ID);
  private readonly document = inject(DOCUMENT);
  private removeResizeListener?: () => void;

  constructor(
    private fb: FormBuilder, 
    private authService: AuthService, 
    private router: Router, 
    private cdr: ChangeDetectorRef,
    private messageService: MessageService
  ) {
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

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    // Wait for Google SDK to load
    this.waitForGoogleSDK().then(() => {
      this.getGoogleIdentity();
    }).catch(() => {
      // SDK failed to load, fallback to custom button
      setTimeout(() => {
        this.useGoogleButton = false;
        this.cdr.detectChanges();
      }, 0);
    });
  }

  private waitForGoogleSDK(maxAttempts = 20, delay = 200): Promise<void> {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const checkSDK = () => {
        const googleGlobal = (window as typeof window & { google?: GoogleIdentity }).google;
        if (googleGlobal?.accounts?.id) {
          resolve();
        } else if (attempts < maxAttempts) {
          attempts++;
          setTimeout(checkSDK, delay);
        } else {
          reject(new Error('Google SDK failed to load'));
        }
      };
      checkSDK();
    });
  }

  onGoogleSignUp() {
    if (this.loading) return;
    if (!isPlatformBrowser(this.platformId)) return;

    const googleInstance = this.getGoogleIdentity(true);
    if (!googleInstance) {
      return;
    }

    googleInstance.accounts.id.prompt();
  }

  private getGoogleIdentity(showFeedback = false): GoogleIdentity | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }

    if (!this.googleClientId || this.googleClientId.includes('YOUR_GOOGLE_CLIENT_ID')) {
      if (showFeedback) {
        this.messageService.add({
          key: 'auth',
          severity: 'warn',
          summary: 'Google Sign-Up unavailable',
          detail: 'Google authentication is not configured for this environment.',
          life: 4000
        });
      }
      console.warn('[RegisterComponent] googleClientId is not configured.');
      setTimeout(() => {
        this.useGoogleButton = false;
        this.cdr.detectChanges();
      }, 0);
      return null;
    }

    const googleGlobal = (window as typeof window & { google?: GoogleIdentity }).google;
    if (!googleGlobal || !googleGlobal.accounts?.id) {
      if (showFeedback) {
        this.messageService.add({
          key: 'auth',
          severity: 'error',
          summary: 'Google Sign-Up unavailable',
          detail: 'Google services failed to load. Please refresh and try again.',
          life: 4000
        });
      }
      console.error('[RegisterComponent] Google Identity Services SDK not available.');
      setTimeout(() => {
        this.useGoogleButton = false;
        this.cdr.detectChanges();
      }, 0);
      return null;
    }

    if (!this.googleInitialized) {
      googleGlobal.accounts.id.initialize({
        client_id: this.googleClientId,
        callback: this.handleGoogleCredential,
        context: 'signup',
        ux_mode: 'popup'
      });

      setTimeout(() => {
        if (this.useGoogleButton) {
          this.renderGoogleButton(googleGlobal);
          this.attachResizeHandler(googleGlobal);
        }
        this.cdr.detectChanges();
      }, 0);

      this.googleInitialized = true;
    }

    return googleGlobal;
  }

  private renderGoogleButton(googleGlobal: GoogleIdentity) {
    const buttonContainer = this.document?.getElementById('googleButtonContainerRegister');
    if (!buttonContainer) return;
    // Clear previous content to allow re-rendering on resize
    buttonContainer.innerHTML = '';
    const containerWidth = Math.max(200, Math.min(buttonContainer.clientWidth || 0, 480));
    googleGlobal.accounts.id.renderButton(buttonContainer, {
      type: 'standard',
      theme: 'filled_black',
      size: 'large',
      text: 'continue_with',
      shape: 'pill',
      width: containerWidth,
      logo_alignment: 'left'
    });
  }

  private attachResizeHandler(googleGlobal: GoogleIdentity) {
    const handler = () => this.renderGoogleButton(googleGlobal);
    window.addEventListener('resize', handler);
    this.removeResizeListener = () => window.removeEventListener('resize', handler);
  }

  ngOnDestroy(): void {
    this.removeResizeListener?.();
  }

  private readonly handleGoogleCredential = (response: google.accounts.id.CredentialResponse) => {
    if (!response.credential) {
      console.warn('[RegisterComponent] Received Google callback without credential.');
      return;
    }

    this.loading = true;

    this.authService.loginWithGoogle(response.credential).subscribe({
      next: () => {
        this.loading = false;
        if (this.authService.isAdmin()) {
          this.router.navigate(['/admin']);
        } else if (this.authService.isUser()) {
          this.router.navigate(['/user']);
        } else {
          this.router.navigate(['/']);
        }
      },
      error: (error) => {
        console.error('Google sign-up failed:', error);
        this.loading = false;
        this.messageService.add({
          key: 'auth',
          severity: 'error',
          summary: 'Google sign-up failed',
          detail: 'We could not sign you up with Google. Please try again.',
          life: 4000
        });
      }
    });
  };

  onSwitchToLogin() {
    this.switchToLogin.emit();
  }
}


