import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SubscriptionService, UserSubscription, AccessStatus } from '../../core/services/subscription.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'pros-subscription-view',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
  <section class="subscription" aria-live="polite">
    <div class="container">
      <h1>Minha Assinatura</h1>

      <div *ngIf="isSystemAdmin()" class="empty" style="text-align:center;padding:1.5rem 0;margin-bottom:1rem;">
        <p style="font-weight:600">Administrador do Sistema: Acesso liberado sem assinatura</p>
      </div>

      <ng-container *ngIf="!isSystemAdmin()">

      <div class="loading" *ngIf="loading()">
        <span class="spinner" aria-hidden="true"></span>
        <p>Carregando assinatura…</p>
      </div>

      <div class="empty" *ngIf="!loading() && !error() && subscription() === null">
        <p>Você ainda não possui uma assinatura ativa.</p>
        <a routerLink="/planos" class="btn btn-primary">Ver Planos</a>
  </div>

  </ng-container>

      <div class="error" *ngIf="!loading() && error()">
        <p>{{ error() }}</p>
        <button class="btn btn-secondary" (click)="reload()">Tentar novamente</button>
      </div>

      <div class="sub-card" *ngIf="!loading() && subscription() as sub">
        <header class="sub-header">
          <h2>{{ sub.planName }}</h2>
          <span class="status" [attr.data-status]="sub.status">{{ humanStatus(sub.status) }}</span>
        </header>
        <p class="description" *ngIf="sub.description">{{ sub.description }}</p>
        <dl class="meta">
          <div *ngIf="sub.startedAt">
            <dt>Início</dt>
            <dd>{{ sub.startedAt | date:'shortDate' }}</dd>
          </div>
          <div *ngIf="sub.expiresAt">
            <dt>Expira em</dt>
            <dd>{{ sub.expiresAt | date:'shortDate' }}</dd>
          </div>
          <div *ngIf="sub.durationInDays">
            <dt>Duração</dt>
            <dd>{{ durationLabel(sub.durationInDays) }}</dd>
          </div>
        </dl>
        <div class="pricing" *ngIf="sub.currentPrice">
          <span class="old" *ngIf="showDiscount(sub)">{{ sub.originalPrice | currency:'BRL':'symbol':'1.2-2' }}</span>
          <span class="current">{{ sub.currentPrice | currency:'BRL':'symbol':'1.2-2' }}</span>
        </div>
      </div>
    </div>
  </section>
  `,
  styles: [`
  .subscription { padding:2.5rem 0 4rem; }
  h1 { font-size: clamp(1.75rem,4vw,2.5rem); margin-bottom:1.5rem; }
  .loading,.empty,.error { text-align:center; padding:3rem 0; }
  .spinner { width:2.75rem;height:2.75rem;border-radius:50%;border:3px solid rgba(91,95,99,.25);border-top-color:var(--color-primary-500,#6a5acd);display:inline-block;animation:spin 1s linear infinite;margin-bottom:1rem; }
  .sub-card { background:#fff; border:1px solid rgba(106,90,205,.15); border-radius:16px; padding:2rem 2.25rem; box-shadow:0 12px 32px rgba(31,36,43,.08); max-width:720px; }
  .sub-header { display:flex; flex-wrap:wrap; gap:1rem; align-items:center; justify-content:space-between; }
  .sub-header h2 { margin:0; font-size:1.5rem; }
  .status { font-size:.65rem; letter-spacing:.14em; text-transform:uppercase; font-weight:600; padding:.4rem .7rem; border-radius:999px; background:rgba(91,95,99,.15); }
  .status[data-status="ATIVA"], .status[data-status="ACTIVE"] { background:rgba(46,182,125,.18); color:#11805a; }
  .status[data-status="CANCELADA"], .status[data-status="CANCELED"] { background:rgba(255,82,82,.18); color:#b30021; }
  .description { margin:.75rem 0 1.25rem; color:var(--color-text-muted,#5b5f63); }
  dl.meta { display:flex; flex-wrap:wrap; gap:2rem; margin:0 0 1.5rem; }
  dl.meta div { min-width:120px; }
  dl.meta dt { font-size:.7rem; letter-spacing:.12em; text-transform:uppercase; font-weight:600; margin-bottom:.25rem; color:#555; }
  dl.meta dd { margin:0; font-weight:500; }
  .pricing { display:flex; align-items:baseline; gap:.75rem; font-weight:600; }
  .pricing .old { text-decoration:line-through; color:#888; font-weight:400; }
  .pricing .current { font-size:1.5rem; color:var(--color-primary-600,#5a4bcf); }
  @keyframes spin { to { transform: rotate(360deg);} }
  `]
})
export class SubscriptionViewComponent implements OnInit {
  private readonly service = inject(SubscriptionService);
  private readonly authService = inject(AuthService);

  readonly subscription = signal<UserSubscription | null | undefined>(undefined); // undefined=loading, null=sem assinatura
  readonly loading = computed(() => this.subscription() === undefined);
  readonly error = signal<string | null>(null);
  readonly isSystemAdmin = computed(() => this.authService.isSystemAdmin());
  readonly tokenRole = computed(() => this.authService.getRole() ?? this.authService.getSystemRole());

  ngOnInit(): void {
    try {
      console.debug('[SubscriptionView] init role', { role: this.authService.getRole(), systemRole: this.authService.getSystemRole(), isSystemAdmin: this.authService.isSystemAdmin() });
      // localStorage flags (do not print token value)
      try { console.debug('[SubscriptionView] storage', { hasToken: !!localStorage.getItem('jwtToken') || !!localStorage.getItem('jwttoken'), storedRole: localStorage.getItem('systemRole'), email: localStorage.getItem('loggedInUserEmail') }); } catch (e) {}
    } catch (e) {}
    this.load();
  }

  reload() { this.load(true); }

  private load(reset = false) {
    if (reset) {
      this.subscription.set(undefined);
      this.error.set(null);
    }
    // Se o usuário for SYSTEM_ADMIN, não precisamos consultar o endpoint; o
    // token já determina a role e mostramos a mensagem informativa.
    if (this.authService.isSystemAdmin()) {
      this.subscription.set(null);
      this.error.set(null);
      return;
    }
    // Primeiro consulte o status de acesso — para membros de organização o backend
    // informa se o acesso vem da organização. Se for PERSONAL_SUBSCRIPTION, busque
    // os detalhes completos da assinatura pessoal; se for ORGANIZATIONAL_SUBSCRIPTION
    // mapeie para um cartão resumido indicando "Acesso via organização".
    this.service.getMyAccessStatus().subscribe({
      next: (status: AccessStatus) => {
        if (!status || status.accessType === 'NONE') {
          this.subscription.set(null);
          return;
        }

        if (status.accessType === 'PERSONAL_SUBSCRIPTION') {
          // usuário tem assinatura pessoal — carregar detalhes completos
          this.service.getMySubscription().subscribe({
            next: sub => this.subscription.set(sub),
            error: err => {
              console.warn('[SubscriptionView] erro ao carregar assinatura pessoal', err);
              this.error.set('Não foi possível carregar sua assinatura agora.');
              this.subscription.set(null);
            }
          });
          return;
        }

        // ORGANIZATIONAL_SUBSCRIPTION — exibir acesso fornecido pela organização
        this.subscription.set({
          id: 'org-access',
          planName: status.planName ?? 'Plano (fornecido pela organização)',
          origin: 'ORGANIZATION',
          description: status.organizationName ? `Acesso via organização ${status.organizationName}` : 'Acesso via organização',
          startedAt: undefined,
          expiresAt: status.endDate ?? undefined,
          originalPrice: null,
          currentPrice: null,
          durationInDays: null,
          status: 'ATIVA',
          raw: status.raw ?? status
        } as UserSubscription);
      },
      error: err => {
        console.warn('[SubscriptionView] erro ao carregar status de acesso', err);
        this.error.set('Não foi possível carregar sua assinatura agora.');
        this.subscription.set(null);
      }
    });
  }

  showDiscount(sub: UserSubscription) {
    return !!sub.originalPrice && !!sub.currentPrice && sub.originalPrice > sub.currentPrice;
  }

  durationLabel(days?: number | null) {
    if (!days) return '—';
    if (days >= 28 && days <= 31) return 'Mensal';
    if (days >= 85 && days <= 95) return 'Trimestral';
    if (days >= 170 && days <= 190) return 'Semestral';
    if (days >= 360 && days <= 370) return 'Anual';
    if (days === 7) return 'Semanal';
    return `${days} dias`;
  }

  humanStatus(status?: string) {
    if (!status) return '—';
    const s = status.toUpperCase();
    switch (s) {
      case 'ACTIVE':
      case 'ATIVA':
        return 'Ativa';
      case 'CANCELED':
      case 'CANCELADA':
        return 'Cancelada';
      case 'EXPIRED':
      case 'EXPIRADA':
        return 'Expirada';
      case 'PENDING':
      case 'PENDENTE':
        return 'Pendente';
      default:
        return s.charAt(0) + s.slice(1).toLowerCase();
    }
  }
}
