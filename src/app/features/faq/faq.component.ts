import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

interface FaqItem {
  question: string;
  answer: string;
}

@Component({
  selector: 'pros-faq',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './faq.component.html',
  styleUrls: ['./faq.component.scss']
})
export class FaqComponent {
  readonly faqItems: FaqItem[] = [
    {
      question: 'Como recebo os e-books?',
      answer: 'Assim que o pagamento é confirmado, você recebe automaticamente um e-mail com o link seguro para download.'
    },
    {
      question: 'Os materiais são atualizados?',
      answer: 'Sim. Revimos periodicamente com especialistas para refletir mudanças legais, melhores práticas e estudos recentes.'
    },
    {
      question: 'Posso usar os materiais na minha empresa?',
      answer: 'Sim. O conteúdo foi criado para aplicação direta em equipes e setores dentro da sua organização.'
    },
    {
      question: 'Há política de reembolso?',
      answer: 'Você pode solicitar reembolso em até 7 dias corridos após a compra, conforme o Código de Defesa do Consumidor.'
    },
    {
      question: 'Como entro em contato com o suporte?',
      answer: 'Acesse a Central de Suporte para abrir um chamado ou envie um e-mail para contato@gotreeconsultoria.com.br.'
    }
  ];

  readonly privacyHighlights: string[] = [
    'Coletamos apenas os dados necessários para a sua experiência e obrigações legais da plataforma.',
    'Os dados são armazenados em ambiente seguro e nunca são compartilhados com terceiros sem autorização.',
    'Você pode solicitar a revisão, portabilidade ou exclusão dos seus dados a qualquer momento.'
  ];

  readonly termsHighlights: string[] = [
    'Ao adquirir um conteúdo, você recebe uma licença de uso individual e intransferível.',
    'Os materiais são protegidos por direitos autorais. Evite reproduções ou redistribuições sem autorização.',
    'Podemos atualizar funcionalidades e preços, comunicando previamente alterações relevantes.'
  ];
}
