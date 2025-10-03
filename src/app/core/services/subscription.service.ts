import { Injectable } from '@angular/core';
import { catchError, map, of, throwError } from 'rxjs';
import { ApiService } from './api.service';

export interface UserSubscription {
  id: string;
  planName: string;
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

  getMySubscription() {
    return this.api.get<any>('/me/subscription').pipe(
      map(res => this.normalize(res)),
      catchError(err => {
        if (err?.status === 404) {
          return of(null); // regra de negócio: sem assinatura ativa
        }
        return throwError(() => err);
      })
    );
  }

  private normalize(res: any): UserSubscription {
    if (!res) {
      return {
        id: 'n/a',
        planName: 'Plano',
        status: 'INDEFINIDO'
      } as UserSubscription;
    }
    const src = res.subscription ?? res.plan ?? res;
    const base = src.plan ?? src; // alguns backends aninham plan
    return {
      id: String(src.id ?? base.id ?? src.uuid ?? base.uuid ?? 'sub-unknown'),
      planName: base.name ?? base.planName ?? base.title ?? 'Plano',
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
