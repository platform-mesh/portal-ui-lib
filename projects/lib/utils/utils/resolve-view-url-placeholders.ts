export interface ViewUrlPlaceholderSources {
  context?: Record<string, unknown>;
  nodeParams?: Record<string, unknown>;
}

const viewUrlPlaceholderPattern = /\{(context|nodeParams)\.([^{}]+)\}/g;

export const resolveViewUrlPlaceholders = (
  viewUrl: string,
  sources: ViewUrlPlaceholderSources,
): string | undefined => {
  let unresolved = false;
  const resolved = viewUrl.replace(
    viewUrlPlaceholderPattern,
    (placeholder, source: keyof ViewUrlPlaceholderSources, path: string) => {
      const value = path
        .trim()
        .split('.')
        .reduce<unknown>(
          (current, key) =>
            typeof current === 'object' &&
            current !== null &&
            Object.hasOwn(current, key)
              ? (current as Record<string, unknown>)[key]
              : undefined,
          sources[source],
        );
      if (
        (typeof value === 'string' && value.trim() !== '') ||
        typeof value === 'number' ||
        typeof value === 'boolean'
      ) {
        return String(value);
      }
      unresolved = true;
      return placeholder;
    },
  );
  return unresolved ? undefined : resolved;
};
