import { FormFieldDefinition } from '@openmfp/ngx';
import { PlatformMeshFieldDefinition } from '@platform-mesh/portal-ui-lib/models';

/**
 * Returns the set of field names that are referenced by at least one other
 * field's `dynamicValuesDefinition.dependsOn`. These are the "parent" (trigger)
 * fields — they need `validation:'onChange'` so their changes are observable.
 *
 * Only direct, one-level dependencies are handled. The returned names match
 * the field `property` values (e.g. `"metadata.namespace"`).
 */
export function collectDependencyTriggers(
  fields: readonly PlatformMeshFieldDefinition[],
): Set<string> {
  const triggers = new Set<string>();
  for (const f of fields)
    for (const dep of f.dynamicValuesDefinition?.dependsOn ?? [])
      triggers.add(dep);
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
