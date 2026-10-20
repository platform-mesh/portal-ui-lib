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
 * Replaces both `{resource.<dot.path>}` (from `resource`) and `{context.<dot.path>}`
 * (from `ctx`) placeholders in `value`, so a single string can mix the two:
 *
 *   "/workspaces/{context.org}/components/{resource.metadata.name}"
 *
 * Unresolved placeholders of either kind are left literal.
 */
export function resolveAllPlaceholders(
  value: string | undefined,
  resource: Record<string, any>,
  ctx: Record<string, any>,
): string {
  return resolvePlaceholders(
    resolvePlaceholders(value, 'resource', resource),
    'context',
    ctx,
  );
}
