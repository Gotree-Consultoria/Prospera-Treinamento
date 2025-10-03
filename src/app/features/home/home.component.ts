import { CommonModule, NgFor } from '@angular/common';
import { Component, computed, inject, signal, OnInit, OnDestroy, HostListener } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ApiService } from '../../core/services/api.service';
import { RouterLink } from '@angular/router';
interface SectorCard {
  id: string;
  name: string;
  description?: string | null;
  iconSvg?: string | null;
}

interface HeroCTA {
  label: string;
  link: string;
}

interface HeroContent {
  title: string;
  description: string;
  primaryCta: HeroCTA;
  secondaryCta?: HeroCTA;
}


type TrainingIconType = 'ebooks' | 'courses' | 'live';

interface TrainingFormat {
  iconType: TrainingIconType;
  title: string;
  description: string;
  link: string;
  cta: string;
}

interface TrainingsHighlight {
  title: string;
  lead: string;
  primaryCta: HeroCTA;
  secondaryCta: HeroCTA;
}

@Component({
  selector: 'prospera-home',
  standalone: true,
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  imports: [CommonModule, RouterLink, NgFor]
})
export class HomeComponent implements OnInit, OnDestroy {
  private readonly api = inject(ApiService);
  private readonly sanitizer = inject(DomSanitizer);

  // Sectors carousel state
  sectors = signal<SectorCard[]>([]);
  sectorsLoading = signal<boolean>(false);
  sectorsError = signal<string | null>(null);
  currentSectorIndex = signal<number>(0);
  visibleCount = signal<number>(5); // será recalculado responsivamente
  dragging = signal<boolean>(false);
  private autoScrollId: any = null;
  private autoPaused = false;
  private dragStartX: number | null = null;
  private dragThreshold = 50; // px

  readonly visibleSectors = computed(() => {
    const list = this.sectors();
    if (!list.length) return [];
    const start = this.currentSectorIndex();
    const count = this.visibleCount();
    return list.slice(start, start + count);
  });

  readonly hero: HeroContent = {
    title: 'Soluções prontas para treinar sua equipe com zero dor de cabeça',
    description:
      'E-books e conteúdos aplicáveis em minutos, criados para donos de pequenas e médias empresas que não têm tempo a perder.',
    primaryCta: {
      label: 'Explorar Catálogo',
      link: '/catalog'
    },
    // secondaryCta removed intentionally to show a single CTA
  };

  readonly trainingsHighlight: TrainingsHighlight = {
    title: 'Treinamentos para Evoluir sua Equipe em Ritmo Contínuo',
    lead: 'Centralizamos formatos diferentes para acelerar aprendizado prático: conteúdos rápidos (E-books), aprofundamento estruturado (Cursos Gravados) e aplicação guiada (Sessões Ao Vivo).',
    primaryCta: { label: 'Explorar Catálogo Completo', link: '/catalog' },
    secondaryCta: { label: 'Ver Apenas Treinamentos', link: '/planos' }
  };

  readonly trainingFormats: TrainingFormat[] = [
    {
      iconType: 'ebooks',
      title: 'E-books',
      description: 'Guias objetivos e rápidos para consulta e implementação imediata.',
      link: '/ebooks',
      cta: 'Ver E-books'
    },
    {
      iconType: 'courses',
      title: 'Cursos Gravados',
      description: 'Conteúdos estruturados sob demanda para evolução progressiva.',
      link: '/catalog',
      cta: 'Ver Cursos'
    },
    {
      iconType: 'live',
      title: 'Treinamentos Ao Vivo',
      description: 'Interação direta, dúvidas em tempo real e foco aplicado ao contexto.',
      link: '/catalog',
      cta: 'Próximas Sessões'
    }
  ];

