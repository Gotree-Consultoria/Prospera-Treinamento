import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { firstValueFrom, of, throwError } from 'rxjs';
import { filter, take } from 'rxjs/operators';

import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import { UserProfile } from '../models/user';

describe('AuthService', () => {
  let service: AuthService;
  let apiService: jasmine.SpyObj<ApiService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    apiService = jasmine.createSpyObj<ApiService>('ApiService', ['get', 'post', 'patch']);
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);

    window.localStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: ApiService, useValue: apiService },
        { provide: Router, useValue: router }
      ]
    });

    service = TestBed.inject(AuthService);
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it('persiste token e emite usuário quando login retorna perfil', async () => {
    const profile: UserProfile = { id: '1', email: 'ana@empresa.com', name: 'Ana' };
  apiService.post.and.returnValue(of({ token: 'jwt-token', email: profile.email, profile }));

    const result = await firstValueFrom(service.login({ email: 'ana@empresa.com', password: '123456' }));

    expect(result.email).toBe('ana@empresa.com');
    expect(apiService.post).toHaveBeenCalledWith('/auth/login', { email: 'ana@empresa.com', password: '123456' }, { withCredentials: true });
    expect(window.localStorage.getItem('jwtToken')).toBe('jwt-token');
  expect(window.localStorage.getItem('loggedInUserEmail')).toBe('ana@empresa.com');

  const emitted = await firstValueFrom(service.user$.pipe(filter(Boolean), take(1)));
    expect(emitted?.name).toBe('Ana');
  });

  it('faz logout limpando sessão e redirecionando para / (home)', async () => {
  apiService.post.and.returnValue(of({ token: 'token', email: 'ana@empresa.com', profile: { email: 'ana@empresa.com' } }));
    await firstValueFrom(service.login({ email: 'ana@empresa.com', password: '123456' }));

  const removeSpy = spyOn(window.localStorage, 'removeItem').and.callThrough();

  service.logout();

  expect(removeSpy).toHaveBeenCalledWith('jwtToken');
  expect(router.navigate).toHaveBeenCalledWith(['/']);
  expect(service.isAuthenticated()).toBeFalse();
  });

  it('falha ao buscar perfil quando não há token', async () => {
    await expectAsync(firstValueFrom(service.fetchProfile())).toBeRejectedWithError('Token ausente.');
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('limpa sessão e navega ao falhar em buscar perfil com token', async () => {
    window.localStorage.setItem('jwtToken', 'token');
    apiService.get.and.returnValue(throwError(() => new Error('fail')));

    await expectAsync(firstValueFrom(service.fetchProfile())).toBeRejected();
  expect(router.navigate).toHaveBeenCalledWith(['/']);
    expect(window.localStorage.getItem('jwtToken')).toBeNull();
  });

  it('atualiza perfil preservando e-mail armazenado', async () => {
    const profile: UserProfile = { id: '1', email: 'ana@empresa.com', name: 'Ana' };
    apiService.post.and.returnValue(of({ token: 'token', profile }));
    await firstValueFrom(service.login({ email: 'ana@empresa.com', password: '123456' }));

  apiService.post.and.returnValue(of({ id: '1', name: 'Ana Carolina' } as UserProfile));

  const updated = await firstValueFrom(service.updateProfile({ name: 'Ana Carolina' }));
    expect(updated.name).toBe('Ana Carolina');

    const state = (service as any).userSubject.value as UserProfile | null;
    expect(state?.email).toBe('ana@empresa.com');
    expect(state?.name).toBe('Ana Carolina');
  });
});
