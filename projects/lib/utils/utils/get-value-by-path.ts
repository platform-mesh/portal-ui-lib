import { getResourceValueByJsonPath } from './resource-field-by-path';
import { Resource } from '@platform-mesh/portal-ui-lib/models';

export const getValueByPath = <T extends object, R = unknown>(
  obj: T,
  path: string,
): R | undefined => {
  return getResourceValueByJsonPath(obj as Resource, {
    jsonPathExpression: path,
  });
};
