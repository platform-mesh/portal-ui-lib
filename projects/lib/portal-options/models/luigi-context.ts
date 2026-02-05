import { NodeContext } from '@openmfp/portal-ui-lib';

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
  organizationId?: string;
  kcpCA?: string;
  kcpPath?: string;
  accountPath?: string;
  translationTable?: any;
  namespaceId?: string;
  entityName?: string;
  entityKind?: string;
  entityId?: string;
  entityContext?: PortalEntityContext;
}
