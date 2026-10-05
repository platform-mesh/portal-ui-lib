import type { Request } from '@playwright/test';

export type GatewayOperation =
  | 'accountsList'
  | 'accountsWatch'
  | 'accountInfoRead'
  | 'accountRead'
  | 'logicalClusterRead';

export interface GatewayRequest {
  operation: GatewayOperation | undefined;
  workspacePath: string;
  accountName: string | undefined;
}

const gatewayPathPattern =
  /^\/api\/kubernetes-graphql-gateway\/(?<workspacePath>[^/]+)\/graphql$/;

const organizationWorkspaceDepth = 'root:orgs:<org>'.split(':').length;

const operationSignatures: [GatewayOperation, RegExp][] = [
  ['accountsWatch', /\bcore_platform_mesh_io_v1alpha1_accounts\(/],
  ['accountsList', /\bAccounts\(/],
  ['accountInfoRead', /\bAccountInfo\(/],
  ['accountRead', /\bAccount\(/],
  ['logicalClusterRead', /\bLogicalCluster\(/],
];

export function isGatewayPath(pathname: string): boolean {
  return gatewayPathPattern.test(pathname);
}

export function parseGatewayRequest(request: Request): GatewayRequest {
  const { pathname } = new URL(request.url());
  const workspacePath =
    decodeURIComponent(pathname).match(gatewayPathPattern)?.groups
      ?.workspacePath ?? '';
  const { query = '', variables = {} } = (request.postDataJSON() ?? {}) as {
    query?: string;
    variables?: Record<string, unknown>;
  };
  const operation = operationSignatures.find(([, signature]) =>
    signature.test(query),
  )?.[0];

  return {
    operation,
    workspacePath,
    accountName:
      operation === 'accountRead'
        ? String(variables['name'])
        : accountNameFromWorkspacePath(workspacePath),
  };
}

function accountNameFromWorkspacePath(
  workspacePath: string,
): string | undefined {
  const accountSegments = workspacePath
    .split(':')
    .slice(organizationWorkspaceDepth);
  return accountSegments.length > 0 ? accountSegments.join(':') : undefined;
}
