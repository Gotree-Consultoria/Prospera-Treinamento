import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

interface AgendaEvent {
  title: string;
  description: string;
  date: string;
  modality: 'online' | 'presencial';
}

@Component({
  selector: 'pros-agenda',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './agenda.component.html',
  styleUrls: ['./agenda.component.scss']
})
export class AgendaComponent {
  readonly upcomingEvents: AgendaEvent[] = [
    {
      title: 'Workshop de liderança em SST',
      description: 'Capacitação intensiva para líderes que desejam consolidar culturas de segurança.',
      date: '10 de outubro · 14h às 16h',
      modality: 'online'
    },
    {
      title: 'Clínica de ergonomia aplicada',
      description: 'Sessão prática com análise de casos reais e ajustes por posto de trabalho.',
      date: '22 de outubro · 9h às 12h',
      modality: 'presencial'
    },
    {
      title: 'Série Onboarding sem fricção',
      description: 'Sequência de encontros semanais para estruturar trilhas de integração contínuas.',
      date: 'Novembro · Quartas-feiras · 11h',
      modality: 'online'
    }
  ];
}
