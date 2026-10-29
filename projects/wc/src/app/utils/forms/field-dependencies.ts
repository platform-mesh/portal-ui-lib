import { FORM_PLACEHOLDER_PATTERN } from './resolve-form-placeholders';
import { FormFieldDefinition } from '@openmfp/ngx';
import { PlatformMeshFieldDefinition } from '@platform-mesh/portal-ui-lib/models';

/** Returns the distinct form properties referenced in query variable values. */
export function collectFieldDependencies(
  field: PlatformMeshFieldDefinition,
): string[] {
  const dependencies = new Set<string>();
  for (const value of Object.values(
    field.dynamicValuesDefinition?.gqlQueryVariables ?? {},
  )) {
    for (const match of value.matchAll(FORM_PLACEHOLDER_PATTERN)) {
      dependencies.add(match[1]);
    }
  }
  return [...dependencies];
}

/**
 * Returns the set of field names that are referenced by at least one other
 * field's `{form.<property>}` query placeholders. These are the "parent" (trigger)
 * fields — they need `validation:'onChange'` so their changes are observable.
 *
 * Only direct, one-level dependencies are handled. The returned names match
 * the field `property` values (e.g. `"metadata.namespace"`).
 */
export function collectDependencyTriggers(
  fields: readonly PlatformMeshFieldDefinition[],
): Set<string> {
  const triggers = new Set<string>();
  for (const field of fields)
    for (const dependency of collectFieldDependencies(field))
      triggers.add(dependency);
  return triggers;
}

/**
 * Marks each form field that is a dependency trigger with `validation:'onChange'`
 * so its changes are observable via the form's fieldChange hook.
 *
 * Mutates `formFields` in place and returns it for chaining. No-op when there
 * are no triggers in `fields`.
 */
export function applyDependencyTriggers(
  formFields: FormFieldDefinition[],
  fields: readonly PlatformMeshFieldDefinition[],
): FormFieldDefinition[] {
  const triggers = collectDependencyTriggers(fields);
  if (triggers.size === 0) return formFields;
  for (const ff of formFields) {
    if (triggers.has(ff.name)) {
      ff.validation = 'onChange';
    }
  }
  return formFields;
}
