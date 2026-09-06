import { FormFieldDefinition } from '@openmfp/ngx';
import { PlatformMeshFieldDefinition } from '@platform-mesh/portal-ui-lib/models';
import { flattenFieldTree, isWriteOnlyField } from '@platform-mesh/portal-ui-lib/utils';

export { flattenFieldTree } from '@platform-mesh/portal-ui-lib/utils';

export const WRITE_ONLY_EDIT_PLACEHOLDER = 'Leave empty to keep unchanged';

export type DisabledPredicate = (field: PlatformMeshFieldDefinition) => boolean;

export type DynamicValuesResolver = (
  field: PlatformMeshFieldDefinition,
) => Promise<string[] | undefined>;

const METADATA_NAME_FIELD = 'metadata.name';

export interface ToFormFieldsOptions {
  disabled?: DisabledPredicate;
  resolveDynamicValues?: DynamicValuesResolver;
  /** When true, write-only fields are optional and show a keep-unchanged placeholder. */
  editMode?: boolean;
}

/**
 * Asynchronous variant of `toFormFields`. Resolves every field's
 * `dynamicValuesDefinition.values` in parallel via
 * `options.resolveDynamicValues`; nested collection sub-fields are
 * resolved too. Falls back to the synchronous mapping when the option is
 * not provided.
 */
export async function toFormFields(
  fields: readonly PlatformMeshFieldDefinition[] | undefined,
  options: ToFormFieldsOptions = {},
): Promise<FormFieldDefinition[]> {
  if (!options.resolveDynamicValues) {
    return mapFields(fields, options, undefined);
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

      if (field.propertyCollection?.length) {
        formField.propertyCollection = await mapFieldsAsync(
          field.propertyCollection,
          options,
          collectionPath(field),
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
  const rawName = field.property as string;
  const name = stripParentPath(rawName, parentCollectionPath);

  const formField: FormFieldDefinition = {
    name,
    label: field.label ?? name,
    required: field.required,
  };

  if (field.values?.length) {
    formField.values = field.values as string[];
  }

  if (field.propertyCollection?.length) {
    formField.propertyCollection = mapFields(
      field.propertyCollection,
      options,
      collectionPath(field),
    );
  }

  if (options.disabled) {
    formField.disabled = options.disabled(field);
  }

  if (isSecretFormField(field)) {
    formField.inputType = 'Password';
    formField.writeOnly = isWriteOnlyField(field);
    if (options.editMode) {
      formField.placeholder = WRITE_ONLY_EDIT_PLACEHOLDER;
      formField.required = false;
    }
  }

  if (isBooleanFormField(field)) {
    formField.inputType = 'Switch';
  }

  const hint = field.uiSettings?.hint?.trim();
  if (hint) {
    formField.hint = hint;
  }

  if (field.required || field.property === METADATA_NAME_FIELD) {
    formField.validation = 'onChange';
  }

  return formField;
}

/** The dot-path to a collection field's array — its own `property`. */
function collectionPath(
  field: PlatformMeshFieldDefinition,
): string | undefined {
  return typeof field.property === 'string' ? field.property : undefined;
}

export function isSecretFormField(field: PlatformMeshFieldDefinition): boolean {
  return (
    isWriteOnlyField(field) || field.uiSettings?.displayAs === 'secret'
  );
}

export function isBooleanFormField(field: PlatformMeshFieldDefinition): boolean {
  return (field.uiSettings?.displayAs as string | undefined) === 'switch';
}

export function coerceBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false' || normalized === '') return false;
  }
  return Boolean(value);
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
 * - **Collection fields** — read the array at the field's `property` path
 *   from the resource. For every entry in that array, build a nested object
 *   whose keys are the sub-fields' `property`s **after prefix stripping**
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
  if (!resource) {
    const result: Record<string, unknown> = {};
    for (const field of fields ?? []) {
      if (typeof field.property !== 'string') continue;
      if (isBooleanFormField(field)) {
        result[field.property] =
          field.value !== undefined ? coerceBoolean(field.value) : false;
      }
    }
    return result;
  }

  const result: Record<string, unknown> = {};
  for (const field of fields ?? []) {
    const path = collectionPath(field);
    if (field.propertyCollection?.length && path) {
      const rawArray = readPath(resource, path);
      const entries = Array.isArray(rawArray) ? rawArray : [];
      result[path] = entries.map((entry) =>
        buildCollectionEntry(
          entry as Record<string, unknown>,
          field.propertyCollection ?? [],
          path,
        ),
      );
      continue;
    }

    if (typeof field.property === 'string') {
      const raw = readPath(resource, field.property) ?? '';
      result[field.property] = isBooleanFormField(field)
        ? coerceBoolean(raw)
        : raw;
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
    const subPath = collectionPath(sub);
    if (sub.propertyCollection?.length && subPath) {
      const key = stripParentPath(subPath, parentCollectionPath);
      const rawArray =
        readPath(sourceEntry, key) ?? readPath(sourceEntry, subPath);
      const entries = Array.isArray(rawArray) ? rawArray : [];
      entry[key] = entries.map((nested) =>
        buildCollectionEntry(
          nested as Record<string, unknown>,
          sub.propertyCollection ?? [],
          subPath,
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
