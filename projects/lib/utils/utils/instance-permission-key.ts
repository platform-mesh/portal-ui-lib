import { InstancePermission } from '@platform-mesh/portal-ui-lib/models';

export const permissionKey = (
  instance: Omit<InstancePermission, 'actions'>,
): string =>
  [instance.resource, instance.namespace, instance.name]
    .filter(Boolean)
    .join('/');
