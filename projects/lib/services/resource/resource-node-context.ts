import { NodeContext } from '@openmfp/portal-ui-lib';
import { ResourceDefinition } from '@platform-mesh/portal-ui-lib/models';

export interface ResourceNodeContext extends Partial<NodeContext> {
  resourceDefinition?: ResourceDefinition;
  organization?: string;
  entityName?: string;
  resourceId?: string;
  accountId?: string;
  kcpCA?: string;
  namespaceId?: string;
  namespaces?: string[];
  portalContext: {
    crdGatewayApiUrl: string;
    openSearchApiUrl?: string;
    kcpWorkspaceUrl?: string;
  };
}
