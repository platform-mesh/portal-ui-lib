import { NodeContext } from '@openmfp/portal-ui-lib';
import { ResourceDefinition } from '@platform-mesh/portal-ui-lib/models';

export interface ResourceNodeContext extends Partial<NodeContext> {
  resourceDefinition?: ResourceDefinition;
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