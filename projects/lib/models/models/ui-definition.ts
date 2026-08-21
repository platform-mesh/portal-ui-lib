import {
  ButtonSettings,
  FieldFilterDefinition,
  FormFieldDefinition,
  TableFieldDefinition,
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

export interface DownloadKubeconfigFromSecretRefAction {
  type: 'downloadKubeconfigFromSecretRef';
  nameProperty: string;
  namespaceProperty?: string;
  dataKey?: string;
  filename?: string;
  button?: Omit<ButtonSettings, 'action'>;
}

export type UiAction =
  DownloadKubeconfigFromSecretRefAction | PlatformMeshFieldDefinition;

export interface UiView {
  actions?: UiAction[];
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
