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
