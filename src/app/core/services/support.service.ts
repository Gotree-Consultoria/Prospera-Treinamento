import { Injectable } from '@angular/core';
import { catchError, map, of, throwError } from 'rxjs';

import { ApiService } from './api.service';

export interface ContactMessage {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export interface SupportTicket {
  name: string;
  email: string;
  topic: string;
  description: string;
}

interface SupportResponse {
  success?: boolean;
  message?: string;
}

@Injectable({ providedIn: 'root' })
export class SupportService {
  constructor(private readonly api: ApiService) {}

  sendContactMessage(payload: ContactMessage) {
    return this.api.post<SupportResponse>('/support/contact', payload).pipe(
      map(response => ({ success: response?.success ?? true, message: response?.message ?? 'Mensagem enviada.' })),
      catchError(error => {
        const fallbackMessage = error?.error?.message ?? 'Não foi possível enviar sua mensagem agora.';
        return throwError(() => new Error(fallbackMessage));
      })
    );
  }

  openSupportTicket(payload: SupportTicket) {
    return this.api.post<SupportResponse>('/support/tickets', payload).pipe(
      map(response => ({ success: response?.success ?? true, message: response?.message ?? 'Chamado registrado.' })),
      catchError(error => {
        const fallbackMessage = error?.error?.message ?? 'Não foi possível registrar o chamado.';
        return throwError(() => new Error(fallbackMessage));
      })
    );
  }

  getSupportTopics() {
    return of([
      { id: 'access', label: 'Dificuldades de acesso' },
      { id: 'content', label: 'Conteúdos e certificações' },
      { id: 'billing', label: 'Financeiro e faturamento' },
      { id: 'platform', label: 'Instabilidades na plataforma' },
      { id: 'other', label: 'Outros assuntos' }
    ]);
  }
}
