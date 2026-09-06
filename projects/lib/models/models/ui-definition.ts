import {
  ButtonSettings,
  FieldFilterDefinition,
  FormFieldDefinition,
  TableFieldDefinition,
  UiSettings,
} from '@openmfp/ngx';

export type {
  ButtonSettings,
  CssRule,
  GenericResource,
  ModalSettings,
  PropertyField,
  TransformType,
  UiSettings,
  ResourceFieldButtonClickEvent,
} from '@openmfp/ngx';

export type PlatformMeshUiSettings = UiSettings & {
  writeOnly?: boolean;
  hint?: string;
  /** Render as a toggle switch in create/edit forms (`boolIcon` is read-only). */
  displayAs?: UiSettings['displayAs'] | 'switch';
};

export type PlatformMeshFieldDefinition = Omit<
  TableFieldDefinition,
  'uiSettings'
> &
  Omit<FormFieldDefinition, 'name' | 'label' | 'uiSettings'> & {
    label?: string;
    uiSettings?: PlatformMeshUiSettings;
    dynamicValuesDefinition?: {
      operation: string;
      gqlQuery: string;
      gqlQueryVariables?: Record<string, string>;
      value: string;
      key: string;
    };
  };

export const DOWNLOAD_KUBECONFIG_FROM_SECRET_REF_ACTION =
  'download-kubeconfig-from-secret-ref';

/**
 * `ButtonSettings` plus the extra data the kubeconfig download needs. Used
 * inside `UiView.actions[].uiSettings.buttonSettings`.
 */
export interface DownloadKubeconfigFromSecretRefButtonSettings extends ButtonSettings {
  action: typeof DOWNLOAD_KUBECONFIG_FROM_SECRET_REF_ACTION;
  /** Resource property holding the referenced Secret name. */
  resourceProperty: string;
  /** Secret `data` key to download; defaults to `kubeconfig`. */
  dataKey?: string;
  /** Download filename; defaults to `kubeconfig.yaml`. */
  filename?: string;
  /**
   * Resource property holding the Secret namespace; falls back to the
   * resource's own namespace, then the node context namespace.
   */
  namespaceProperty?: string;
}

export interface UiView {
  actions?: PlatformMeshFieldDefinition[];
  fields?: PlatformMeshFieldDefinition[];
  resourceDescription?: PlatformMeshFieldDefinition;
  resourceTitle?: PlatformMeshFieldDefinition;
  backgroundImageUrl?: string;
}

export interface UIDefinition {
  logoUrl?: string;
  listView?: ListView;
  createView?: UiView;
  detailView?: DetailView;
}

export interface ListView extends UiView {
  filters?: FieldFilterDefinition[];
}

export interface DetailView extends UiView {
  showDownloadKubeconfig?: boolean;
}
