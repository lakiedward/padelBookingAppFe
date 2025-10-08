import { Component, EventEmitter, Input, Output, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { SportKey } from '../../models/club.models';
import { AvailabilityRule, DateRule, WeeklyRule, Weekday, CourtCreatePayload, EquipmentItem } from '../../models/court.models';

// Types imported from models/court.models

@Component({
  selector: 'app-create-court',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './create-court.component.html',
  styleUrl: './create-court.component.scss'
})
export class CreateCourtComponent implements OnDestroy {
  @Output() cancel = new EventEmitter<void>();
  @Output() saved = new EventEmitter<any>();
  @Input() sports: SportKey[] = [];

  form: FormGroup;
  ruleForm: FormGroup;
  equipForm: FormGroup;

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      sport: new FormControl<SportKey | ''>('', { nonNullable: true, validators: [Validators.required] }),
      newTag: new FormControl<string>('', { nonNullable: true })
    });
    this.ruleForm = this.fb.group({
      mode: new FormControl<'weekly' | 'date'>('weekly', { nonNullable: true }),
      weekdays: new FormControl<Weekday[]>([], { nonNullable: true }),
      date: new FormControl<string>('', { nonNullable: true }),
      startTime: new FormControl<string>('12:00', { nonNullable: true }),
      endTime: new FormControl<string>('16:00', { nonNullable: true }),
      slotMinutes: new FormControl<number>(60, { nonNullable: true }),
      price: new FormControl<number>(50, { nonNullable: true }),
    });
    this.equipForm = this.fb.group({
      name: new FormControl<string>('', { nonNullable: true }),
      pricePerHour: new FormControl<number>(0, { nonNullable: true })
    });
  }

  onCancel() { this.cancel.emit(); }

  tags: string[] = [];
  rules: AvailabilityRule[] = [];
  equipment: EquipmentItem[] = [];
  mediaFiles: File[] = [];
  mediaPreviews: string[] = [];
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
    const start = this.parseTime(v.startTime);
    const end = this.parseTime(v.endTime);
    if (!(typeof start === 'number' && typeof end === 'number' && start < end)) return;
    if (!v.slotMinutes || v.slotMinutes <= 0) return;
    if (!v.price || v.price < 0) return;

    if (v.mode === 'weekly') {
      const days: Weekday[] = (this.ruleForm.get('weekdays') as FormControl<Weekday[]>).value;
      if (!days.length) return;
      const rule: WeeklyRule = {
        type: 'weekly',
        id: this.genRuleId(),
        startTime: v.startTime,
        endTime: v.endTime,
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
        startTime: v.startTime,
        endTime: v.endTime,
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
  }

  removeRule(index: number) {
    this.rules.splice(index, 1);
  }

  slotsPerDayForCurrent(): number {
    const v = this.ruleForm.value as any;
    const start = this.parseTime(v.startTime);
    const end = this.parseTime(v.endTime);
    if (!(start < end) || !v.slotMinutes) return 0;
    return Math.max(0, Math.floor((end - start) / Number(v.slotMinutes)));
  }

  private parseTime(s: string): number {
    if (!s) return NaN as any;
    const [hh, mm] = s.split(':').map((x: string) => Number(x));
    if (Number.isNaN(hh) || Number.isNaN(mm)) return NaN as any;
    return hh * 60 + mm;
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
    const v = this.form.value;
    const payload: CourtCreatePayload = {
      name: v.name,
      sport: v.sport,
      tags: [...this.tags],
      rules: this.rules,
      equipment: this.equipment,
      images: this.mediaFiles
    };
    // For now, log the create payload and images; backend saving will mimic ClubDetails multipart
    console.log('CreateCourt: payload', payload);
    console.log('CreateCourt: images', this.mediaFiles);
    this.saved.emit(payload);
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
    }
    input.value = '';
  }

  removeMedia(index: number) {
    const url = this.mediaPreviews[index];
    if (url) URL.revokeObjectURL(url);
    this.mediaPreviews.splice(index, 1);
    this.mediaFiles.splice(index, 1);
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
    this.moveItem(this.mediaFiles, from, index);
    this.moveItem(this.mediaPreviews, from, index);
    this.dragOverMediaIndex = null;
    this.draggingMediaIndex = null;
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
    for (const url of this.mediaPreviews) {
      try { URL.revokeObjectURL(url); } catch {}
    }
  }
}
