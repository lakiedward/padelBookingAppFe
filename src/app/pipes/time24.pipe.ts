import { Pipe, PipeTransform } from '@angular/core';

/**
 * Pipe to ensure time is displayed in 24-hour format (HH:mm)
 * Handles various input formats:
 * - Date objects
 * - Time strings (HH:mm, H:mm, HH:MM AM/PM, etc.)
 * - ISO datetime strings
 */
@Pipe({
  name: 'time24',
  standalone: true
})
export class Time24Pipe implements PipeTransform {
  
  transform(value: Date | string | null | undefined): string {
    if (!value) return '00:00';
    
    // If it's a Date object
    if (value instanceof Date) {
      return this.formatDateToTime24(value);
    }
    
    // If it's a string
    if (typeof value === 'string') {
      // Already in HH:mm format (24-hour)
      if (/^\d{1,2}:\d{2}$/.test(value)) {
        return this.normalizeTime24(value);
      }
      
      // Try to parse as ISO datetime or other date string
      const parsed = new Date(value);
      if (!isNaN(parsed.getTime())) {
        return this.formatDateToTime24(parsed);
      }
      
      // Try to handle AM/PM format
      if (/am|pm/i.test(value)) {
        return this.convertAmPmTo24(value);
      }
    }
    
    return '00:00';
  }
  
  private formatDateToTime24(date: Date): string {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }
  
  private normalizeTime24(time: string): string {
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours, 10);
    const m = parseInt(minutes, 10);
    
    if (isNaN(h) || isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) {
      return '00:00';
    }
    
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }
  
  private convertAmPmTo24(time: string): string {
    // Remove spaces and convert to lowercase
    const normalized = time.trim().toLowerCase();
    
    // Extract time and AM/PM
    const match = normalized.match(/(\d{1,2}):(\d{2})\s*(am|pm)/);
    if (!match) return '00:00';
    
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const period = match[3];
    
    // Convert to 24-hour format
    if (period === 'pm' && hours !== 12) {
      hours += 12;
    } else if (period === 'am' && hours === 12) {
      hours = 0;
    }
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }
}

