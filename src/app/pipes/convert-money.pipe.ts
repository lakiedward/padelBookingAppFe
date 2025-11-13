import { Pipe, PipeTransform } from '@angular/core';
import { CurrencyService } from '../services/currency.service';

@Pipe({
  name: 'convertMoney',
  standalone: true,
  pure: false
})
export class ConvertMoneyPipe implements PipeTransform {
  constructor(private currency: CurrencyService) {}
  transform(value: number | null | undefined, fromCurrency: string = 'EUR', toCurrency?: string): string {
    const amount = typeof value === 'number' ? value : 0;
    const target = (toCurrency || this.currency.getSelectedCurrency());
    return this.currency.convertAndFormat(amount, fromCurrency, target);
  }
}
