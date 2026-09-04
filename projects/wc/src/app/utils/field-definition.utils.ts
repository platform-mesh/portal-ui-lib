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

/**
 * Executes the action defined by a button field definition.
 *
 * Supported actions:
 * - `'navigate'` — calls `LuigiClient.linkManager().navigate(path)`.
 * - `'openInModal'` — opens the route at `path` in a Luigi modal via
 *   `LuigiClient.linkManager().openAsModal(path, modalSettings)`.
 *
 * **`openInModal` / `openAsModal` return value**
 *
 * `openAsModal` returns a `Promise` that resolves when the modal is closed.
 * The resolved value is a `ModalResult` envelope — or `undefined` when the
 * modal is dismissed without a `goBack` call.
 *
 * To pass data **back** from the modal to the calling component, close the
 * modal inside the routed micro-frontend using:
 * ```ts
 * LuigiClient.linkManager().goBack({ status: 'submit', action: 'create', resource: created });
 * ```
 * Luigi wraps the argument in a `{ data }` envelope, so `callBack` receives:
 * ```ts
 * { data: { status: 'submit', action: 'create', resource: created } }
 * ```
 * When the modal is dismissed (e.g. close button or ESC) without a `goBack`
 * call, `callBack` receives `undefined`.
 *
 * @param luigiClient - The `LuigiClient` instance bound to the current element.
 * @param field - Field definition that carries the action type, path, and modal settings.
 * @param resource - Optional resource whose properties may be used as the navigation path.
 * @param callBack - Optional function invoked with the `ModalResult` once the modal closes.
 *   Only called for `openInModal` actions. Return value propagates as the resolved value.
 *
 * @throws {Error} When `buttonSettings.action` is missing or falsy.
 * @throws {Error} When the resolved path is not a non-empty string.
 * @throws {Error} When the action is not one of the supported values.
 *
 * @typeParam T - Type of the resource passed in.
 * @typeParam R - Type of the affected resource inside the `ModalResultContext`.
 */
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
