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

export type PlatformMeshFieldDefinition = TableFieldDefinition &
  Omit<FormFieldDefinition, 'name' | 'label'> & {
    label?: string;
    dynamicValuesDefinition?: {
      operation: string;
      gqlQuery: string;
      gqlQueryVariables?: Record<string, string>;
      value: string;
      key: string;
    };
  };

export const DOWNLOAD_KUBECONFIG_FROM_SECRET_REF_ACTION =
  'downloadKubeconfigFromSecretRef';

export interface DownloadKubeconfigFromSecretRefButtonSettings extends ButtonSettings {
  action: typeof DOWNLOAD_KUBECONFIG_FROM_SECRET_REF_ACTION;
  dataKey?: string;
  filename?: string;
  namespaceProperty?: string;
}

type DetailViewActionUiSettings<T extends ButtonSettings> = Omit<
  UiSettings,
  'buttonSettings' | 'displayAs'
> & {
  displayAs?: 'button';
  buttonSettings: T;
};

export type GenericActionButtonSettings = Omit<ButtonSettings, 'action'> & {
  action: 'navigate' | 'openInModal';
};

type GenericActionTarget =
  | {
      value: string;
      property?: string;
      jsonPathExpression?: string;
    }
  | {
      value?: string;
      property: string;
      jsonPathExpression?: string;
    }
  | {
      value?: string;
      property: string[];
      jsonPathExpression: string;
    };

export type GenericAction = Omit<
  PlatformMeshFieldDefinition,
  | 'uiSettings'
  | 'value'
  | 'property'
  | 'jsonPathExpression'
  | 'propertyCollection'
> &
  GenericActionTarget & {
    propertyCollection?: never;
    uiSettings: DetailViewActionUiSettings<GenericActionButtonSettings>;
  };

export type DownloadKubeconfigFromSecretRefAction = Omit<
  PlatformMeshFieldDefinition,
  'property' | 'propertyCollection' | 'uiSettings'
> & {
  /** JSON path to the referenced Secret name. */
  property: string;
  propertyCollection?: never;
  uiSettings: DetailViewActionUiSettings<DownloadKubeconfigFromSecretRefButtonSettings>;
};

export type UiAction = DownloadKubeconfigFromSecretRefAction | GenericAction;

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
