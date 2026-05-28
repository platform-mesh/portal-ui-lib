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
