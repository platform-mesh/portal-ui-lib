import { PlatformMeshFieldDefinition } from '@platform-mesh/portal-ui-lib/models';
import { flattenFieldTree } from './flatten-field-tree';

export type GenerateGraphQLFieldsOptions = {
  /** Omit fields marked uiSettings.writeOnly (for queries/mutation return selections). */
  forRead?: boolean;
};

export const isWriteOnlyField = (field: PlatformMeshFieldDefinition): boolean =>
  Boolean(field.uiSettings?.writeOnly);

/** Builds GraphQL field selections for reads, omitting write-only secrets. */
export const generateGraphQLReadFields = (
  uiFields: readonly PlatformMeshFieldDefinition[],
): any[] => generateGraphQLFields(uiFields, { forRead: true });

export const generateGraphQLFields = (
  uiFields: readonly PlatformMeshFieldDefinition[],
  options: GenerateGraphQLFieldsOptions = {},
): any[] => {
  const graphQLFields: any[] = [];
  const flattened = flattenFieldTree(uiFields);
  const fields = options.forRead
    ? flattened.filter((field) => !isWriteOnlyField(field))
    : flattened;
  fields.map((field) => {
    if (field.property instanceof Array) {
      field.property.map((property) => generate(property, graphQLFields));
    } else {
      generate(field.property, graphQLFields);
    }
  });
  return graphQLFields;
};

const generate = (root: string | undefined, fields: any = []) => {
  if (!root) {
    return [];
  }

  const paths = root.split('.');

  for (const part of paths) {
    if (paths.length === 1) {
      fields.push(part);
      return fields;
    }

    fields.push({
      [part]: [...generate(paths.splice(1).join('.'))],
    });

    return fields;
  }
};
