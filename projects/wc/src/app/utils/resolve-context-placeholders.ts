/**
 * Replaces `{<prefix>.<dot.path>}` placeholders in `value` with values from `source`.
 *
 * If the resolved value is `undefined` or `null`, the original placeholder is left
 * in place (so it's visible in the UI rather than silently becoming "undefined").
 */
function resolvePlaceholders(
  value: string | undefined,
  prefix: string,
  source: Record<string, any>,
): string {
  if (typeof value !== 'string') return '';

  const re = new RegExp(`\\{${prefix}\\.([\\w.]+)\\}`, 'g');
  return value.replace(re, (match, path: string) => {
    const resolved = path
      .split('.')
      .reduce<any>((acc, key) => (acc == null ? acc : acc[key]), source);
    return resolved == null ? match : String(resolved);
  });
}

/**
 * Replaces `{context.<dot.path>}` placeholders in `value` with values from `ctx`.
 *
 *   "{context.userId}"                                → ctx.userId
 *   "/users/{context.userId}/orgs/{context.orgId}"    → "/users/u1/orgs/o2"
 *   "{context.user.email}"                            → ctx.user.email  (nested)
 */
export function resolveContextPlaceholders(
  value: string | undefined,
  ctx: Record<string, any>,
): string {
  return resolvePlaceholders(value, 'context', ctx);
}

/**
 * Replaces `{resource.<dot.path>}` placeholders in `value` with values from `resource`.
 *
 *   "{resource.metadata.name}"                                   → resource.metadata.name
 *   "/workspaces/{resource.accountName}/components/{resource.metadata.name}"
 */
export function resolveResourcePlaceholders(
  value: string | undefined,
  resource: Record<string, any>,
): string {
  return resolvePlaceholders(value, 'resource', resource);
}
