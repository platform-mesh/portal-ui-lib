export function deletePropertyByPath<T extends Record<string, unknown>>(
  object: T,
  path: string,
): T {
  const segments = path.split('.').filter(Boolean);
  if (segments.length === 0) {
    return object;
  }

  let current: Record<string, unknown> = object;

  for (let i = 0; i < segments.length - 1; i += 1) {
    const key = segments[i];
    const next = current[key];
    if (next == null || typeof next !== 'object') {
      return object;
    }
    current = next as Record<string, unknown>;
  }

  delete current[segments[segments.length - 1]];
  return object;
}
