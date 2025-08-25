import { kcpRootOrgsPath } from '../models/constants';
import { PortalNodeContext } from '../models/luigi-context';
import { PortalLuigiNode } from '../models/luigi-node';
import { inject } from '@angular/core';
import { CustomGlobalNodesService, I18nService } from '@openmfp/portal-ui-lib';

export class CustomGlobalNodesServiceImpl implements CustomGlobalNodesService {
  private i18nService = inject(I18nService);

  async getCustomGlobalNodes(): Promise<PortalLuigiNode[]> {
    return [
      {
        label: 'PROFILE_ORGANIZATION_MANAGEMENT',
        pathSegment: 'organization-management',
        hideFromNav: true,
        hideSideNav: true,
        order: '1001',
        viewUrl: '/assets/openmfp-portal-ui-wc.js#organization-management',
        webcomponent: {
          selfRegistered: true,
        },
        context: {
          translationTable: this.i18nService.translationTable,
          kcpPath: kcpRootOrgsPath,
        } as PortalNodeContext,
      },
    ];
  }
}
