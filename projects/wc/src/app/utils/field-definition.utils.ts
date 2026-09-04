import { ResourceFieldNames } from '../components/generic-ui/create-resource-modal/create-resource-modal.consts';
import { LuigiClient } from '@luigi-project/client/luigi-element';
import { FieldDefinition } from '@openmfp/ngx';
import {
  ModalResult,
  PlatformMeshFieldDefinition,
} from '@platform-mesh/portal-ui-lib/models';
import { getResourceValueByJsonPath } from '@platform-mesh/portal-ui-lib/utils';

export function isCreateFieldOnly(field: PlatformMeshFieldDefinition): boolean {
  return (
    field.property === ResourceFieldNames.MetadataName ||
    field.property === ResourceFieldNames.SpecType ||
    field.property === ResourceFieldNames.MetadataNamespace
  );
}

export function getFieldValue<T>(
  field: FieldDefinition,
  resource: T | undefined,
) {
  if (resource) {
    return getResourceValueByJsonPath<T>(resource, field) ?? field.value;
  }

  return field.value;
}

export function executeButtonAction<T, R = unknown>(
  luigiClient: LuigiClient,
  field: FieldDefinition,
  resource: T | undefined,
  callBack?: (result?: ModalResult<R>) => unknown,
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
      return;
    case 'openInModal':
      // openAsModal returns a Promise resolved with a { data } envelope that
      // wraps the goBackContext, but the luigi-element d.ts incorrectly
      // declares it as void. The value is undefined when closed without a
      // goBack context.
      return (
        luigiClient
          .linkManager()
          .openAsModal(
            synitzedPath,
            buttonSettings.modalSettings,
          ) as unknown as Promise<ModalResult<R> | undefined>
      ).then(callBack);
    default:
      throw Error(
        `Unsupported action: ${buttonSettings?.action}, in field declaration: ${JSON.stringify(field)}`,
      );
  }
}
