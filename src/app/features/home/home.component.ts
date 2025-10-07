import { CommonModule, NgFor } from '@angular/common';
import { Component, inject, signal, OnDestroy, AfterViewInit, ViewChild, ElementRef, computed } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ApiService } from '../../core/services/api.service';
import { RouterLink } from '@angular/router';

// As interfaces permanecem as mesmas
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
type TrainingIconType = 'courses' | 'live';
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
export class HomeComponent implements OnDestroy, AfterViewInit {
  // --- INJEÇÃO DE DEPENDÊNCIAS E CONTEÚDO ESTÁTICO ---
  private readonly api = inject(ApiService);
  private readonly sanitizer = inject(DomSanitizer);

  sectors = signal<SectorCard[]>([]);
  sectorsLoading = signal<boolean>(false);
  sectorsError = signal<string | null>(null);

  readonly hero: HeroContent = {
    title: 'Soluções prontas para treinar sua equipe com zero dor de cabeça',
    description:
      'E-books e conteúdos aplicáveis em minutos, criados para donos de pequenas e médias empresas que não têm tempo a perder.',
    primaryCta: {
      label: 'Explorar Catálogo',
      link: '/catalog'
    },
  };
  readonly trainingsHighlight: TrainingsHighlight = {
    title: 'Treinamentos para Evoluir sua Equipe em Ritmo Contínuo',
    lead: 'Centralizamos formatos diferentes para acelerar aprendizado prático: conteúdos rápidos (E-books), aprofundamento estruturado (Cursos Gravados) e aplicação guiada (Sessões Ao Vivo).',
    primaryCta: { label: 'Explorar Catálogo Completo', link: '/catalog' },
    secondaryCta: { label: 'Ver Apenas Treinamentos', link: '/planos' }
  };
  readonly trainingFormats: TrainingFormat[] = [
  // E-books removed from catalog
    { iconType: 'courses', title: 'Cursos Gravados', description: 'Conteúdos estruturados sob demanda para evolução progressiva.', link: '/catalog', cta: 'Ver Cursos' },
    { iconType: 'live', title: 'Treinamentos Ao Vivo', description: 'Interação direta, dúvidas em tempo real e foco aplicado ao contexto.', link: '/catalog', cta: 'Próximas Sessões' }
  ];
  private readonly legacyCategories: SectorCard[] = [
    { id: 'alimentacao', name: 'Alimentação', description: 'Conteúdos e e-books voltados para empresas do setor de alimentação.', iconSvg: `<svg viewBox='0 0 48 48' role='img' aria-label='Alimentação' fill='none' stroke='currentColor' stroke-width='2'><path d='M12 4v16a6 6 0 0 0 12 0V4'/><path d='M18 28v16'/><path d='M30 4h4v40'/><path d='M34 20h-4'/></svg>` },
    { id: 'construcao-civil', name: 'Construção Civil', description: 'E-books práticos para gestão, segurança e treinamento na construção civil.', iconSvg: `<svg viewBox='0 0 48 48' role='img' aria-label='Construção Civil' fill='none' stroke='currentColor' stroke-width='2'><path d='M6 34h36'/><path d='M10 28h8v6h-8zM22 22h8v12h-8zM34 16h8v18h-8z'/><path d='M6 40h36'/></svg>` },
    { id: 'educacao', name: 'Educação', description: 'Materiais educativos e treinamentos para instituições de ensino.', iconSvg: `<svg viewBox='0 0 48 48' role='img' aria-label='Educação' fill='none' stroke='currentColor' stroke-width='2'><path d='M4 18 24 8l20 10-20 10L4 18Z'/><path d='M10 22v8c0 4 6 8 14 8s14-4 14-8v-8'/></svg>` },
    { id: 'industria', name: 'Indústria', description: 'Soluções para processos industriais, operação e manutenção.', iconSvg: `<svg viewBox='0 0 48 48' role='img' aria-label='Indústria' fill='none' stroke='currentColor' stroke-width='2'><path d='M6 42V20l12 8V20l12 8V10l12 8v24H6Z'/><path d='M14 34h4M22 34h4M30 34h4'/></svg>` },
    { id: 'saude', name: 'Saúde', description: 'Conteúdos especializados para clínicas, hospitais e serviços de saúde.', iconSvg: `<svg viewBox='0 0 48 48' role='img' aria-label='Saúde' fill='none' stroke='currentColor' stroke-width='2'><path d='M24 44s-4-3.2-8-6.9C10 34 4 28.4 4 20a12 12 0 0 1 12-12c4 0 8 4 8 4s4-4 8-4a12 12 0 0 1 12 12c0 8.4-6 14-12 17.1-4 3.7-8 6.9-8 6.9Z'/><path d='M21 26h6v-6h4v-6h-4v-4h-6v4h-4v6h4v6Z'/></svg>` },
    { id: 'transporte-logistica', name: 'Transporte e Logística', description: 'Treinamentos focados em transporte, logística e cadeia de suprimentos.', iconSvg: `<svg viewBox='0 0 48 48' role='img' aria-label='Transporte e Logística' fill='none' stroke='currentColor' stroke-width='2'><path d='M4 30h36l4-10H34l-6-8H12L4 30Z'/><circle cx='14' cy='38' r='4'/><circle cx='34' cy='38' r='4'/><path d='M10 38h4M30 38h4'/></svg>` },
    { id: 'varejo-atacado', name: 'Varejo e Atacado', description: 'Materiais para operação, atendimento e gestão de lojas e atacadistas.', iconSvg: `<svg viewBox='0 0 48 48' role='img' aria-label='Varejo e Atacado' fill='none' stroke='currentColor' stroke-width='2'><path d='M6 14h36l-4 24H10L6 14Z'/><path d='M8 14l4-8h24l4 8'/><path d='M18 20v12M30 20v12'/></svg>` }
  ];

