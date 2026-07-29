import {
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
  deletable?: boolean;
}

export interface DetailView extends UiView {
  showDownloadKubeconfig?: boolean;
}
