
export function buildResourcePath(input: {
  group: string;
  plural: string;
  version?: string | undefined;
}, separator: string = '_'): string {
  return [input.group, input.version, input.plural]
    .filter((p): p is string => !!p)
    .join(separator);
}
