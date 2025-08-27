import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ClubDetailsComponent } from '../club-details/club-details.component';

type AdminMenuKey = 'club-details' | 'courts';

@Component({
  selector: 'app-admin-view',
  standalone: true,
  imports: [CommonModule, ClubDetailsComponent],
  templateUrl: './admin-view.component.html',
  styleUrl: './admin-view.component.scss'
})
export class AdminViewComponent {
  selectedMenu: AdminMenuKey = 'club-details';

  select(menu: AdminMenuKey) {
    this.selectedMenu = menu;
  }
}


