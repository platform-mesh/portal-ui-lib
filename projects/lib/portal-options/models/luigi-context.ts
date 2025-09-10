import { NodeContext, Resource } from '@openmfp/portal-ui-lib';

export interface PortalContext extends Record<string, any> {
  crdGatewayApiUrl: string;
}

interface PortalEntityContext {
  account: {
    id: string;
  };
}

export interface PortalNodeContext extends NodeContext {
  portalContext: PortalContext;
  kcpPath?: string;
  translationTable?: any;
  namespaceId?: string;
  entity?: Resource;
  entityId?: string;
  entityContext?: PortalEntityContext;
}
