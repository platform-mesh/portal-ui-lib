import {
  FormFieldDefinition,
  TableFieldDefinition,
  UiSettings as NgxUiSettings,
} from '@openmfp/ngx';

export type {
  ButtonSettings,
  CssRule,
  CssRuleCondition,
  GenericResource,
  ModalSettings,
  PropertyField,
  TransformType,
  ValueCellButtonClickEvent,
} from '@openmfp/ngx';

export interface TagSettings {
  design?: 'Neutral' | 'Positive' | 'Critical' | 'Negative' | 'Information' | 'Set1' | 'Set2';
  colorScheme?: string;
}

export type UiSettings = NgxUiSettings & {
  tagSettings?: TagSettings;
};

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
