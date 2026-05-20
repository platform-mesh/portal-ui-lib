export const calculateDashboardConfigKey = (
  workspacePath: string,
  entity: string | undefined,
  resourceId: string,
  userId: string,
): string =>
  `pm.workspace:${workspacePath}.resourceType:${entity}.resourceId:${resourceId}.user:${userId}`;
