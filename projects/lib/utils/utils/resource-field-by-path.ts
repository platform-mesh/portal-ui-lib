import { Resource } from '@platform-mesh/portal-ui-lib/models';
import jsonpath from 'jsonpath';

export const getResourceValueByJsonPath = (
  resource: Resource,
  field: { jsonPathExpression?: string; property?: string | string[] },
) => {
  const property = field?.jsonPathExpression || field?.property;
  if (!property) {
    return undefined;
  }

  if (property instanceof Array) {
    console.error(
      `Property defined as an array: ${JSON.stringify(property)}, provide "jsonPathExpression" field to properly ready resource value`,
    );
    return undefined;
  }

  const value = jsonpath.query(resource, `$.${property}`);
  return value.length ? value[0] : undefined;
};
