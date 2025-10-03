import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

interface OrganizationBenefit {
  title: string;
  description: string;
  icon: string;
}

interface OrganizationMetric {
  label: string;
  value: string;
  description: string;
}

interface OrganizationStep {
  title: string;
  detail: string;
}

@Component({
  selector: 'pros-organizations',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './organizations.component.html',
  styleUrls: ['./organizations.component.scss']
})
export class OrganizationsComponent {
  readonly benefits: OrganizationBenefit[] = [
    {
      title: 'Gestão centralizada',
      description: 'Configure setores, níveis de acesso e indicadores em um só painel, com relatórios em tempo real.',
      icon: 'fa-sitemap'
    },
    {
      title: 'Conteúdos sob medida',
      description: 'Biblioteca curada com trilhas recomendadas conforme o perfil de risco e maturidade da empresa.',
      icon: 'fa-layer-group'
    },
    {
      title: 'Onboarding simplificado',
      description: 'Convide colaboradores por lote, acompanhe engajamento e emita certificados automaticamente.',
      icon: 'fa-rocket'
    }
  ];

  readonly metrics: OrganizationMetric[] = [
    { label: 'Colaboradores engajados', value: '38k+', description: 'Profissionais impactados pelos nossos programas corporativos.' },
    { label: 'Tempo médio de implementação', value: '14 dias', description: 'Para lançar trilhas completas com planos e materiais aprovados.' },
    { label: 'Redução de incidentes', value: '26%', description: 'Média observada em empresas após 6 meses de programa ativo.' }
  ];

  readonly steps: OrganizationStep[] = [
    { title: 'Diagnóstico assistido', detail: 'Avaliamos necessidades, indicadores e maturidade de SST da sua operação.' },
    { title: 'Trilhas personalizadas', detail: 'Selecionamos ou criamos conteúdos combinando treinamentos, e-books e mentorias.' },
    { title: 'Acompanhamento contínuo', detail: 'Monitoramos engajamento, certificações e produzimos relatórios executivos.' }
  ];
}
