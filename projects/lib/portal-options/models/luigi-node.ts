import { PortalNodeContext } from './luigi-context';
import { LuigiNode } from '@openmfp/portal-ui-lib';

export interface PortalLuigiNode extends LuigiNode {
  context?: PortalNodeContext;
  parent?: PortalLuigiNode;
}
