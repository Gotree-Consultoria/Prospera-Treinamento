import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, take } from 'rxjs/operators';

import { AuthService } from '../services/auth.service';

export const adminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const authorize = () => (authService.hasRole('SYSTEM_ADMIN') ? true : router.createUrlTree(['/']));

  if (authService.isAuthenticated()) {
    const immediate = authorize();
    if (immediate === true) {
      return true;
    }
    return immediate;
  }

  return authService.user$.pipe(
    take(1),
    map(() => authorize())
  );
};
