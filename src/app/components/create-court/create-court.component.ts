import { Component, EventEmitter, Input, Output, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { SportKey } from '../../models/club.models';
import { AvailabilityRule, DateRule, WeeklyRule, Weekday, CourtCreatePayload, EquipmentItem, CourtResponse } from '../../models/court.models';
import { CourtService } from '../../services/court.service';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';

// Types imported from models/court.models

@Component({
  selector: 'app-create-court',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SelectModule, DatePickerModule],
  templateUrl: './create-court.component.html',
  styleUrl: './create-court.component.scss'
})
export class CreateCourtComponent implements OnInit, OnDestroy {
  @Output() cancel = new EventEmitter<void>();
  @Output() saved = new EventEmitter<any>();
  @Input() sports: SportKey[] = [];
  @Input() courtId?: number; // If provided, component is in edit mode
  @Input() existingCourt?: CourtResponse; // Pre-loaded court data

  form: FormGroup;
  ruleForm: FormGroup;
  equipForm: FormGroup;
  
  isEditMode = false;
  isLoading = false;
  saveError: string | null = null;

  constructor(
    private fb: FormBuilder,
    private courtService: CourtService
  ) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      sport: new FormControl<SportKey | ''>('', { nonNullable: true, validators: [Validators.required] }),
      description: new FormControl<string>('', { nonNullable: true }),
      heated: new FormControl<boolean>(false, { nonNullable: true }),
      indoor: new FormControl<boolean>(false, { nonNullable: true }),
      surfaceType: new FormControl<string>('', { nonNullable: true }),
      newTag: new FormControl<string>('', { nonNullable: true })
    });
    // Initialize with Date objects for time fields (12:00 PM = noon)
    const defaultStart = this.createTimeDate(12, 0);
    const defaultEnd = this.createTimeDate(16, 0);
    
    this.ruleForm = this.fb.group({
      mode: new FormControl<'weekly' | 'date'>('weekly', { nonNullable: true }),
      weekdays: new FormControl<Weekday[]>([], { nonNullable: true }),
      date: new FormControl<string>('', { nonNullable: true }),
      startTime: new FormControl<Date>(defaultStart, { nonNullable: true }),
      endTime: new FormControl<Date>(defaultEnd, { nonNullable: true }),
      slotMinutes: new FormControl<number>(60, { nonNullable: true }),
      price: new FormControl<number>(50, { nonNullable: true }),
    });
    this.equipForm = this.fb.group({
      name: new FormControl<string>('', { nonNullable: true }),
      pricePerHour: new FormControl<number>(0, { nonNullable: true })
    });
  }

  ngOnInit() {
    this.isEditMode = !!this.courtId;
    
    // Load existing court data if in edit mode
    if (this.isEditMode && this.existingCourt) {
      this.loadExistingCourt(this.existingCourt);
    } else if (this.isEditMode && this.courtId) {
      // Fetch court data if not provided
      this.isLoading = true;
      this.courtService.getCourtById(this.courtId).subscribe({
        next: (court) => {
          this.loadExistingCourt(court);
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Failed to load court:', err);
          this.saveError = 'Failed to load court data';
          this.isLoading = false;
        }
      });
    }
  }

  onCancel() { this.cancel.emit(); }

  tags: string[] = [];
  rules: AvailabilityRule[] = [];
  equipment: EquipmentItem[] = [];
  mediaFiles: File[] = [];
  mediaPreviews: string[] = [];
  existingPhotoIds: (number | null)[] = []; // Track which previews are existing photos (null = new file)
  draggingMediaIndex: number | null = null;
  dragOverMediaIndex: number | null = null;

  weekdays = [
    { n: 1 as Weekday, label: 'Mon' },
    { n: 2 as Weekday, label: 'Tue' },
    { n: 3 as Weekday, label: 'Wed' },
    { n: 4 as Weekday, label: 'Thu' },
    { n: 5 as Weekday, label: 'Fri' },
    { n: 6 as Weekday, label: 'Sat' },
    { n: 0 as Weekday, label: 'Sun' },
  ];

  surfaceTypes = [
    { value: 'clay', label: 'Clay' },
    { value: 'grass', label: 'Grass' },
    { value: 'hard', label: 'Hard Court' },
    { value: 'carpet', label: 'Carpet' },
    { value: 'artificial-grass', label: 'Artificial Grass' },
    { value: 'concrete', label: 'Concrete' },
    { value: 'synthetic', label: 'Synthetic' },
    { value: 'wood', label: 'Wood' },
    { value: 'acrylic', label: 'Acrylic' }
  ];

  // Dropdown options for sports
  get sportOptions() {
    return this.sports.map(sport => ({
      label: this.capitalize(sport),
      value: sport
    }));
  }

  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  addTag() {
    const raw = (this.form.get('newTag') as FormControl<string>).value || '';
    const tag = raw.trim().replace(/\s+/g, ' ');
    if (!tag) return;
    const exists = this.tags.some(t => t.toLowerCase() === tag.toLowerCase());
    if (!exists) {
      this.tags.push(tag);
    }
    (this.form.get('newTag') as FormControl<string>).setValue('');
  }

  removeTag(index: number) {
    this.tags.splice(index, 1);
  }

  addEquipment() {
    const nameCtrl = this.equipForm.get('name') as FormControl<string>;
    const priceCtrl = this.equipForm.get('pricePerHour') as FormControl<number>;
    const name = (nameCtrl.value || '').trim();
    const priceRaw = Number(priceCtrl.value);
    if (!name) return;
    if (Number.isNaN(priceRaw) || priceRaw < 0) return;
    const item: EquipmentItem = { name, pricePerHour: Number(priceRaw) };
    this.equipment.push(item);
    nameCtrl.setValue('');
    priceCtrl.setValue(0);
  }

  removeEquipment(index: number) {
    this.equipment.splice(index, 1);
  }

  isWeeklyMode(): boolean { return (this.ruleForm.get('mode') as FormControl).value === 'weekly'; }
  isDateMode(): boolean { return (this.ruleForm.get('mode') as FormControl).value === 'date'; }

  toggleMode(mode: 'weekly' | 'date') {
    (this.ruleForm.get('mode') as FormControl).setValue(mode);
  }

  weekdayActive(n: Weekday): boolean {
    const arr = (this.ruleForm.get('weekdays') as FormControl<Weekday[]>).value;
    return arr.includes(n);
  }

  toggleWeekday(n: Weekday) {
    const ctrl = this.ruleForm.get('weekdays') as FormControl<Weekday[]>;
    const arr = [...ctrl.value];
    const idx = arr.indexOf(n);
    if (idx >= 0) arr.splice(idx, 1); else arr.push(n);
    ctrl.setValue(arr);
  }

  addRule() {
    const v = this.ruleForm.value as any;
    
    // Convert Date objects to HH:mm strings
    const startTimeStr = this.dateToTimeString(v.startTime);
    const endTimeStr = this.dateToTimeString(v.endTime);
    
    const start = this.parseTime(startTimeStr);
    const end = this.parseTime(endTimeStr);
    if (!(typeof start === 'number' && typeof end === 'number' && start < end)) return;
    if (!v.slotMinutes || v.slotMinutes <= 0) return;
    if (!v.price || v.price < 0) return;

    if (v.mode === 'weekly') {
      const days: Weekday[] = (this.ruleForm.get('weekdays') as FormControl<Weekday[]>).value;
      if (!days.length) return;
      const rule: WeeklyRule = {
        type: 'weekly',
        id: this.genRuleId(),
        startTime: startTimeStr,
        endTime: endTimeStr,
        slotMinutes: Number(v.slotMinutes),
        price: Number(v.price),
        weekdays: days.slice().sort((a,b)=>a-b)
      };
      this.rules.push(rule);
    } else {
      if (!v.date) return;
      const rule: DateRule = {
        type: 'date',
        id: this.genRuleId(),
        startTime: startTimeStr,
        endTime: endTimeStr,
        slotMinutes: Number(v.slotMinutes),
        price: Number(v.price),
        date: v.date
      };
      this.rules.push(rule);
    }

    // Reset per-mode fields (keep time/duration/price for quick adding)
    if (this.isWeeklyMode()) {
      (this.ruleForm.get('weekdays') as FormControl<Weekday[]>).setValue([]);
    } else {
      (this.ruleForm.get('date') as FormControl<string>).setValue('');
    }
    
    // Reset time fields to defaults for next rule
    const defaultStart = this.createTimeDate(12, 0);
    const defaultEnd = this.createTimeDate(16, 0);
    (this.ruleForm.get('startTime') as FormControl<Date>).setValue(defaultStart);
    (this.ruleForm.get('endTime') as FormControl<Date>).setValue(defaultEnd);
  }

  removeRule(index: number) {
    this.rules.splice(index, 1);
  }

  slotsPerDayForCurrent(): number {
    const v = this.ruleForm.value as any;
    const startTimeStr = this.dateToTimeString(v.startTime);
    const endTimeStr = this.dateToTimeString(v.endTime);
    const start = this.parseTime(startTimeStr);
    const end = this.parseTime(endTimeStr);
    if (!(start < end) || !v.slotMinutes) return 0;
    return Math.max(0, Math.floor((end - start) / Number(v.slotMinutes)));
  }

  private parseTime(s: string): number {
    if (!s) return NaN as any;
    const [hh, mm] = s.split(':').map((x: string) => Number(x));
    if (Number.isNaN(hh) || Number.isNaN(mm)) return NaN as any;
    return hh * 60 + mm;
  }

  // Helper to create a Date object with specific hours and minutes (for time-only input)
  private createTimeDate(hours: number, minutes: number): Date {
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  }

  // Convert Date object to HH:mm string
  private dateToTimeString(date: Date | null | undefined): string {
    if (!date || !(date instanceof Date)) return '00:00';
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  // Convert HH:mm string to Date object
  private timeStringToDate(timeStr: string): Date {
    if (!timeStr) return this.createTimeDate(0, 0);
    const [hours, minutes] = timeStr.split(':').map(x => parseInt(x, 10) || 0);
    return this.createTimeDate(hours, minutes);
  }

  isWeeklyRule(r: AvailabilityRule): r is WeeklyRule { return r.type === 'weekly'; }
  isDateRule(r: AvailabilityRule): r is DateRule { return r.type === 'date'; }
  weekdaysLabel(r: AvailabilityRule): string { return this.isWeeklyRule(r) ? r.weekdays.join(',') : ''; }
  dateLabel(r: AvailabilityRule): string { return this.isDateRule(r) ? r.date : ''; }

  onSave() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    
    this.isLoading = true;
    this.saveError = null;
    
    const v = this.form.value;
    
    // Build tags array including characteristics
    const allTags = [...this.tags];
    
    // Add temperature characteristic
    if (v.heated) {
      allTags.push('Heated');
    } else {
      allTags.push('Unheated');
    }
    
    // Add environment characteristic
    if (v.indoor) {
      allTags.push('Indoor');
    } else {
      allTags.push('Outdoor');
    }
    
    // Add surface type if selected
    if (v.surfaceType) {
      const surfaceLabel = this.surfaceTypes.find(s => s.value === v.surfaceType)?.label;
      if (surfaceLabel) {
        allTags.push(surfaceLabel);
      }
    }
    
    const details = {
      name: v.name,
      sport: v.sport,
      description: v.description || null,
      tags: allTags,
      rules: this.rules,
      equipment: this.equipment
    };

    const operation = this.isEditMode && this.courtId
      ? this.courtService.updateCourt(this.courtId, details, this.mediaFiles)
      : this.courtService.createCourt(details, this.mediaFiles);

    operation.subscribe({
      next: (result) => {
        this.isLoading = false;
        console.log(this.isEditMode ? 'Court updated:' : 'Court created:', result);
        this.saved.emit(result);
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Failed to save court:', err);
        
        // Check if error is about sport not configured
        const errorMsg = err.error?.error || err.message || 'Failed to save court';
        if (errorMsg.includes('not configured for this club')) {
          const sport = this.form.get('sport')?.value;
          const sportName = sport ? sport.charAt(0).toUpperCase() + sport.slice(1) : 'This sport';
          this.saveError = `${sportName} is not configured for your club. Go to Club Management → add ${sport || 'this sport'} to your club's sports list.`;
        } else {
          this.saveError = errorMsg;
        }
      }
    });
  }

  private loadExistingCourt(court: CourtResponse) {
    // Check for heated/indoor in tags
    const isHeated = court.tags.some(tag => 
      tag.toLowerCase() === 'heated'
    );
    const isIndoor = court.tags.some(tag => 
      tag.toLowerCase() === 'indoor'
    );
    
    // Check for surface type in tags
    const surfaceType = this.surfaceTypes.find(surface =>
      court.tags.some(tag => tag.toLowerCase() === surface.label.toLowerCase())
    )?.value || '';
    
    // Populate form fields
    this.form.patchValue({
      name: court.name,
      sport: court.sport as SportKey,
      description: court.description || '',
      heated: isHeated,
      indoor: isIndoor,
      surfaceType: surfaceType
    });

    // Get all surface type labels for filtering
    const surfaceLabels = this.surfaceTypes.map(s => s.label.toLowerCase());
    
    // Load tags (filter out characteristics that are now in separate controls)
    this.tags = court.tags.filter(tag => {
      const lowerTag = tag.toLowerCase();
      return !['heated', 'unheated', 'indoor', 'outdoor'].includes(lowerTag) &&
             !surfaceLabels.includes(lowerTag);
    });

    // Load equipment
    this.equipment = court.equipment.map(e => 
      this.courtService.mapEquipmentToFrontend(e)
    );

    // Load availability rules
    this.rules = court.availabilityRules.map(r => 
      this.courtService.mapRuleToFrontend(r)
    );

    // If there are rules, set default time inputs from first rule
    if (this.rules.length > 0) {
      const firstRule = this.rules[0];
      this.ruleForm.patchValue({
        startTime: this.timeStringToDate(firstRule.startTime),
        endTime: this.timeStringToDate(firstRule.endTime),
        slotMinutes: firstRule.slotMinutes,
        price: firstRule.price
      });
    }

    // Load photos as preview URLs (but can't edit existing images directly)
    // Users can only add new images in edit mode
    if (court.photos && court.photos.length > 0) {
      // Sort photos by orderIndex to maintain proper order
      const sortedPhotos = [...court.photos].sort((a, b) => a.orderIndex - b.orderIndex);
      
      sortedPhotos.forEach(photo => {
        if (photo.url) {
          const absoluteUrl = this.courtService.toAbsoluteUrl(photo.url);
          if (absoluteUrl) {
            this.mediaPreviews.push(absoluteUrl);
            this.existingPhotoIds.push(photo.id); // Track existing photo ID
          }
        }
      });
    }
  }

  private genRuleId(): string {
    return 'rule_' + Math.random().toString(36).slice(2, 10);
  }

  onMediaSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (!files || files.length === 0) return;
    for (let i = 0; i < files.length; i++) {
      const f = files.item(i)!;
      if (!f.type.startsWith('image/')) continue;
      this.mediaFiles.push(f);
      const url = URL.createObjectURL(f);
      this.mediaPreviews.push(url);
      this.existingPhotoIds.push(null); // null = new file, not an existing photo
    }
    input.value = '';
  }

  removeMedia(index: number) {
    const url = this.mediaPreviews[index];
    const photoId = this.existingPhotoIds[index];
    
    // If it's an existing photo (has photoId), delete it from server immediately
    if (photoId !== null) {
      // Delete from server
      this.courtService.deleteCourtPhoto(photoId).subscribe({
        next: () => {
          console.log(`Photo ${photoId} deleted successfully from server`);
        },
        error: (err) => {
          console.error('Failed to delete photo from server:', err);
          // Photo was removed from UI but failed to delete from server
          // Could show a subtle notification here if needed
        }
      });
      
      // Remove from UI immediately (optimistic UI update)
      this.mediaPreviews.splice(index, 1);
      this.existingPhotoIds.splice(index, 1);
    } else {
      // It's a new file (photoId is null), just remove from memory
      if (url && url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
      
      // Find the corresponding index in mediaFiles (count nulls before this index)
      const fileIndex = this.existingPhotoIds.slice(0, index).filter(id => id === null).length;
      this.mediaFiles.splice(fileIndex, 1);
      
      // Remove from preview and tracking arrays
      this.mediaPreviews.splice(index, 1);
      this.existingPhotoIds.splice(index, 1);
    }
  }

  onMediaDragStart(index: number, event: DragEvent) {
    this.draggingMediaIndex = index;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      try { event.dataTransfer.setData('text/plain', String(index)); } catch {}
    }
  }

  onMediaDragEnter(index: number, event: DragEvent) {
    event.preventDefault();
    this.dragOverMediaIndex = index;
  }

  onMediaDragOver(index: number, event: DragEvent) {
    event.preventDefault();
    this.dragOverMediaIndex = index;
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
  }

  onMediaDragLeave(index: number, _event: DragEvent) {
    if (this.dragOverMediaIndex === index) this.dragOverMediaIndex = null;
  }

  onMediaDrop(index: number, event: DragEvent) {
    event.preventDefault();
    const data = event.dataTransfer?.getData('text/plain');
    let from = this.draggingMediaIndex;
    if ((from == null || Number.isNaN(from)) && data) {
      const parsed = parseInt(data, 10);
      if (!Number.isNaN(parsed)) from = parsed;
    }
    if (from == null || from === index) {
      this.dragOverMediaIndex = null;
      this.draggingMediaIndex = null;
      return;
    }
    
    // Build a map to track which file belongs to which preview index before reordering
    const fileMap = new Map<number, File>();
    let fileIdx = 0;
    for (let i = 0; i < this.existingPhotoIds.length; i++) {
      if (this.existingPhotoIds[i] === null && fileIdx < this.mediaFiles.length) {
        fileMap.set(i, this.mediaFiles[fileIdx]);
        fileIdx++;
      }
    }
    
    // Reorder preview and tracking arrays
    this.moveItem(this.mediaPreviews, from, index);
    this.moveItem(this.existingPhotoIds, from, index);
    
    // Rebuild mediaFiles in the new order
    const newMediaFiles: File[] = [];
    for (let i = 0; i < this.existingPhotoIds.length; i++) {
      if (this.existingPhotoIds[i] === null) {
        // This was a new file - find which file it was before reordering
        const oldIndex = this.findOldIndex(i, from, index);
        const file = fileMap.get(oldIndex);
        if (file) {
          newMediaFiles.push(file);
        }
      }
    }
    this.mediaFiles = newMediaFiles;
    
    this.dragOverMediaIndex = null;
    this.draggingMediaIndex = null;
  }
  
  // Helper to find the original index before drag-and-drop reordering
  private findOldIndex(currentIndex: number, from: number, to: number): number {
    if (currentIndex === to) {
      return from;
    } else if (from < to && currentIndex >= from && currentIndex < to) {
      return currentIndex + 1;
    } else if (from > to && currentIndex > to && currentIndex <= from) {
      return currentIndex - 1;
    }
    return currentIndex;
  }

  onMediaDragEnd(_event: DragEvent) {
    this.dragOverMediaIndex = null;
    this.draggingMediaIndex = null;
  }

  private moveItem<T>(arr: T[], from: number, to: number) {
    if (from < 0 || from >= arr.length || to < 0 || to >= arr.length) return;
    const [item] = arr.splice(from, 1);
    arr.splice(to, 0, item);
  }

  ngOnDestroy(): void {
    // Only revoke blob URLs (newly uploaded files), not server URLs
    for (let i = 0; i < this.mediaPreviews.length; i++) {
      const url = this.mediaPreviews[i];
      const photoId = this.existingPhotoIds[i];
      
      // Only revoke if it's a new file (photoId is null) and it's a blob URL
      if (photoId === null && url && url.startsWith('blob:')) {
        try { URL.revokeObjectURL(url); } catch {}
      }
    }
  }
}
