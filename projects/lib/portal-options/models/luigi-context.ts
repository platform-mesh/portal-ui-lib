import { NodeContext } from '@openmfp/portal-ui-lib';
import { Resource } from '@platform-mesh/portal-ui-lib/models';

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
