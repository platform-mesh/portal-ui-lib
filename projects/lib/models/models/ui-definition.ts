import { FormFieldDefinition, TableFieldDefinition } from '@openmfp/ngx';

export type {
  ButtonSettings,
  CssRule,
  CssRuleCondition,
  GenericResource,
  ModalSettings,
  PropertyField,
  TransformType,
  UiSettings,
  ValueCellButtonClickEvent,
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
}

export interface UIDefinition {
  logoUrl?: string;
  listView?: UiView;
  createView?: UiView;
  detailView?: DetailView;
}

export interface DetailView extends UiView {
  showDownloadKubeconfig?: boolean;
}
