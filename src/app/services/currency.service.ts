import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class CurrencyService {
  private selected: string = 'EUR';
  private ratesBase: string = 'EUR';
  private rates: Record<string, number> | null = null;
  private lastFetch = 0;
  private ttlMs = 12 * 60 * 60 * 1000;

  constructor() {
    this.selected = 'EUR';
    this.loadCachedRates();
    this.ensureRates();
  }

  getSelectedCurrency(): string {
    return 'EUR';
  }

  setSelectedCurrency(code: string) {
    this.selected = 'EUR';
    try { localStorage.setItem('pb_user_currency', 'EUR'); } catch {}
  }

  format(amount: number, currency: string): string {
    try {
      return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(amount);
    } catch {
      return `${amount.toFixed(2)} EUR`;
    }
  }

  convert(amount: number, from: string, to: string): number {
    const f = (from || 'EUR').toUpperCase();
    const t = (to || 'EUR').toUpperCase();
    if (isNaN(amount)) return 0;
    if (f === t) return amount;
    if (!this.rates) return amount;

    const base = this.ratesBase.toUpperCase();
    const toRate = this.rates[t];

    if (f === base && toRate) {
      return amount * toRate;
    }

    const fromRate = this.rates[f];
    if (fromRate && toRate) {
      return (amount / fromRate) * toRate;
    }
    return amount;
  }

  convertAndFormat(amount: number, from: string, to: string): string {
    return this.format(amount, 'EUR');
  }

  private detectUserCurrency(): string {
    try {
      const saved = localStorage.getItem('pb_user_currency');
      if (saved) return saved.toUpperCase();
    } catch {}

    const locale = (navigator.language || 'en-GB').toLowerCase();
    const region = (locale.split('-')[1] || 'GB').toUpperCase();
    const map: Record<string, string> = {
      RO: 'RON', GB: 'GBP', IE: 'EUR', FR: 'EUR', DE: 'EUR', ES: 'EUR', IT: 'EUR', NL: 'EUR', BE: 'EUR', PT: 'EUR',
      US: 'USD', CA: 'CAD', AU: 'AUD', NZ: 'NZD', CH: 'CHF', SE: 'SEK', NO: 'NOK', DK: 'DKK', PL: 'PLN', CZ: 'CZK',
      HU: 'HUF', BG: 'BGN', HR: 'EUR', GR: 'EUR', FI: 'EUR', AT: 'EUR',
    };
    return map[region] || 'EUR';
  }

  private loadCachedRates() {
    try {
      const raw = localStorage.getItem('pb_rates');
      const ts = Number(localStorage.getItem('pb_rates_ts') || '0');
      if (raw && ts && Date.now() - ts < this.ttlMs) {
        const obj = JSON.parse(raw);
        if (obj && obj.base && obj.rates) {
          this.ratesBase = obj.base.toUpperCase();
          this.rates = obj.rates;
          this.lastFetch = ts;
        }
      }
    } catch {}
  }

  private async ensureRates() {
    if (this.rates && Date.now() - this.lastFetch < this.ttlMs) return;
    try {
      const api = environment.apiBaseUrl || '';
      const res = await fetch(`${api}/api/public/currency/rates?base=EUR`);
      if (!res.ok) throw new Error('failed');
      const json = await res.json();
      if (json && json.rates && json.base) {
        this.ratesBase = (json.base as string || 'EUR').toUpperCase();
        this.rates = json.rates as Record<string, number>;
        this.lastFetch = Date.now();
        try {
          localStorage.setItem('pb_rates', JSON.stringify({ base: this.ratesBase, rates: this.rates }));
          localStorage.setItem('pb_rates_ts', String(this.lastFetch));
        } catch {}
      }
    } catch {
    }
  }
}
