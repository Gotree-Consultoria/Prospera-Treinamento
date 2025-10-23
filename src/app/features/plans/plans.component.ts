import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { CatalogItem, CatalogService } from '../../core/services/catalog.service';
import { PlanCardComponent, Plan } from './plan-card.component';

@Component({
  selector: 'pros-plans',
  standalone: true,
  imports: [CommonModule, RouterLink, PlanCardComponent],
  templateUrl: './plans.component.html',
  styleUrls: ['./plans.component.scss']
})
export class PlansComponent implements OnInit {
  private readonly catalogService = inject(CatalogService);
  private plansUpdateSub: any;

  plans: Plan[] = [];
  isLoading = true;
  errorMessage = '';

  ngOnInit(): void {
    this.loadPlansFromPublicApi();
    // Recarrega planos quando outro lugar do app notificar mudança
    this.plansUpdateSub = this.catalogService.plansUpdated.subscribe(() => this.loadPlansFromPublicApi());
  }

  retryLoadPlans() {
    this.isLoading = true;
    this.errorMessage = '';
    // Tentar somente o endpoint /plans — sem fallback para catálogo público
    this.catalogService.loadPlansEndpoint().subscribe({
      next: (items: CatalogItem[]) => {
        if (items && items.length) {
          this.plans = items.map(i => this.toPlan(i));
          this.isLoading = false;
        } else {
          this.plans = [];
          this.isLoading = false;
          this.errorMessage = 'Nenhum plano retornado por /plans.';
        }
      },
      error: (err: any) => {
        this.isLoading = false;
        this.errorMessage = err?.message ?? 'Falha ao carregar planos via /plans.';
      }
    });
  }

  private loadPlansPreferential() {
    this.catalogService.loadPlansEndpoint().subscribe({
      next: (items: CatalogItem[]) => {
        if (items && items.length) {
          this.plans = items.map(i => this.toPlan(i));
          this.isLoading = false;
          return;
        }
        // fallback para catálogo público
        this.catalogService.loadCatalog().subscribe({
          next: (all: CatalogItem[]) => {
            const packages = (all || []).filter(i => i.format === 'PACKAGE');
            this.plans = packages.map(i => this.toPlan(i));
            this.isLoading = false;
            if (!this.plans.length) this.errorMessage = 'Nenhum plano disponível no momento.';
          },
          error: (err: any) => {
            this.errorMessage = err?.message ?? 'Não foi possível carregar os planos agora.';
            this.isLoading = false;
          }
        });
      },
      error: (err: any) => {
        // fallback direto em caso de erro
        this.catalogService.loadCatalog().subscribe({
          next: (all: CatalogItem[]) => {
            const packages = (all || []).filter(i => i.format === 'PACKAGE');
            this.plans = packages.map(i => this.toPlan(i));
            this.isLoading = false;
            if (!this.plans.length) this.errorMessage = 'Nenhum plano disponível no momento.';
          },
          error: (err2: any) => {
            this.errorMessage = err2?.message ?? 'Não foi possível carregar os planos agora.';
            this.isLoading = false;
          }
        });
      }
    });
  }

  private loadPlansFromPublicApi() {
    this.catalogService.loadFromPublicApi('//localhost:8080/public/catalog/plans').subscribe({
      next: (items: any[]) => {
        this.plans = items.map(item => ({
          id: item.id,
          name: item.name,
          description: item.description,
          originalPrice: item.originalPrice,
          currentPrice: item.currentPrice,
          durationInDays: item.durationInDays,
          type: item.type
        }));
        this.isLoading = false;
      },
      error: (err: any) => {
        this.errorMessage = err?.message || 'Erro ao carregar planos da API pública';
        this.isLoading = false;
      }
    });
  }

  trackById(_: number, item: Plan) {
    return item.id;
  }

  formatLabel(format: CatalogItem['format']): string {
    switch (format) {
      case 'PACKAGE':
        return 'Plano';
      case 'EBOOK':
        return 'E-book';
      case 'RECORDED_COURSE':
        return 'Curso gravado';
      case 'LIVE_TRAINING':
        return 'Treinamento ao vivo';
      default:
        return 'Conteúdo';
    }
  }

  private toPlan(item: CatalogItem): Plan {
    // Tentativa de extrair preços do payload original (backend pode enviar em data ou nos campos diretos futuramente)
    const raw: any = item.data ?? {};
    const original = raw.originalPrice ?? raw.priceOriginal ?? raw.basePrice ?? null;
    const current = raw.currentPrice ?? raw.price ?? raw.finalPrice ?? original ?? null;
    const duration = raw.durationInDays ?? raw.duration ?? raw.days ?? null;
    const type = raw.type ?? null;
    return {
      id: item.id,
      name: item.title,
      description: item.description,
      originalPrice: typeof original === 'number' ? original : null,
      currentPrice: typeof current === 'number' ? current : (typeof original === 'number' ? original : null),
      durationInDays: typeof duration === 'number' ? duration : null,
      sectors: item.sectors,
      type: type
    };
  }

  planTypeLabel(type?: string | null): string {
    const t = String(type || '').trim().toUpperCase();
    if (!t) return '—';
    if (t === 'ENTERPRISE' || t === 'ENTERPRISE_ORGANIZATION' || t === 'ENTERPRISE_ORG' || t === 'ENTERPRISES' || t === 'EMPRESARIAL') {
      return 'Empresarial';
    }
    if (t === 'INDIVIDUAL' || t === 'PERSONAL' || t === 'PESSOAL' || t === 'PERSON') {
      return 'Individual';
    }
    return t[0] + t.slice(1).toLowerCase();
  }
}
