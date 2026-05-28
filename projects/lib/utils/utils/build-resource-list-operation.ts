export function buildResourcePath(
  input: {
    apiGroup?: string | undefined;
    entity: string;
    version?: string | undefined;
  },
  separator: string = '_',
): string {
  return [input.apiGroup, input.version, input.entity]
    .filter((p): p is string => !!p)
    .join(separator);
}
