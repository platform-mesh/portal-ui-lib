import { ResourceFieldNames } from '../../components/generic-ui/create-resource-modal/create-resource-modal.consts';
import { PlatformMeshFieldDefinition } from '@platform-mesh/portal-ui-lib/models';

export function isImmutableOnEdit(field: PlatformMeshFieldDefinition): boolean {
  return (
    field.property === ResourceFieldNames.MetadataName ||
    field.property === ResourceFieldNames.SpecAlias ||
    field.property === ResourceFieldNames.SpecType ||
    field.property === ResourceFieldNames.MetadataNamespace
  );
}
