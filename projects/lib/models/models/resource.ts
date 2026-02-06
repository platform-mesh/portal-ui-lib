import { Condition, ObjectMeta } from 'kubernetes-types/meta/v1';

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
  labelDisplay?: boolean;
  displayAs?: 'secret' | 'boolIcon' | 'link' | 'tooltip';
  tooltipIcon?: string;
  withCopyButton?: boolean;
  cssCustomization?: Partial<CSSStyleDeclaration>;
  cssRules?: CssRule[];
}

export type CssRuleCondition =
  | 'equals'
  | 'notEquals'
  | 'greaterThan'
  | 'greaterThanOrEqual'
  | 'lessThan'
  | 'lessThanOrEqual'
  | 'contains';

export interface CssRule {
  if: { condition: CssRuleCondition; value: string };
  styles: Partial<CSSStyleDeclaration>;
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

export interface ResourceMeta extends ObjectMeta {
  name: string;
}

export interface Resource extends Record<string, any> {
  metadata: ResourceMeta;
  spec?: ResourceSpec;
  status?: ResourceStatus;
  __typename?: string;
  ready?: boolean;
  data?: Record<string, any>;
}

export interface ResourceDefinition {
  group?: string;
  version: string;
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
  resourceImageProperty?: string;
  listView?: UiView;
  createView?: UiView;
  detailView?: DetailView;
}

export interface DetailView extends UiView {
  showDownloadKubeconfig?: boolean;
}

export const ResourceOperationTypeMap = {
  ADDED: 'ADDED',
  MODIFIED: 'MODIFIED',
  DELETED: 'DELETED',
} as const;

export type ResourceOperationType =
  (typeof ResourceOperationTypeMap)[keyof typeof ResourceOperationTypeMap];

export interface ResourceSubscriptionResult {
  type: ResourceOperationType;
  object: Resource;
}

export interface ResourcePagination {
  limit: number | undefined;
  continue: string | undefined;
}

export interface ResourceListResult {
  resourceVersion: string;
  items: Resource[];
  continue: string | undefined;
  remainingItemCount?: number;
}

export type KubernetesScope = 'Cluster' | 'Namespaced';
