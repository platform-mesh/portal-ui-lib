import { LuigiClient } from '@luigi-project/client/luigi-element';
import { ALL_NAMESPACE } from '@platform-mesh/portal-ui-lib/models';
import {
  ResourceNodeContext,
  ResourceService,
} from '@platform-mesh/portal-ui-lib/services';
import { isNamespacedResource } from '@platform-mesh/portal-ui-lib/utils';

const REQUIRED_NAMESPACE_VARIABLE = /\$namespace\s*:\s*\w+\s*!/;

/**
 * Returns the context with the route's `namespaceId` path param when a
 * namespaced context resolves no namespace, i.e. the namespace selection is
 * '-all-' (or missing) while the route points at one namespace. A namespace
 * that already resolves from the context or the ?namespace param is kept.
 */
export function withRouteNamespace(
  context: ResourceNodeContext,
  resourceService: ResourceService,
  luigiClient: LuigiClient,
): ResourceNodeContext {
  if (!isNamespacedResource(context) || resourceService.getNamespace(context)) {
    return context;
  }
  const routeNamespace = (
    luigiClient.getPathParams?.() as Record<string, string> | undefined
  )?.namespaceId;
  return routeNamespace && routeNamespace !== ALL_NAMESPACE
    ? { ...context, namespaceId: routeNamespace }
    : context;
}

/**
 * True when the query declares a non-null `$namespace` variable but no
 * namespace is available, so the gateway would reject it.
 */
export function isMissingRequiredNamespace(
  query: unknown,
  namespace: string | undefined,
): boolean {
  return (
    !namespace &&
    typeof query === 'string' &&
    REQUIRED_NAMESPACE_VARIABLE.test(query)
  );
}
