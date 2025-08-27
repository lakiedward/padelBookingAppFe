import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';

declare global {
  interface Window { google?: any }
}

@Injectable({ providedIn: 'root' })
export class GoogleAuthService {
  private clientId: string | null = null;
  private initialized = false;

  constructor(@Inject(PLATFORM_ID) private platformId: Object, @Inject(DOCUMENT) private doc: Document) {
    if (isPlatformBrowser(this.platformId)) {
      const meta = this.doc.querySelector('meta[name="google-signin-client_id"]') as HTMLMetaElement | null;
      this.clientId = meta?.content || null;
    }
  }

  async ensureLoaded(): Promise<void> {
    if (this.initialized) return;
    if (!isPlatformBrowser(this.platformId)) { return; }
    await new Promise<void>((resolve) => {
      if (typeof window !== 'undefined' && window.google && window.google.accounts && window.google.accounts.oauth2) {
        resolve();
        return;
      }
      const check = () => {
        if (typeof window !== 'undefined' && window.google && window.google.accounts && window.google.accounts.oauth2) {
          resolve();
        } else {
          setTimeout(check, 50);
        }
      };
      check();
    });
    this.initialized = true;
  }

  async signInWithGoogle(): Promise<{ credential?: string; error?: string }> {
    if (!isPlatformBrowser(this.platformId)) {
      return { error: 'Google sign-in is only available in the browser.' };
    }
    if (!this.clientId) {
      return { error: 'Missing Google client ID. Set meta google-signin-client_id.' };
    }
    await this.ensureLoaded();
    return new Promise((resolve) => {
      window.google!.accounts.oauth2.initCodeClient({
        client_id: this.clientId!,
        scope: 'openid email profile',
        ux_mode: 'popup',
        callback: (response: any) => {
          if (response && response.code) {
            // Return the authorization code; backend should exchange for tokens
            resolve({ credential: response.code });
          } else {
            resolve({ error: 'Google sign-in was cancelled or failed.' });
          }
        }
      }).requestCode();
    });
  }
}


