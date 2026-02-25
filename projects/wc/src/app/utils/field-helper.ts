import { LuigiClient } from '@luigi-project/client/luigi-element';
import { FieldDefinition, Resource } from '@platform-mesh/portal-ui-lib/models';
import { getResourceValueByJsonPath } from '@platform-mesh/portal-ui-lib/utils';

export const getFieldValue = (
  field: FieldDefinition,
  resource: Resource | undefined,
) => {
  if (resource) {
    return getResourceValueByJsonPath(resource, field) ?? field.value;
  }

  return field.value;
};

export const executeButtonAction = (
  luigiClient: LuigiClient,
  field: FieldDefinition,
  resource: Resource | undefined,
) => {
  const buttonSettings = field.uiSettings?.buttonSettings;
  const path = getFieldValue(field, resource);

  switch (buttonSettings?.action) {
    case 'navigate':
      luigiClient.linkManager().navigate(path);
      break;
    case 'openInModal':
      luigiClient
        .linkManager()
        .openAsModal(path, buttonSettings?.modalSettings);
      break;
    default:
      throw Error(
        `Unsupported action: ${buttonSettings?.action}, in field declaration: ${JSON.stringify(field)}`,
      );
  }
};
