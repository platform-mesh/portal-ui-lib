/**
 * Replaces `{context.<dot.path>}` placeholders in `value` with values from `ctx`.
 *
 *   "{context.userId}"                                → ctx.userId
 *   "/users/{context.userId}/orgs/{context.orgId}"    → "/users/u1/orgs/o2"
 *   "{context.user.email}"                            → ctx.user.email  (nested)
 *
 * If the resolved value is `undefined` or `null`, the original placeholder is left
 * in place (so it's visible in the UI rather than silently becoming "undefined").
 */
export function resolveContextPlaceholders(
  value: string | undefined,
  ctx: Record<string, any>,
): string {
  if (typeof value !== 'string') return '';

  return value.replace(/\{context\.([\w.]+)\}/g, (match, path: string) => {
    const resolved = path
      .split('.')
      .reduce<any>((acc, key) => (acc == null ? acc : acc[key]), ctx);
    return resolved == null ? match : String(resolved);
  });
}
