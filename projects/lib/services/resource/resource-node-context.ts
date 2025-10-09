import { NodeContext } from '@openmfp/portal-ui-lib';

export interface ResourceNodeContext extends Partial<NodeContext> {
  organization?: string;
  accountId?: string;
  kcpCA?: string;
  entity?: {
    metadata: {
      name: string;
      namespace?: string;
    };
  };
  namespaceId?: string;
  portalContext: {
    crdGatewayApiUrl: string;
    kcpWorkspaceUrl?: string;
  };
}
