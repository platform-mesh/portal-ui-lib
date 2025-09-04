import { Injectable } from '@angular/core';
import { UserProfile, UserProfileConfigService } from '@openmfp/portal-ui-lib';

@Injectable({ providedIn: 'root' })
export class UserProfileConfigServiceImpl implements UserProfileConfigService {
  async getProfile(): Promise<UserProfile> {
    return {
      items: [
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
