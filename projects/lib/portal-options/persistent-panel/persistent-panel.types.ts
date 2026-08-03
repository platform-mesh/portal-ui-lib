import type { NodeContext } from '@openmfp/portal-ui-lib';

export const OPEN_PERSISTENT_PANEL_MESSAGE = 'portal.open-provider-panel';

export const PROVIDER_PANEL_MESSAGE = {
  close: 'portal.provider-panel.close',
  closeFailed: 'portal.provider-panel.close-failed',
  closed: 'portal.provider-panel.closed',
  context: 'portal.provider-panel.context',
  ready: 'portal.provider-panel.ready',
  requestClose: 'portal.provider-panel.request-close',
} as const;

export interface PersistentPanelConfig {
  id: string;
  title: string;
  url: string;
  origin: string;
}

export interface PersistentPanelTarget {
  organization?: string;
  organizationId?: string;
  account?: string;
  accountPath?: string;
  workspacePath?: string;
  namespace?: string;
  resource?: {
    group?: string;
    version?: string;
    kind?: string;
    name?: string;
  };
}

export interface RegisteredProviderNode {
  viewUrl?: string;
  context?: Partial<NodeContext> & {
    persistentPanel?: unknown;
  };
}

export function mergePersistentPanelTargets(
  current: PersistentPanelTarget,
  update: PersistentPanelTarget,
): PersistentPanelTarget {
  const organizationChanged =
    current.organization !== undefined &&
    update.organization !== undefined &&
    current.organization !== update.organization;
  const accountChanged =
    current.account !== undefined &&
    update.account !== undefined &&
    current.account !== update.account;

  if (organizationChanged || accountChanged) {
    return structuredClone(update);
  }

  // Provider nodes normally contain only panel capability metadata. Keep the
  // target tracked by navigation and overlay any bounded scope that the
  // requesting node does carry.
  return structuredClone({ ...current, ...update });
}

interface OpenPanelMessage extends Record<string, unknown> {
  id: string;
}

const panelIdPattern = /^[a-z0-9](?:[a-z0-9.-]{0,62}[a-z0-9])?$/;
const workspaceSegmentPattern = /^[a-z0-9](?:[-a-z0-9]{0,61}[a-z0-9])?$/;

export function parsePersistentPanelConfig(
  message: OpenPanelMessage,
  providerNode: RegisteredProviderNode | undefined,
  portalOrigin: string,
): PersistentPanelConfig {
  if (message.id !== OPEN_PERSISTENT_PANEL_MESSAGE) {
    throw new Error('Persistent panel request is invalid');
  }

  const capability = recordValue(providerNode?.context?.persistentPanel);
  const id = boundedString(capability['id'], 64);
  const title = boundedString(capability['title'], 80);
  if (!id || !panelIdPattern.test(id)) {
    throw new Error('Registered persistent panel id is invalid');
  }
  if (!title) {
    throw new Error('Registered persistent panel title is invalid');
  }

  const registeredViewUrl = boundedString(providerNode?.viewUrl, 2048);
  if (!registeredViewUrl) {
    throw new Error('Registered provider UI URL is missing');
  }

  const portalURL = new URL(portalOrigin);
  const url = new URL(registeredViewUrl, portalURL);
  if (
    url.origin === portalURL.origin ||
    !allowedPanelURL(url, portalURL) ||
    url.username ||
    url.password
  ) {
    throw new Error('Registered provider UI URL is invalid');
  }

  return { id, title, url: url.toString(), origin: url.origin };
}

function allowedPanelURL(url: URL, portalURL: URL): boolean {
  if (url.protocol === 'https:') {
    return true;
  }
  return (
    portalURL.protocol === 'http:' &&
    url.protocol === 'http:' &&
    ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
  );
}

