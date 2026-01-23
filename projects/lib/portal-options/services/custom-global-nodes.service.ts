import { PortalNodeContext } from '../models/luigi-context';
import { PortalLuigiNode } from '../models/luigi-node';
import { inject } from '@angular/core';
import {
  CustomGlobalNodesService,
  EntityType,
  I18nService,
  NodeContext,
} from '@openmfp/portal-ui-lib';

export class CustomGlobalNodesServiceImpl implements CustomGlobalNodesService {
  private i18nService = inject(I18nService);

  async getCustomGlobalNodes(): Promise<PortalLuigiNode[]> {
    return [
      {
        pathSegment: 'error',
        order: '1000',
        hideFromNav: true,
        showBreadcrumbs: false,
        context: {} as PortalNodeContext,
        children: [
          {
            pathSegment: ':id',
            entityType: EntityType.ENTITY_ERROR,
            hideFromNav: true,
            hideSideNav: true,
            viewUrl: '/assets/platform-mesh-portal-ui-wc.js#error-component',
            context: {
              id: ':id',
              translationTable: this.i18nService.translationTable,
            } as any as NodeContext,
            webcomponent: {
              selfRegistered: true,
            },
          },
        ],
      },
      {
        pathSegment: 'users',
        showBreadcrumbs: false,
        hideSideNav: true,
        hideFromNav: true,
        context: {} as PortalNodeContext,
        entityType: 'global',
        children: [
          {
            pathSegment: ':userId',
            hideSideNav: true,
            hideFromNav: true,
            defineEntity: {
              id: 'user',
            },
            context: {
              userId: ':userId',
            } as PortalNodeContext,
            children: [
              {
                pathSegment: 'overview',
                context: {} as PortalNodeContext,
                hideSideNav: true,
                hideFromNav: true,
                defineEntity: {
                  id: 'overview',
                },
                compound: {
                  children: [],
                },
              },
            ],
          },
        ],
      },
    ];
  }
}
