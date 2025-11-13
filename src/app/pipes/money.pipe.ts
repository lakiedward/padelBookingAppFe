import { Pipe, PipeTransform } from '@angular/core';
import { CurrencyService } from '../services/currency.service';

@Pipe({
  name: 'money',
  standalone: true
})
export class MoneyPipe implements PipeTransform {
  constructor(private currency: CurrencyService) {}
  transform(value: number | null | undefined, currencyCode: string = 'EUR'): string {
    const amount = typeof value === 'number' ? value : 0;
    return this.currency.format(amount, currencyCode);
  }
}
