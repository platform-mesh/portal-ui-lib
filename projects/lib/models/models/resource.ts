import { Condition, ObjectMeta } from 'kubernetes-types/meta/v1';


export interface LabelDisplay {
  backgroundColor?: string;
  color?: string;
  fontWeight?: string;
  fontStyle?: string;
  textDecoration?: string;
  textTransform?: string;
}

export type TransformType =
  | 'uppercase'
  | 'lowercase'
  | 'capitalize'
  | 'decode'
  | 'encode';

export interface PropertyField {
  key: string;
  transform?: TransformType[];
}

export interface UiSettings {
  labelDisplay?: LabelDisplay | boolean;
  displayAs?: 'secret' | 'boolIcon' | 'link';
  withCopyButton?: boolean;
}

export interface FieldDefinition {
  label?: string;
  property: string | string[];
  propertyField?: PropertyField;
  jsonPathExpression?: string;
  required?: boolean;
  values?: string[];
  group?: {
    name: string;
    label?: string;
    delimiter?: string;
    multiline?: boolean;
  };
  uiSettings?: UiSettings;
  dynamicValuesDefinition?: {
    operation: string;
    gqlQuery: string;
    value: string;
    key: string;
  };
}

export interface ResourceStatus {
  conditions: Condition[];
}

export interface ResourceSpec extends Record<string, any> {
  type: string;
  description?: string;
  displayName?: string;
}

export interface AccountInfo {
  metadata: ObjectMeta;
  spec: {
    clusterInfo: { ca: string };
    organization: { originClusterId: string };
  };
}

export interface Resource extends Record<string, any> {
  metadata: ObjectMeta;
  spec?: ResourceSpec;
  status?: ResourceStatus;
  __typename?: string;
  ready?: boolean;
  data?: Record<string, any>;
}

export interface ResourceDefinition {
  group: string;
  plural: string;
  singular: string;
  kind: string;
  scope?: KubernetesScope;
  namespace?: string;
  readyCondition?: {
    jsonPathExpression: string;
    property: string | string[];
  };
  ui?: UIDefinition;
}

interface UiView {
  fields: FieldDefinition[];
}

export interface UIDefinition {
  logoUrl?: string;
  listView?: UiView;
  createView?: UiView;
  detailView?: UiView;
}

export type KubernetesScope = 'Cluster' | 'Namespaced';