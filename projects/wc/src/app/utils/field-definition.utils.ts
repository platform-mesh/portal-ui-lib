import { LuigiClient } from '@luigi-project/client/luigi-element';
import { FieldDefinition } from '@platform-mesh/portal-ui-lib/models';
import { getResourceValueByJsonPath } from '@platform-mesh/portal-ui-lib/utils';

export function getFieldValue<T>(
  field: FieldDefinition,
  resource: T | undefined,
) {
  if (resource) {
    return getResourceValueByJsonPath<T>(resource, field) ?? field.value;
  }

  return field.value;
}

export function executeButtonAction<T>(
  luigiClient: LuigiClient,
  field: FieldDefinition,
  resource: T | undefined,
) {
  const buttonSettings = field.uiSettings?.buttonSettings;
  const path = getFieldValue(field, resource);

  if (!buttonSettings?.action) {
    throw Error(
      `Missing button action for field "${field.label ?? (typeof field.property === 'string' ? field.property : 'unknown')}"`,
    );
  }

  if (typeof path !== 'string' || path.trim() === '') {
    throw Error(
      `Missing or invalid button path for field "${field.label ?? (typeof field.property === 'string' ? field.property : 'unknown')}"`,
    );
  }

  const synitzedPath = path.trim();

  switch (buttonSettings.action) {
    case 'navigate':
      luigiClient.linkManager().navigate(synitzedPath);
      break;
    case 'openInModal':
      luigiClient
        .linkManager()
        .openAsModal(synitzedPath, buttonSettings.modalSettings);
      break;
    default:
      throw Error(
        `Unsupported action: ${buttonSettings?.action}, in field declaration: ${JSON.stringify(field)}`,
      );
  }
}
