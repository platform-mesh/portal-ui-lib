import { PortalNodeContext } from './luigi-context';
import type { EntityDefinition } from '@openmfp/portal-ui-lib';
import { LuigiNode } from '@openmfp/portal-ui-lib';

export interface PortalLuigiNode extends LuigiNode {
  defineEntity?: PMEntityDefinition;
  context: PortalNodeContext;
  parent?: PortalLuigiNode;
}

export interface PMEntityDefinition extends EntityDefinition {
  graphqlEntity?: GraphqlEntityDefinition;
}

export interface GraphqlEntityDefinition {
  group: string;
  kind: string;
  query: string;
  version: string;
}