  // Metadados legacy (fallback quando API não fornece descrição / ícone)
  // Agora usamos as categorias fixas do legacy (Product Categories Section)
  private readonly legacyCategories: SectorCard[] = [
    {
      id: 'alimentacao',
      name: 'Alimentação',
      description: 'Conteúdos e e-books voltados para empresas do setor de alimentação.',
      iconSvg: `<svg viewBox='0 0 48 48' role='img' aria-label='Alimentação' fill='none' stroke='currentColor' stroke-width='2'><path d='M12 4v16a6 6 0 0 0 12 0V4'/><path d='M18 28v16'/><path d='M30 4h4v40'/><path d='M34 20h-4'/></svg>`
    },
    {
      id: 'construcao-civil',
      name: 'Construção Civil',
      description: 'E-books práticos para gestão, segurança e treinamento na construção civil.',
      iconSvg: `<svg viewBox='0 0 48 48' role='img' aria-label='Construção Civil' fill='none' stroke='currentColor' stroke-width='2'><path d='M6 34h36'/><path d='M10 28h8v6h-8zM22 22h8v12h-8zM34 16h8v18h-8z'/><path d='M6 40h36'/></svg>`
    },
    {
      id: 'educacao',
      name: 'Educação',
      description: 'Materiais educativos e treinamentos para instituições de ensino.',
      iconSvg: `<svg viewBox='0 0 48 48' role='img' aria-label='Educação' fill='none' stroke='currentColor' stroke-width='2'><path d='M4 18 24 8l20 10-20 10L4 18Z'/><path d='M10 22v8c0 4 6 8 14 8s14-4 14-8v-8'/></svg>`
    },
    {
      id: 'industria',
      name: 'Indústria',
      description: 'Soluções para processos industriais, operação e manutenção.',
      iconSvg: `<svg viewBox='0 0 48 48' role='img' aria-label='Indústria' fill='none' stroke='currentColor' stroke-width='2'><path d='M6 42V20l12 8V20l12 8V10l12 8v24H6Z'/><path d='M14 34h4M22 34h4M30 34h4'/></svg>`
    },
    {
      id: 'saude',
      name: 'Saúde',
      description: 'Conteúdos especializados para clínicas, hospitais e serviços de saúde.',
      iconSvg: `<svg viewBox='0 0 48 48' role='img' aria-label='Saúde' fill='none' stroke='currentColor' stroke-width='2'><path d='M24 44s-4-3.2-8-6.9C10 34 4 28.4 4 20a12 12 0 0 1 12-12c4 0 8 4 8 4s4-4 8-4a12 12 0 0 1 12 12c0 8.4-6 14-12 17.1-4 3.7-8 6.9-8 6.9Z'/><path d='M21 26h6v-6h4v-6h-4v-4h-6v4h-4v6h4v6Z'/></svg>`
    },
    {
      id: 'transporte-logistica',
      name: 'Transporte e Logística',
      description: 'Treinamentos focados em transporte, logística e cadeia de suprimentos.',
      iconSvg: `<svg viewBox='0 0 48 48' role='img' aria-label='Transporte e Logística' fill='none' stroke='currentColor' stroke-width='2'><path d='M4 30h36l4-10H34l-6-8H12L4 30Z'/><circle cx='14' cy='38' r='4'/><circle cx='34' cy='38' r='4'/><path d='M10 38h4M30 38h4'/></svg>`
    },
    {
      id: 'varejo-atacado',
      name: 'Varejo e Atacado',
      description: 'Materiais para operação, atendimento e gestão de lojas e atacadistas.',
      iconSvg: `<svg viewBox='0 0 48 48' role='img' aria-label='Varejo e Atacado' fill='none' stroke='currentColor' stroke-width='2'><path d='M6 14h36l-4 24H10L6 14Z'/><path d='M8 14l4-8h24l4 8'/><path d='M18 20v12M30 20v12'/></svg>`
    }
  ];

  constructor() {
    this.sectors.set(this.legacyCategories);
  }

  ngOnInit(): void {
    this.recalculateVisibleCount();
    this.startAutoScroll();
  }

  ngOnDestroy(): void {
    this.clearAutoScroll();
  }

