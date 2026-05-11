function sanitizeGroup(group: string): string {
  let sanitized = group.replace(/[^a-zA-Z0-9]/g, '_');
  if (/^[0-9]/.test(sanitized)) {
    sanitized = '_' + sanitized;
  }
  return sanitized;
}

function pascalize(snakeCase: string): string {
  return snakeCase
    .split('_')
    .filter((segment) => segment.length > 0)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join('');
}

export function buildGraphQLInputTypeName(
  apiGroup: string | undefined,
  version: string | undefined,
  entity: string,
): string {
  let prefix: string;

  if (apiGroup && version) {
    prefix = pascalize(sanitizeGroup(apiGroup) + '_' + version);
  } else if (apiGroup) {
    prefix = pascalize(sanitizeGroup(apiGroup));
  } else if (version) {
    prefix = pascalize('_' + version);
  } else {
    return `${entity}_Input`;
  }

  return `${prefix}${entity}_Input`;
}
