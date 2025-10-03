import { Component, EventEmitter, Output, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoginComponent } from '../login/login.component';
import { AuthService } from '../../../core/services/auth.service';
import { filter, take } from 'rxjs/operators';

@Component({
  selector: 'pros-auth-modal',
  standalone: true,
  imports: [CommonModule, LoginComponent],
  templateUrl: './auth-modal.component.html',
  styleUrls: ['./auth-modal.component.scss']
})
export class AuthModalComponent implements OnInit {
  @Output() closed = new EventEmitter<void>();
  constructor(private readonly auth: AuthService) {}

  close(): void { this.closed.emit(); }

  @HostListener('document:keydown.escape') onEsc() { this.close(); }

  ngOnInit(): void {
    // Fecha automaticamente quando autenticar (login bem-sucedido)
    this.auth.isAuthenticated$
      .pipe(
        filter(v => !!v),
        take(1)
      )
      .subscribe(() => this.close());
  }
}
