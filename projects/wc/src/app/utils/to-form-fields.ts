import { FormFieldDefinition } from '@openmfp/ngx';
import { PlatformMeshFieldDefinition } from '@platform-mesh/portal-ui-lib/models';

export function flattenFieldTree(
  fields: readonly PlatformMeshFieldDefinition[] | undefined,
): PlatformMeshFieldDefinition[] {
  const result: PlatformMeshFieldDefinition[] = [];
  for (const field of fields ?? []) {
    if (field.collection?.length) {
      result.push(...flattenFieldTree(field.collection));
      continue;
    }
    result.push(field);
  }
  return result;
}

export type DisabledPredicate = (field: PlatformMeshFieldDefinition) => boolean;

export type DynamicValuesResolver = (
  field: PlatformMeshFieldDefinition,
) => Promise<string[] | undefined>;

const METADATA_NAME_FIELD = 'metadata.name';

export interface ToFormFieldsOptions {
  disabled?: DisabledPredicate;
  resolveDynamicValues?: DynamicValuesResolver;
}

export function toFormFields(
  fields: readonly PlatformMeshFieldDefinition[] | undefined,
  options: ToFormFieldsOptions = {},
): FormFieldDefinition[] {
  return mapFields(fields, options, undefined);
}

/**
 * Asynchronous variant of `toFormFields`. Resolves every field's
 * `dynamicValuesDefinition.values` in parallel via
 * `options.resolveDynamicValues`; nested collection sub-fields are
 * resolved too. Falls back to the synchronous mapping when the option is
 * not provided.
 */
export async function toFormFieldsAsync(
  fields: readonly PlatformMeshFieldDefinition[] | undefined,
  options: ToFormFieldsOptions = {},
): Promise<FormFieldDefinition[]> {
  if (!options.resolveDynamicValues) {
    return toFormFields(fields, options);
  }
  return mapFieldsAsync(fields, options, undefined);
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

function mapFields(
  fields: readonly PlatformMeshFieldDefinition[] | undefined,
  options: ToFormFieldsOptions,
  parentCollectionPath: string | undefined,
): FormFieldDefinition[] {
  return (fields ?? []).map((field) =>
    buildFormField(field, options, parentCollectionPath),
  );
}

async function mapFieldsAsync(
  fields: readonly PlatformMeshFieldDefinition[] | undefined,
  options: ToFormFieldsOptions,
  parentCollectionPath: string | undefined,
): Promise<FormFieldDefinition[]> {
  return Promise.all(
    (fields ?? []).map(async (field) => {
      const formField = buildFormField(field, options, parentCollectionPath);

      if (field.dynamicValuesDefinition && options.resolveDynamicValues) {
        const resolved = await options.resolveDynamicValues(field);
        if (resolved !== undefined) {
          formField.values = resolved;
        }
      }

      if (field.collection?.length) {
        formField.collection = await mapFieldsAsync(
          field.collection,
          options,
          field.collectionProperty,
        );
      }

      return formField;
    }),
  );
}

function buildFormField(
  field: PlatformMeshFieldDefinition,
  options: ToFormFieldsOptions,
  parentCollectionPath: string | undefined,
): FormFieldDefinition {
  const rawName = field.collectionProperty || (field.property as string);
  const name = stripParentPath(rawName, parentCollectionPath);

  const formField: FormFieldDefinition = {
    name,
    label: field.label,
    required: field.required,
  };

  if (field.values?.length) {
    formField.values = field.values as string[];
  }

  if (field.collection?.length) {
    formField.collection = mapFields(
      field.collection,
      options,
      field.collectionProperty,
    );
  }

  if (options.disabled) {
    formField.disabled = options.disabled(field);
  }

  if (field.required || field.property === METADATA_NAME_FIELD) {
    formField.validation = 'onChange';
  }

  return formField;
}

function stripParentPath(
  name: string,
  parentCollectionPath: string | undefined,
): string {
  if (!parentCollectionPath) return name;
  if (name.startsWith(parentCollectionPath + '.')) {
    return name.slice(parentCollectionPath.length + 1);
  }
  return name;
}

/**
 * Builds the `initialValues` object handed to `<mfp-declarative-form>` from
 * a K8s resource, honouring the same field-tree semantics as `toFormFields`
 * so the two stay in lockstep.
 *
 * For each top-level `PlatformMeshFieldDefinition`:
 *
 * - **Scalar fields** — copy the value at the field's `property` path from
 *   the resource under the same key. Missing values become `''` so the
 *   input renders empty rather than uncontrolled.
 * - **Collection fields** — read the array at the field's `collectionProperty`
 *   path from the resource. For every entry in that array, build a nested
 *   object whose keys are the sub-fields' `name`s **after prefix stripping**
 *   (matching what `toFormFields` produced). This is what the collection
 *   editor expects on `initialEntries`.
 *
 * The output shape mirrors the form's flat `form.controls` map, so a caller
 * can hand it directly to the `initialValues` input without further
 * translation.
 */
export function buildInitialValues(
  fields: readonly PlatformMeshFieldDefinition[] | undefined,
  resource: Record<string, unknown> | undefined,
): Record<string, unknown> {
  if (!resource) return {};

  const result: Record<string, unknown> = {};
  for (const field of fields ?? []) {
    if (field.collection?.length && field.collectionProperty) {
      const rawArray = readPath(resource, field.collectionProperty);
      const entries = Array.isArray(rawArray) ? rawArray : [];
      result[field.collectionProperty] = entries.map((entry) =>
        buildCollectionEntry(
          entry as Record<string, unknown>,
          field.collection ?? [],
          field.collectionProperty!,
        ),
      );
      continue;
    }

    if (typeof field.property === 'string') {
      result[field.property] = readPath(resource, field.property) ?? '';
    }
  }
  return result;
}

/**
 * Builds one entry object for a collection field. Each sub-field's value
 * is read from the resource entry using its authored `property`, and stored
 * under the entry key produced by stripping the parent collection's path
 * prefix — the same key `toFormFields` used when configuring the sub-form.
 *
 * When a sub-field is itself a collection (nested arrays), recursion picks
 * up the same rules.
 */
function buildCollectionEntry(
  sourceEntry: Record<string, unknown>,
  subFields: readonly PlatformMeshFieldDefinition[],
  parentCollectionPath: string,
): Record<string, unknown> {
  if (!sourceEntry) return {};

  const entry: Record<string, unknown> = {};
  for (const sub of subFields) {
    if (sub.collection?.length && sub.collectionProperty) {
      const key = stripParentPath(sub.collectionProperty, parentCollectionPath);
      const rawArray =
        readPath(sourceEntry, key) ??
        readPath(sourceEntry, sub.collectionProperty);
      const entries = Array.isArray(rawArray) ? rawArray : [];
      entry[key] = entries.map((nested) =>
        buildCollectionEntry(
          nested as Record<string, unknown>,
          sub.collection ?? [],
          sub.collectionProperty!,
        ),
      );
      continue;
    }

    if (typeof sub.property !== 'string') continue;
    const key = stripParentPath(sub.property, parentCollectionPath);
    const value =
      readPath(sourceEntry, key) ??
      readPath(sourceEntry, sub.property) ??
      (sourceEntry as Record<string, unknown>)[sub.property] ??
      '';
    entry[key] = value;
  }
  return entry;
}

function readPath(obj: unknown, path: string): unknown {
  if (obj == null || !path) return undefined;
  return path.split('.').reduce<unknown>((acc, segment) => {
    if (acc == null || typeof acc !== 'object') return undefined;
    return (acc as Record<string, unknown>)[segment];
  }, obj);
}
