
export function buildResourcePath(input: {
  group?: string | undefined;
  kind: string;
  version?: string | undefined;
}, separator: string = '_'): string {
  return [input.group, input.version, input.kind]
    .filter((p): p is string => !!p)
    .join(separator);
}
