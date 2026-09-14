import { PlatformMeshFieldDefinition } from '@platform-mesh/portal-ui-lib/models';

/** Flattens nested `propertyCollection` trees into a list of leaf field definitions. */
export function flattenFieldTree(
  fields: readonly PlatformMeshFieldDefinition[] | undefined,
): PlatformMeshFieldDefinition[] {
  const result: PlatformMeshFieldDefinition[] = [];
  for (const field of fields ?? []) {
    if (field.propertyCollection?.length) {
      result.push(...flattenFieldTree(field.propertyCollection));
      continue;
    }
    result.push(field);
  }
  return result;
}