export function persistentPanelTarget(
  globalContext: Record<string, unknown>,
  nodeContext?: NodeContext | Record<string, unknown>,
): PersistentPanelTarget {
  const context = { ...globalContext, ...(nodeContext ?? {}) };
  const entityContext = recordValue(context['entityContext']);
  const accountContext = recordValue(entityContext['account']);
  const resourceDefinition = recordValue(context['resourceDefinition']);

  const organization = boundedString(context['organization'], 253);
  const organizationId = boundedString(context['organizationId'], 512);
  const rawAccountPath = boundedString(context['accountPath'], 1024);
  const account =
    boundedString(accountContext['id'], 253) ||
    boundedString(context['accountId'], 253) ||
    boundedString(context['core_platform-mesh_io_accountId'], 253) ||
    accountFromPath(rawAccountPath, organization) ||
    accountFromEntity(context);

  // Organization-only scope is valid, but descendants without an account are
  // not. Organization context can carry a kcpPath, so fail closed before
  // projecting workspace fields.
  if (!account) {
    return compact({ organization, organizationId });
  }

  const accountPath = validatedAccountPath(
    rawAccountPath,
    organization,
    account,
  );

  const workspacePath =
    validatedWorkspacePath(context['workspacePath'], organization, account) ||
    validatedWorkspacePath(context['kcpPath'], organization, account) ||
    validatedWorkspacePath(rawAccountPath, organization, account) ||
    canonicalAccountPath(organization, account);
  const namespace =
    boundedString(context['namespaceId'], 253) ||
    boundedString(resourceDefinition['namespace'], 253);
  const resource = compact({
    group:
      boundedString(resourceDefinition['group'], 253) ||
      boundedString(resourceDefinition['apiGroup'], 253),
    version: boundedString(resourceDefinition['version'], 63),
    kind:
      boundedString(resourceDefinition['kind'], 253) ||
      boundedString(context['entityKind'], 253),
    name: boundedString(context['entityName'], 253),
  });

  return compact({
    organization,
    organizationId,
    account,
    accountPath,
    workspacePath,
    namespace,
    resource: Object.keys(resource).length > 0 ? resource : undefined,
  });
}

function accountFromPath(
  accountPath: string | undefined,
  organization: string | undefined,
): string | undefined {
  if (!accountPath) {
    return undefined;
  }
  if (workspaceSegmentPattern.test(accountPath)) {
    return accountPath;
  }
  const segments = accountPath.split(':');
  if (
    segments.length < 4 ||
    segments[0] !== 'root' ||
    segments[1] !== 'orgs' ||
    segments.some((segment) => !workspaceSegmentPattern.test(segment)) ||
    (organization !== undefined && segments[2] !== organization)
  ) {
    return undefined;
  }
  return boundedString(segments.at(-1), 253);
}

function accountFromEntity(
  context: Record<string, unknown>,
): string | undefined {
  if (boundedString(context['entityKind'], 253) !== 'Account') {
    return undefined;
  }
  return boundedString(context['entityName'], 253);
}

function canonicalWorkspacePath(
  accountPath: string | undefined,
): string | undefined {
  if (!accountPath?.startsWith('root:')) {
    return undefined;
  }
  const segments = accountPath.split(':');
  if (
    segments.length < 3 ||
    segments.some((segment) => !workspaceSegmentPattern.test(segment))
  ) {
    return undefined;
  }
  return accountPath;
}

function validatedWorkspacePath(
  value: unknown,
  organization: string | undefined,
  account: string | undefined,
): string | undefined {
  if (!organization || !account) {
    return undefined;
  }
  const path = canonicalWorkspacePath(boundedString(value, 1024));
  const segments = path?.split(':');
  if (
    !segments ||
    segments.length < 4 ||
    segments[0] !== 'root' ||
    segments[1] !== 'orgs' ||
    segments[2] !== organization ||
    segments.at(-1) !== account
  ) {
    return undefined;
  }
  return path;
}

function validatedAccountPath(
  value: string | undefined,
  organization: string | undefined,
  account: string,
): string | undefined {
  if (!value) {
    return undefined;
  }
  if (workspaceSegmentPattern.test(value)) {
    return value === account ? value : undefined;
  }
  return validatedWorkspacePath(value, organization, account);
}

function canonicalAccountPath(
  organization: string | undefined,
  account: string | undefined,
): string | undefined {
  if (
    !organization ||
    !account ||
    !workspaceSegmentPattern.test(organization) ||
    !workspaceSegmentPattern.test(account)
  ) {
    return undefined;
  }
  return `root:orgs:${organization}:${account}`;
}

function compact<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined),
  ) as T;
}

function boundedString(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > maxLength || trimmed.includes('\u0000')) {
    return undefined;
  }
  return trimmed;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function recordValue(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}
