import { NodeContext } from '@openmfp/portal-ui-lib';

export function isNamespacedResource(nodeContext: Partial<NodeContext>) {
  return nodeContext?.resourceDefinition?.scope === 'Namespaced';
}
