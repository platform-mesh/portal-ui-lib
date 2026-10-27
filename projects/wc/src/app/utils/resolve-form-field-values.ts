import { isImmutableOnEdit } from './field-definition.utils';
import {
  applyDependencyTriggers,
  collectFieldDependencies,
} from './field-dependencies';
import type { DynamicValuesResult } from './form-dependency-controller';
import { DynamicValuesResolver, toFormFields } from './to-form-fields';
import { FormFieldDefinition } from '@openmfp/ngx';
import { PlatformMeshFieldDefinition } from '@platform-mesh/portal-ui-lib/models';

type ResolveResult = (
  field: PlatformMeshFieldDefinition,
  formValues: Record<string, unknown>,
) => Promise<DynamicValuesResult>;

/**
 * Wraps a `DynamicValuesResult` producer as a `DynamicValuesResolver` usable
 * by `toFormFields`. Short-circuits to `[]` when any `{form.<property>}` parent
 * is empty, and translates `blocked`/`error` results into `[]` for dependent
 * fields or `undefined` for independent ones (so the latter fall back to the
 * field's static `values`).
 */
export function createDynamicValuesResolver(
  resolveResult: ResolveResult,
): DynamicValuesResolver {
  return async (field, formValues) => {
    const dependencies = collectFieldDependencies(field);
    if (
      dependencies.some(
        (parent) => formValues?.[parent] == null || formValues[parent] === '',
      )
    ) {
      return [];
    }
    const result = await resolveResult(field, formValues ?? {});
    return result.kind === 'ready'
      ? result.values
      : dependencies.length
        ? []
        : undefined;
  };
}

/**
 * Builds the `FormFieldDefinition[]` used by resource create/edit forms:
 * runs `toFormFields` with the shared disabled/dynamic-values policy, then
 * applies dependency triggers so parent-field changes are observable.
 *
 * Shared by `ResourceTableCard` and `ResourceFormModal`.
 */
export async function buildResourceFormFields(
  fields: PlatformMeshFieldDefinition[],
  values: Record<string, unknown>,
  opts: {
    editMode: boolean;
    resolveResult: ResolveResult;
  },
): Promise<FormFieldDefinition[]> {
  const formFields = await toFormFields(fields, {
    disabled: (field) => opts.editMode && isImmutableOnEdit(field),
    editMode: opts.editMode,
    formValues: values,
    resolveDynamicValues: createDynamicValuesResolver(opts.resolveResult),
  });
  applyDependencyTriggers(formFields, fields);
  return formFields;
}
