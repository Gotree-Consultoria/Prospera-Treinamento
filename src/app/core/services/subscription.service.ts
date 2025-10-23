import { Injectable } from '@angular/core';
import { catchError, map, of, throwError } from 'rxjs';
import { ApiService } from './api.service';

export type AccessType =
  | 'PERSONAL_SUBSCRIPTION'
  | 'ORGANIZATIONAL_SUBSCRIPTION'
  | 'NONE';

export interface AccessStatus {
  accessType: AccessType;
  planName?: string | null;
  endDate?: string | null;
  organizationName?: string | null;
  raw?: any;
}

export interface UserSubscription {
  id: string;
  planName: string;
  origin?: string;
  description?: string;
  startedAt?: string;
  expiresAt?: string;
  originalPrice?: number | null;
  currentPrice?: number | null;
  durationInDays?: number | null;
  status?: string;
  raw?: any;
}

export interface CreateSubscriptionRequest {
  userId?: string;
  planId: string;
}

export interface SubscriptionResponseDTO {
  id: string;
  userId?: string | null;
  planId: string;
  planName: string;
  startDate: string;
  endDate?: string | null;
  status: string;
  origin: string;
  accountName?: string | null;
}

@Injectable({ providedIn: 'root' })
export class SubscriptionService {
  constructor(private readonly api: ApiService) {}

  /**
   * Recupera o status de acesso do usuário logado.
   * Retorna um objeto AccessStatus onde accessType pode ser PERSONAL_SUBSCRIPTION,
   * ORGANIZATIONAL_SUBSCRIPTION ou NONE. Mesmo quando não houver acesso, retornamos
   * um AccessStatus com accessType='NONE' para simplificar o consumo.
   */
  getMyAccessStatus() {
    return this.api.get<any>('/subscriptions/me/access-status').pipe(
      map(res => {
        if (!res || (typeof res === 'object' && Object.keys(res).length === 0)) {
          return { accessType: 'NONE', planName: null, endDate: null, organizationName: null } as AccessStatus;
        }

        const rawType = (res.acessType ?? res.accessType ?? 'NONE').toString();
        const accessType = (rawType || 'NONE').toUpperCase() as AccessType;

        return {
          accessType,
          planName: res.planName ?? res.plan ?? null,
          endDate: res.endDate ?? res.endAt ?? null,
          organizationName: res.organizationName ?? res.orgName ?? null,
          raw: res
        } as AccessStatus;
      }),
      catchError(err => {
        if (err?.status === 404) {
          return of({ accessType: 'NONE', planName: null, endDate: null, organizationName: null } as AccessStatus);
        }
        return throwError(() => err);
      })
    );
  }

  getMySubscription() {
    return this.api.get<any>('/subscriptions/me/subscription').pipe(
      map(res => {
        // se o backend retornar 200 com corpo vazio ou objeto vazio, considere sem assinatura
        if (!res || (typeof res === 'object' && Object.keys(res).length === 0)) {
          return null;
        }
        return this.normalize(res);
      }),
      catchError(err => {
        if (err?.status === 404) {
          return of(null); // regra de negócio: sem assinatura ativa
        }
        return throwError(() => err);
      })
    );
  }

  /**
   * Cria uma nova assinatura pessoal para um usuário específico.
   * @param userId ID do usuário
   * @param planId ID do plano
   * @returns Observable com a resposta da assinatura criada
   */
  createPersonalSubscription(userId: string, planId: string) {
    return this.api.post<any>('/admin/subscriptions/users', {
      userId,
      planId
    }).pipe(
      map(res => res?.data || res),
      catchError(err => {
        console.error('Erro ao criar assinatura pessoal:', err);
        return throwError(() => err);
      })
    );
  }

  /**
   * Cria uma nova assinatura empresarial para uma organização específica.
   * @param organizationId ID da organização (Account)
   * @param planId ID do plano
   * @returns Observable com a resposta da assinatura criada
   */
  createOrganizationSubscription(organizationId: string, planId: string) {
    return this.api.post<any>(`/admin/subscriptions/organizations/${organizationId}`, {
      planId
    }).pipe(
      map(res => res?.data || res),
      catchError(err => {
        console.error('Erro ao criar assinatura empresarial:', err);
        return throwError(() => err);
      })
    );
  }

  /**
   * Cancela uma assinatura existente.
   * @param subscriptionId ID da assinatura a cancelar
   * @returns Observable vazio
   */
  cancelSubscription(subscriptionId: string) {
    return this.api.post<void>(`/admin/subscriptions/${subscriptionId}/cancel`, {}).pipe(
      catchError(err => {
        console.error('Erro ao cancelar assinatura:', err);
        return throwError(() => err);
      })
    );
  }

  /**
   * Lista todas as assinaturas com filtros opcionais.
   * @param status Status opcional (ex: 'ACTIVE')
   * @param origin Origem opcional (ex: 'MANUAL')
   * @returns Observable com a lista de assinaturas
   */
  listAllSubscriptions(status?: string, origin?: string) {
    let queryParams = '';
    if (status) queryParams += `status=${status}`;
    if (origin) queryParams += `${queryParams ? '&' : ''}origin=${origin}`;
    
    const endpoint = queryParams ? `/admin/subscriptions?${queryParams}` : '/admin/subscriptions';
    
    return this.api.get<any>(endpoint).pipe(
      map(res => res?.data || res),
      catchError(err => {
        console.error('Erro ao listar assinaturas:', err);
        return throwError(() => err);
      })
    );
  }

  /**
   * Obtém os detalhes de uma assinatura específica.
   * @param subscriptionId ID da assinatura
   * @returns Observable com os detalhes da assinatura
   */
  getSubscriptionById(subscriptionId: string) {
    return this.api.get<any>(`/admin/subscriptions/${subscriptionId}`).pipe(
      map(res => res?.data || res),
      catchError(err => {
        console.error('Erro ao buscar assinatura:', err);
        return throwError(() => err);
      })
    );
  }

  private normalize(res: any): UserSubscription {
    // assume res é válido aqui
    const src = res.subscription ?? res.plan ?? res;
    const base = src.plan ?? src; // alguns backends aninham plan
    return {
      id: String(src.id ?? base.id ?? src.uuid ?? base.uuid ?? 'sub-unknown'),
      planName: base.name ?? base.planName ?? base.title ?? 'Plano',
  origin: src.origin ?? base.origin ?? undefined,
      description: base.description ?? base.details ?? '',
      startedAt: src.startedAt ?? src.startDate ?? src.createdAt ?? null,
      expiresAt: src.expiresAt ?? src.endDate ?? null,
      originalPrice: src.originalPrice ?? base.originalPrice ?? null,
      currentPrice: src.currentPrice ?? src.price ?? base.currentPrice ?? base.price ?? null,
      durationInDays: src.durationInDays ?? base.durationInDays ?? null,
      status: (src.status ?? 'ATIVA').toString().toUpperCase(),
      raw: res
    };
  }
}
