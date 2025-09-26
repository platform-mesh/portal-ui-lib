export function stripTypename<T>(value: T): T {
  if (Array.isArray(value)) {
    return (value as unknown as any[]).map((v) => stripTypename(v)) as T;
  }
  if (value && typeof value === 'object') {
    const { __typename, ...rest } = value as Record<string, unknown> & {
      __typename?: string;
    };
    for (const k of Object.keys(rest)) {
      // @ts-ignore - rest is an indexable object
      rest[k] = stripTypename((rest as any)[k]);
    }
    return rest as T;
  }
  return value;
}