  // --- LÓGICA DO CARROSSEL ---

  @ViewChild('sectorsTrack', { static: false }) private trackRef?: ElementRef<HTMLDivElement>;

  pagesCount = signal(0);
  pageIndex = signal(0);
  pagesArray = computed(() => Array.from({ length: this.pagesCount() }, (_, i) => i));

  private resizeObserver: ResizeObserver | null = null;
  private sliderInitTimer: any = null;
  private autoScrollInterval: any = null;
  
  constructor() {
    this.sectors.set(this.legacyCategories);
  }
  
  ngAfterViewInit(): void {
    this.sliderInitTimer = setTimeout(() => this.setupSlider(), 100);
  }

  private setupSlider(): void {
    const track = this.trackRef?.nativeElement;
    if (!track || this.sectors().length === 0) return;

    const pageCount = 3;
    this.pagesCount.set(pageCount);
    
    track.addEventListener('scroll', this.onTrackScroll, { passive: true });
    this.resizeObserver = new ResizeObserver(this.onTrackScroll);
    this.resizeObserver.observe(track);

    this.startAutoScroll();
  }
  
  // CORREÇÃO APLICADA AQUI
  private _scrollToPage(index: number): void {
    const track = this.trackRef?.nativeElement;
    if (!track) return;
    
    let scrollPosition = 0;
    const lastPageIndex = this.pagesCount() - 1;

    // Se for o último ponto, role até o final máximo do contêiner.
    if (index === lastPageIndex) {
      scrollPosition = track.scrollWidth - track.clientWidth;
    } else {
      // Para os outros pontos, role até o card correspondente.
      const cardIndexMap = [0, 3]; // Mapeamos apenas os que não são o último
      const targetCardIndex = cardIndexMap[index] ?? 0;
      const cardElement = track.children[targetCardIndex] as HTMLElement;
      if (cardElement) {
        scrollPosition = cardElement.offsetLeft - track.offsetLeft;
      }
    }
    
    track.scrollTo({ left: scrollPosition, behavior: 'smooth' });
  }

  goToPage(index: number): void {
    this.stopAutoScroll(); 
    this._scrollToPage(index);
  }
  
  // CORREÇÃO APLICADA AQUI
  private updateActiveDot(): void {
    const track = this.trackRef?.nativeElement;
    if (!track || track.children.length < 7) return;

    const scrollLeft = track.scrollLeft;
    const trackWidth = track.clientWidth;
    const scrollWidth = track.scrollWidth;
    
    // Ponto de referência para a segunda página
    const page2Breakpoint = (track.children[3] as HTMLElement).offsetLeft;
    let newIndex = 0;

    // Se a rolagem está a 5 pixels do final, consideramos a última página
    if (scrollLeft >= scrollWidth - trackWidth - 5) {
      newIndex = 2;
    } else if (scrollLeft >= page2Breakpoint - (trackWidth / 2)) {
      newIndex = 1;
    } else {
      newIndex = 0;
    }
    
    if (this.pageIndex() !== newIndex) {
      this.pageIndex.set(newIndex);
    }
  }

  private onTrackScroll = (): void => {
    this.updateActiveDot();
  };

  ngOnDestroy(): void {
    this.stopAutoScroll(); 
    const track = this.trackRef?.nativeElement;
    if (track) {
      track.removeEventListener('scroll', this.onTrackScroll);
    }
    if (this.sliderInitTimer) {
      clearTimeout(this.sliderInitTimer);
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }
  
  startAutoScroll(): void {
    this.stopAutoScroll(); 
    this.autoScrollInterval = setInterval(() => {
      const currentIndex = this.pageIndex();
      const totalPages = this.pagesCount();
      const nextIndex = (currentIndex + 1) % totalPages;
      this._scrollToPage(nextIndex);
    }, 5000);
  }

  stopAutoScroll(): void {
    if (this.autoScrollInterval) {
      clearInterval(this.autoScrollInterval);
    }
  }

  // --- OUTRAS FUNÇÕES DO COMPONENTE ---
  onNewsletterSubmit(event: Event): void {
    event.preventDefault();
  }

  sanitizeSvg(svg: string | null | undefined): SafeHtml | null {
    if (!svg) return null;
    return this.sanitizer.bypassSecurityTrustHtml(svg);
  }
}