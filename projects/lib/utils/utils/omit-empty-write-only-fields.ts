import { PlatformMeshFieldDefinition } from '@platform-mesh/portal-ui-lib/models';
import { deletePropertyByPath } from './delete-property-by-path';
import { flattenFieldTree } from './flatten-field-tree';
import { getValueByPath } from './get-value-by-path';
import { isWriteOnlyField } from './columns-to-gql-fields';

/** Drops write-only fields whose value is empty so updates leave them unchanged. */
export function omitEmptyWriteOnlyFields<T extends Record<string, unknown>>(
  resource: T,
  fields: readonly PlatformMeshFieldDefinition[] | undefined,
): T {
  const result = structuredClone(resource);

  for (const field of flattenFieldTree(fields)) {
    if (!isWriteOnlyField(field) || typeof field.property !== 'string') {
      continue;
    }

    const value = getValueByPath(result, field.property);
    if (value === '' || value == null) {
      deletePropertyByPath(result, field.property);
      pruneEmptyParents(result, field.property);
    }
  }

  return result;
}

function pruneEmptyParents(
  object: Record<string, unknown>,
  path: string,
): void {
  const segments = path.split('.').filter(Boolean);
  for (let i = segments.length - 1; i > 0; i -= 1) {
    const parentPath = segments.slice(0, i).join('.');
    const parent = getValueByPath(object, parentPath);
    if (
      parent &&
      typeof parent === 'object' &&
      !Array.isArray(parent) &&
      Object.keys(parent as Record<string, unknown>).length === 0
    ) {
      deletePropertyByPath(object, parentPath);
    } else {
      break;
    }
  }
}
