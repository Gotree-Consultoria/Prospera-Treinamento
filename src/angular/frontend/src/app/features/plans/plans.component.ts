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

  plans: Plan[] = [];
  isLoading = true;
  errorMessage = '';

  ngOnInit(): void {
    this.catalogService.loadCatalog().subscribe({
      next: (items: CatalogItem[]) => {
        const plansOnly = items.filter(i => i.format === 'PACKAGE');
        this.plans = plansOnly.map((i: CatalogItem) => this.toPlan(i));
        this.isLoading = false;
        if (!plansOnly.length) {
          this.errorMessage = 'Nenhum plano disponível no momento.';
        }
      },
      error: (error: any) => {
        this.errorMessage = error?.message ?? 'Não foi possível carregar os planos agora.';
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
    return {
      id: item.id,
      name: item.title,
      description: item.description,
      originalPrice: typeof original === 'number' ? original : null,
      currentPrice: typeof current === 'number' ? current : (typeof original === 'number' ? original : null),
      durationInDays: typeof duration === 'number' ? duration : null,
      sectors: item.sectors
    };
  }
}
