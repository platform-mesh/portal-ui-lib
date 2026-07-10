export enum ResourceFieldNames {
  MetadataName = 'metadata.name',
  SpecType = 'spec.type',
  MetadataNamespace = 'metadata.namespace',
}

export const K8S_NAME_RE = /^[a-z]([a-z0-9-]{0,61}[a-z0-9])?$/;
export const K8S_NAME_ERROR = 'Invalid resource name accrording to RFC 1035';
