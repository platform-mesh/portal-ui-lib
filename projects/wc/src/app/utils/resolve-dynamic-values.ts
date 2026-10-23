import type { DynamicValuesResult } from './form-dependency-controller';
import { resolveContextPlaceholders } from './resolve-context-placeholders';
import { resolveFormPlaceholders } from './resolve-form-placeholders';
import { isMissingRequiredNamespace } from './route-namespace';
import {
  PlatformMeshFieldDefinition,
  Resource,
} from '@platform-mesh/portal-ui-lib/models';
import { ResourceNodeContext } from '@platform-mesh/portal-ui-lib/services';
import { getValueByPath } from '@platform-mesh/portal-ui-lib/utils';
import { Observable, firstValueFrom } from 'rxjs';

/**
 * Dependencies that `resolveFieldDynamicValuesResult` needs from the host
 * component. The function stays pure (no `this`) by taking these callbacks
 * as a bundle. Call sites pass thin wrappers around `ResourceService` +
 * `ErrorHandlerService`.
 */
export interface ResolveFieldDynamicValuesDeps {
  list: (
    operation: string,
    gqlQuery: string,
    context: ResourceNodeContext,
    options?: {
      variables?: Record<string, { type: string; value: unknown }>;
    },
  ) => Observable<unknown[]>;
  getNamespace: (context: ResourceNodeContext) => string | undefined;
  handleError: (error: unknown) => void;
}

/**
 * Resolves the dynamic value options for a single field.
 *
 * Shared implementation extracted from `ResourceTableCard` and
 * `ResourceFormModal` — the only material difference between the two hosts
 * was which `context` and `isNamespaced` flag they used, so both are passed
 * in explicitly.
 *
 * Steps:
 * 1. Build GraphQL variables by resolving both `{context.*}` and `{form.*}`
 *    placeholders in `dynamicValuesDefinition.gqlQueryVariables`.
 * 2. Replace an unresolved namespace placeholder with the context namespace,
 *    when one is available. Never send a literal placeholder to GraphQL.
 * 3. Skip when any variable remains unresolved or a required `$namespace`
 *    is unavailable (`isMissingRequiredNamespace`).
 * 4. Call `deps.list(...)`, map each row with `getValueByPath(row, def.value)`,
 *    filter falsy entries.
 *
 * Returns a tagged `DynamicValuesResult` with explicit `kind: 'ready' |
 * 'blocked' | 'error'` so callers can distinguish available options from
 * unresolved dependencies and failed requests.
 */
export async function resolveFieldDynamicValuesResult(
  field: PlatformMeshFieldDefinition,
  context: ResourceNodeContext,
  isNamespaced: boolean,
  formValues: Record<string, unknown>,
  deps: ResolveFieldDynamicValuesDeps,
): Promise<DynamicValuesResult> {
  const def = field.dynamicValuesDefinition;
  if (!def) return { kind: 'blocked' };

  // Resolve {context.*} then {form.*} in each gqlQueryVariable value.
  const variables = Object.fromEntries(
    Object.entries(def.gqlQueryVariables ?? {}).map(([name, value]) => [
      name,
      {
        type: 'String',
        value: resolveFormPlaceholders(
          resolveContextPlaceholders(value, context),
          formValues,
        ),
      },
    ]),
  );

  // Harden namespace fallback: an unresolved {context.*}/{form.*} literal is
  // NOT a usable namespace value — fall back to the context namespace.
  const contextNamespace = isNamespaced
    ? deps.getNamespace(context)
    : undefined;
  const nsRaw = variables['namespace']?.value as string | undefined;
  const namespace =
    nsRaw && !/\{(context|form)\./.test(nsRaw) ? nsRaw : contextNamespace;
  if (variables['namespace'] && namespace)
    variables['namespace'].value = namespace;

  if (
    Object.values(variables).some(
      ({ value }) =>
        typeof value === 'string' && /\{(context|form)\./.test(value),
    )
  )
    return { kind: 'blocked' };

  // Without a required namespace the query can only fail.
  if (isMissingRequiredNamespace(def.gqlQuery, namespace))
    return { kind: 'blocked' };

  try {
    const resources = await firstValueFrom(
      deps.list(def.operation, def.gqlQuery, context, { variables }),
    );
    return {
      kind: 'ready',
      values: (resources as Resource[])
        .map((r) => getValueByPath(r, def.value) as string)
        .filter(Boolean),
    };
  } catch (error) {
    deps.handleError(error);
    return { kind: 'error', error };
  }
}
