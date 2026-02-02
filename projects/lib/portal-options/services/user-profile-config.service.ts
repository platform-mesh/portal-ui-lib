import { Injectable, inject } from '@angular/core';
import {
  AuthService,
  UserProfile,
  UserProfileConfigService,
} from '@openmfp/portal-ui-lib';

@Injectable({ providedIn: 'root' })
export class UserProfileConfigServiceImpl implements UserProfileConfigService {
  private authService = inject(AuthService);
  async getProfile(): Promise<UserProfile> {
    const { email } = this.authService.getUserInfo();

    return {
      items: [
        {
          label: 'PROFILE_PROFILE',
          icon: 'customer',
          link: `/users/${email}/overview`,
        },
      ],
    };
  }
}