  loadSectors(): void {
    // Mantido para possível futura integração; por ora ignoramos resposta e usamos estáticos
    if (this.sectors().length) return; // já carregado
    this.sectors.set(this.legacyCategories);
  }

  nextSector(): void {
    const total = this.sectors().length;
    const count = this.visibleCount();
    if (total <= count) return;
    this.currentSectorIndex.update(i => (i + 1 + count > total ? 0 : i + 1));
  }

  prevSector(): void {
    const total = this.sectors().length;
    const count = this.visibleCount();
    if (total <= count) return;
    this.currentSectorIndex.update(i => (i - 1 < 0 ? Math.max(0, total - count) : i - 1));
  }

  private unwrapList(response: any): any[] {
    if (Array.isArray(response)) return response;
    if (response && typeof response === 'object') {
      const c = response.items ?? response.data ?? response.content ?? response.results;
      if (Array.isArray(c)) return c;
      if (response.data && Array.isArray(response.data.items)) return response.data.items;
    }
    return [];
  }

  private normalizeSector(raw: any): SectorCard {
    // Não usado no fluxo atual (categorias estáticas), mas deixado para compatibilidade futura
    const id = String(raw.id ?? raw.slug ?? raw.code ?? Math.random().toString(36).slice(2));
    const nameRaw = String(raw.name ?? raw.title ?? raw.label ?? 'Setor');
    return { id, name: nameRaw, description: raw.description ?? null, iconSvg: null };
  }

  onNewsletterSubmit(event: Event): void {
    event.preventDefault();
  }

  // ---------- Auto Scroll ----------
  private startAutoScroll(): void {
    this.clearAutoScroll();
    this.autoScrollId = setInterval(() => {
      if (!this.autoPaused && !this.dragging()) {
        this.nextSector();
      }
    }, 4000);
  }

  private clearAutoScroll(): void {
    if (this.autoScrollId) {
      clearInterval(this.autoScrollId);
      this.autoScrollId = null;
    }
  }

  pauseAuto(): void { this.autoPaused = true; }
  resumeAuto(): void { this.autoPaused = false; }

  // ---------- Drag Interação ----------
  onDragStart(ev: PointerEvent): void {
    this.dragStartX = ev.clientX;
    this.dragging.set(true);
    this.pauseAuto();
    (ev.target as HTMLElement).setPointerCapture(ev.pointerId);
  }

  onDragMove(ev: PointerEvent): void {
    if (this.dragStartX === null) return;
    const delta = ev.clientX - this.dragStartX;
    if (Math.abs(delta) >= this.dragThreshold) {
      if (delta < 0) this.nextSector(); else this.prevSector();
      this.dragStartX = ev.clientX; // reinicia referência para arrastar múltiplos passos
    }
  }

  onDragEnd(): void {
    this.dragStartX = null;
    if (this.dragging()) {
      this.dragging.set(false);
      setTimeout(() => this.resumeAuto(), 600);
    }
  }

  // ---------- Responsividade ----------
  @HostListener('window:resize')
  onResize(): void { this.recalculateVisibleCount(); }

  private recalculateVisibleCount(): void {
    const total = this.sectors().length;
    if (!total) return;
    const cardWidth = 210; // manter sincronizado com SCSS
    const gap = 16; // 1rem
    const horizontalPadding = window.innerWidth >= 1280 ? 172 : 140; // padding total aproximado (track)
    const available = window.innerWidth - horizontalPadding;
    const fit = Math.max(1, Math.floor((available + gap) / (cardWidth + gap)));
    // Limita para sempre sobrar ao menos 1 quando possível, evitando travar rotação
    const navigable = Math.min(fit, Math.max(1, total - 1));
    this.visibleCount.set(Math.min(navigable, 7));
    if (this.currentSectorIndex() + this.visibleCount() > total) {
      this.currentSectorIndex.set(0);
    }
  }

  // ---------- Sanitização SVG ----------
  sanitizeSvg(svg: string | null | undefined): SafeHtml | null {
    if (!svg) return null;
    return this.sanitizer.bypassSecurityTrustHtml(svg);
  }
}
