import { Component, EventEmitter, Output, AfterViewInit, inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { CommonModule, DOCUMENT, isPlatformBrowser } from '@angular/common';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../environments/environment';

interface CredentialResponse {
  credential: string;
  select_by?: string;
  clientId?: string;
}

interface GoogleAccountsId {
  initialize(config: {
    client_id: string;
    callback: (response: CredentialResponse) => void;
    context?: string;
    ux_mode?: string;
  }): void;
  prompt(): void;
  renderButton(
    parent: HTMLElement,
    options: {
      type?: string;
      theme?: string;
      size?: string;
      text?: string;
      shape?: string;
      width?: number;
      logo_alignment?: string;
    }
  ): void;
}

interface GoogleIdentity {
  accounts: {
    id: GoogleAccountsId;
  };
}

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
  useGoogleButton = true;
  private readonly googleClientId = environment.googleClientId;
  private googleInitialized = false;
  @Output() switchToRegister = new EventEmitter<void>();
  private readonly platformId = inject(PLATFORM_ID);
  private readonly document = inject(DOCUMENT);
  private readonly cdr = inject(ChangeDetectorRef);
  private removeResizeListener?: () => void;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private messageService: MessageService,
    private route: ActivatedRoute
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      rememberMe: [false]
    });

    this.loginForm.valueChanges.subscribe(() => {
      if (this.authError) {
        this.authError = false;
        // Clear auth error from individual fields
        const emailCtrl = this.loginForm.get('email');
        const passCtrl = this.loginForm.get('password');
        
        if (emailCtrl?.errors?.['auth']) {
          const { auth, ...otherErrors } = emailCtrl.errors;
          emailCtrl.setErrors(Object.keys(otherErrors).length ? otherErrors : null);
        }
        
        if (passCtrl?.errors?.['auth']) {
          const { auth, ...otherErrors } = passCtrl.errors;
          passCtrl.setErrors(Object.keys(otherErrors).length ? otherErrors : null);
        }
      }
    });
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.waitForGoogleSDK().then(() => {
      this.getGoogleIdentity();
    }).catch(() => {
      setTimeout(() => {
        this.useGoogleButton = false;
        this.cdr.detectChanges();
      }, 0);
    });

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

  private handlePostLoginRedirect() {
    // Check for pending booking in localStorage
    const pendingBooking = localStorage.getItem('pendingBooking');
    if (pendingBooking) {
      localStorage.removeItem('pendingBooking');
      const booking = JSON.parse(pendingBooking);
      // Navigate back to booking page with the same parameters
      this.router.navigate(['/booking', booking.timeSlotId], {
        queryParams: {
          courtId: booking.courtId,
          date: booking.date,
          start: booking.startTime,
          end: booking.endTime,
          price: booking.price,
          currency: booking.currency
        }
      });
      return true;
    }

    // Check for returnUrl query parameter
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    if (returnUrl) {
      this.router.navigateByUrl(returnUrl);
      return true;
    }

    return false;
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

  onSignIn() {
    this.submitted = true;
    this.authError = false;
    
    // Clear any previous auth errors before validation
    const emailCtrl = this.loginForm.get('email');
    const passCtrl = this.loginForm.get('password');
    
    if (emailCtrl?.errors?.['auth']) {
      const { auth, ...otherErrors } = emailCtrl.errors;
      emailCtrl.setErrors(Object.keys(otherErrors).length ? otherErrors : null);
    }
    
    if (passCtrl?.errors?.['auth']) {
      const { auth, ...otherErrors } = passCtrl.errors;
      passCtrl.setErrors(Object.keys(otherErrors).length ? otherErrors : null);
    }
    
    if (!this.loginForm.valid || this.loading) return;

    this.loading = true;
    const { email, password } = this.loginForm.value;

    this.authService.login(email, password).subscribe({
      next: () => {
        this.loading = false;
        if (!this.handlePostLoginRedirect()) {
          if (this.authService.isAdmin()) {
            this.router.navigate(['/admin']);
          } else if (this.authService.isUser()) {
            this.router.navigate(['/courts']);
          }
        }
      },
      error: () => {
        this.loading = false;
        this.authError = true;
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
  }

  onGoogleSignIn() {
    if (this.loading) return;
    if (!isPlatformBrowser(this.platformId)) return;

    const googleInstance = this.getGoogleIdentity(true);
    if (!googleInstance) {
      return;
    }

    this.authError = false;
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
          summary: 'Google Sign-In unavailable',
          detail: 'Google authentication is not configured for this environment.',
          life: 4000
        });
      }
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
          summary: 'Google Sign-In unavailable',
          detail: 'Google services failed to load. Please refresh and try again.',
          life: 4000
        });
      }
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
        context: 'signin',
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
    const buttonContainer = this.document?.getElementById('googleButtonContainer');
    if (!buttonContainer) return;
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

  private readonly handleGoogleCredential = (response: CredentialResponse) => {
    if (!response.credential) {
      return;
    }

    this.loading = true;
    this.authError = false;

    this.authService.loginWithGoogle(response.credential).subscribe({
      next: () => {
        this.loading = false;
        if (!this.handlePostLoginRedirect()) {
          if (this.authService.isAdmin()) {
            this.router.navigate(['/admin']);
          } else if (this.authService.isUser()) {
            this.router.navigate(['/courts']);
          } else {
            this.router.navigate(['/']);
          }
        }
      },
      error: () => {
        this.loading = false;
        this.authError = true;
        this.messageService.add({
          key: 'auth',
          severity: 'error',
          summary: 'Google sign-in failed',
          detail: 'We could not sign you in with Google. Please try again.',
          life: 4000
        });
      }
    });
  };
}
