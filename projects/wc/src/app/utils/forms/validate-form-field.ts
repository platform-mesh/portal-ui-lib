import {
  K8S_NAME_ERROR,
  K8S_NAME_RE,
  ResourceFieldNames,
} from '../../components/generic-ui/create-resource-modal/create-resource-modal.consts';
import { PlatformMeshFieldDefinition } from '@platform-mesh/portal-ui-lib/models';

/**
 * Shared field-level validator used by host form consumers (modal + table
 * card). Mirrors the branches both components implemented inline before this
 * was extracted:
 *
 *  - `metadata.name`: required + k8s RFC 1035 regex
 *  - Any other field: `required` (unless `writeOnly && editMode`, in which
 *    case empty is allowed — write-only secrets keep their stored value when
 *    left blank on edit)
 *  - Unknown field name: `null` (no error)
 *
 * Returns the error string to display, or `null` when the field is valid.
 * Operates on `PlatformMeshFieldDefinition[]` matched by `property`, which
 * avoids the per-keystroke `await toFormFields(...)` the previous inline
 * implementations ran (network calls on every keystroke).
 */
export function validateFormField(params: {
  name: string;
  value: unknown;
  fields: PlatformMeshFieldDefinition[];
  editMode: boolean;
}): string | null {
  const trimmed = String(params.value ?? '').trim();

  if (params.name === ResourceFieldNames.MetadataName) {
    if (!trimmed) return 'This field is required';
    if (!K8S_NAME_RE.test(trimmed)) return K8S_NAME_ERROR;
    return null;
  }

  const field = params.fields.find((f) => f.property === params.name);
  if (!field) return null;
  if (field.writeOnly && !trimmed && params.editMode) return null;
  if (field.required && !trimmed) return 'This field is required';
  return null;
}
