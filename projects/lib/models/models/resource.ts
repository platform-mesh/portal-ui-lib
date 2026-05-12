import { UIDefinition } from './ui-definition';
import { FieldDefinition, GenericResource } from '@openmfp/ngx';
import { Condition, ObjectMeta } from 'kubernetes-types/meta/v1';

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

export interface Resource extends GenericResource {
  metadata: ResourceMeta;
  spec?: ResourceSpec;
  status?: ResourceStatus;
  __typename?: string;
  data?: Record<string, any>;
  ready?: boolean;
  isAvailable?: boolean;
  accessibleName?: string;
}

export interface ResourceDefinition {
  apiGroup?: string;
  version: string;
  entityCollection: string;
  entity: string;
  name?: string;
  scope?: KubernetesScope;
  namespace?: string;
  readyCondition?: FieldDefinition;
  ui?: UIDefinition;
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
