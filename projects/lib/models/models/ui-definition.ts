import { FormFieldDefinition, Scope, TableFieldDefinition } from '@openmfp/ngx';

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

export type FieldDefinition = TableFieldDefinition &
  Omit<FormFieldDefinition, 'name'> & {
    dynamicValuesDefinition?: {
      operation: string;
      gqlQuery: string;
      value: string;
      key: string;
    };
  };

export interface UiView {
  actions?: FieldDefinition[];
  fields?: FieldDefinition[];
  resourceDescription?: FieldDefinition;
  resourceTitle?: FieldDefinition;
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

export interface FieldFilterDefinition extends Scope {
  default?: boolean;
}

export interface DetailView extends UiView {
  showDownloadKubeconfig?: boolean;
}
