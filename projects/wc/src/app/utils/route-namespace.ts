import { ALL_NAMESPACE } from '@platform-mesh/portal-ui-lib/models';
import { ResourceNodeContext } from '@platform-mesh/portal-ui-lib/services';
import { isNamespacedResource } from '@platform-mesh/portal-ui-lib/utils';

const REQUIRED_NAMESPACE_VARIABLE = /\$namespace\s*:\s*\w+\s*!/;

/**
 * Returns the context with the route's `namespaceId` path param when a
 * namespaced context resolves no namespace, i.e. the namespace selection is
 * '-all-' (or missing) while the route points at one namespace. A namespace
 * that already resolves from the context or the ?namespace param is kept.
 *
 * @param namespace the namespace resolved for the context, as returned by
 *   ResourceService.getNamespace
 * @param pathParams the route's path params, as returned by
 *   LuigiClient.getPathParams
 */
export function withRouteNamespace(
  context: ResourceNodeContext,
  namespace: string | undefined,
  pathParams: object | undefined,
): ResourceNodeContext {
  if (!isNamespacedResource(context) || namespace) {
    return context;
  }
  const routeNamespace = (pathParams as Record<string, string> | undefined)
    ?.namespaceId;
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
