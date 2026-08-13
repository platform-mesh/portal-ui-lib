/**
 * Tier-1 resource-level permission check (fail-open).
 *
 * Returns true when the verb is granted for the resource, OR when no
 * permissions were fetched for the resource at all (no entry in
 * portalPermissions → we don't gate). Returns false ONLY when permissions
 * WERE fetched for the resource and the verb is absent.
 */
export const resourceActionAllowed = (
  portalPermissions: { [key: string]: string[] } | undefined,
  resource: string | undefined,
  verb: string,
): boolean => portalPermissions?.[resource ?? '']?.includes(verb) ?? true;
