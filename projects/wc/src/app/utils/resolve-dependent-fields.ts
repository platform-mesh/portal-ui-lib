import type { FormFieldChangeEvent, FormFieldDefinition } from '@openmfp/ngx';
import type { PlatformMeshFieldDefinition } from '@platform-mesh/portal-ui-lib/models';

export interface ResolveDependentFieldsResult {
  fields: FormFieldDefinition[];
  initialValues: Record<string, unknown>;
  /** names of the fields that were (re-)resolved — useful for hosts that need to clear
   *  side-state (e.g. field errors) alongside the override. */
  resolvedNames: string[];
}

/**
 * Finds dependents of a changed field, re-resolves each one's `values`, and
 * returns a payload shaped for the ngx dialog's `onFieldChange` hook plus the
 * list of resolved field names.
 *
 * Returns `undefined` when no field depends on the changed one — hosts should
 * treat that as "no update".
 *
 * `allFields` is the authoritative source of `dynamicValuesDefinition`+`dependsOn`
 * (the untouched createView fields). `currentFields` is what the dialog currently
 * renders (same shape as the ngx hook's second argument) and is used to compute
 * `nextFields` by replacing dependents' `values`.
 *
 * `resolve(field, formValues)` is the host's dynamic-values resolver (typically
 * a thin forwarder to resolveFieldDynamicValues).
 */
export async function resolveDependentFields(
  event: FormFieldChangeEvent,
  currentFields: FormFieldDefinition[],
  allFields: PlatformMeshFieldDefinition[],
  resolve: (
    field: PlatformMeshFieldDefinition,
    formValues: Record<string, unknown>,
  ) => Promise<string[] | undefined>,
): Promise<ResolveDependentFieldsResult | undefined> {
  const name = event.fieldProperty;
  const dependents = allFields.filter(
    (f) => f.dynamicValuesDefinition?.dependsOn?.includes(name),
  );
  if (dependents.length === 0) return undefined;

  const formValues: Record<string, unknown> = { [name]: event.value };
  const resolved = new Map<string, string[]>();
  await Promise.all(
    dependents.map(async (f) => {
      const property = f.property as string;
      const values = (await resolve(f, formValues)) ?? [];
      resolved.set(property, values);
    }),
  );

  const nextFields = currentFields.map((ff) =>
    resolved.has(ff.name) ? { ...ff, values: resolved.get(ff.name)! } : ff,
  );
  const cleared: Record<string, unknown> = {};
  for (const n of resolved.keys()) cleared[n] = '';

  return { fields: nextFields, initialValues: cleared, resolvedNames: [...resolved.keys()] };
}
