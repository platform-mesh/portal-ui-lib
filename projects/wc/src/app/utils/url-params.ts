export const addSearchParams = (params: Record<string, string | undefined>) => {
  const newUrl = new URL(location.href || 'http://localhost/');
  const currentParams = newUrl.searchParams;

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined) {
      currentParams.delete(key);
      return;
    }

    currentParams.set(key, value);
  });

  history.replaceState(null, '', newUrl);
};

export const readUrlSearchParam = (key: string): string | undefined => {
  if (typeof location === 'undefined') return undefined;
  return new URL(location.href).searchParams.get(key) ?? undefined;
};

/**
 * Re~Foves search params from the URL. When `keys` is provided, only those keys
 * are removed; when omitted, all search params are cleared. Uses
 * `history.replaceState` so the navigation stack is not affected.
 */
export const clearSearchParams = (keys?: string[]) => {
  const newUrl = new URL(location.href || 'http://localhost/');

  const keysToRemove =
    keys ??
    (() => {
      const existing: string[] = [];
      newUrl.searchParams.forEach((_value, key) => existing.push(key));
      return existing;
    })();

  keysToRemove.forEach((key) => newUrl.searchParams.delete(key));

  history.replaceState(null, '', newUrl);
};

export const snapshotUrl = (): Record<string, string> => {
  if (typeof location === 'undefined') return {};
  const out: Record<string, string> = {};
  new URL(location.href).searchParams.forEach((value, key) => {
    out[key] = value;
  });
  return out;
};
