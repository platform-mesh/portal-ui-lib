import { Resource } from '@openmfp/portal-ui-lib';
import { getResourceValueByJsonPath } from './resource-field-by-path';

export const getValueByPath = <T extends object, R = unknown>(
  obj: T,
  path: string,
): R | undefined => {
  return getResourceValueByJsonPath(obj as Resource, {
    jsonPathExpression: path,
    property: '',
  });
};
