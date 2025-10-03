import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NavItem } from '../../../../core/models/navigation';

@Component({
  selector: 'pros-layout-header',
  standalone: true,
  imports: [NgFor, NgIf, RouterLink, RouterLinkActive],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent {
  @Input({ required: true }) navItems: NavItem[] = [];
  @Input() showAccount = true;
  @Input() isAuthenticated = false;
  @Input() userLabel = 'Conta';
  @Output() accountClick = new EventEmitter<void>();
  @Output() logout = new EventEmitter<void>();

  trackByLabel(_: number, item: NavItem): string {
    return item.label;
  }
}
