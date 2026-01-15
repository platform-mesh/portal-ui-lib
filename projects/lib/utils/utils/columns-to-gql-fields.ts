import {
  FieldDefinition,
  ReadyCondition,
} from '@platform-mesh/portal-ui-lib/models';

export const generateGqlFieldsWithReadyConditions = (
  uiFields: FieldDefinition[],
  readyCondition: ReadyCondition | undefined,
) => {
  if (!readyCondition) {
    return generateGraphQLFields(uiFields);
  }

  return generateGraphQLFields(uiFields.concat(readyCondition));
};

export const generateGraphQLFields = (uiFields: FieldDefinition[]): any[] => {
  const graphQLFields = [];
  uiFields.map((field) => {
    if (field.property instanceof Array) {
      field.property.map((property) => generate(property, graphQLFields));
    } else {
      generate(field.property, graphQLFields);
    }
  });
  return graphQLFields;
};

const generate = (root: string, fields: any = []) => {
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
