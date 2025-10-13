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
    const { userId } = this.authService.getUserInfo();

    return {
      items: [
        {
          label: 'PROFILE_PROFILE',
          icon: 'customer',
          link: `/users/${userId}/overview`,
        },
        {
          label: 'PROFILE_ORGANIZATION',
          icon: 'building',
          link: '/organization-management',
          openNodeInModal: {
            width: '360px',
            height: '260px',
          },
        },
      ],
    };
  }
}
