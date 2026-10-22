import { PlatformMeshFieldDefinition, Resource } from '@platform-mesh/portal-ui-lib/models';
import { ResourceNodeContext } from '@platform-mesh/portal-ui-lib/services';
import { getValueByPath } from '@platform-mesh/portal-ui-lib/utils';
import { Observable, firstValueFrom } from 'rxjs';

import { resolveContextPlaceholders } from './resolve-context-placeholders';
import { resolveFormPlaceholders } from './resolve-form-placeholders';
import { isMissingRequiredNamespace } from './route-namespace';

/**
 * Dependencies that `resolveFieldDynamicValues` needs from the host component.
 *
 * The function stays pure (no `this`) by taking these callbacks as a bundle.
 * Call sites pass thin wrappers around `ResourceService` + `ErrorHandlerService`.
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
 * 2. Harden the `namespace` variable: an UNRESOLVED `{context.*}`/`{form.*}`
 *    literal is NOT a usable namespace — fall back to the context namespace.
 * 3. Skip when the query declares a required `$namespace` but none is
 *    available (`isMissingRequiredNamespace`).
 * 4. Call `deps.list(...)`, map each row with `getValueByPath(row, def.value)`,
 *    filter falsy entries.
 * 5. On error, forward to `deps.handleError` and return `undefined`.
 *
 * Contract: returns `undefined` on skip or error (mirrors previous component
 * behavior), otherwise a possibly-empty string[] of resolved option values.
 */
export async function resolveFieldDynamicValues(
  field: PlatformMeshFieldDefinition,
  context: ResourceNodeContext,
  isNamespaced: boolean,
  formValues: Record<string, unknown>,
  deps: ResolveFieldDynamicValuesDeps,
): Promise<string[] | undefined> {
  const def = field.dynamicValuesDefinition;
  if (!def) return undefined;

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
  const contextNamespace = isNamespaced ? deps.getNamespace(context) : undefined;
  const nsRaw = variables['namespace']?.value as string | undefined;
  const namespace =
    nsRaw && !/\{(context|form)\./.test(nsRaw) ? nsRaw : contextNamespace;

  // Without a namespace the query can only fail. Fall back to a plain input.
  if (isMissingRequiredNamespace(def.gqlQuery, namespace)) return undefined;

  try {
    const resources = await firstValueFrom(
      deps.list(def.operation, def.gqlQuery, context, { variables }),
    );
    return (resources as Resource[])
      .map((r) => getValueByPath(r, def.value) as string)
      .filter(Boolean);
  } catch (error) {
    deps.handleError(error);
    return undefined;
  }
}
