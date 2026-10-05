import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export interface MockResponse {
  status: number;
  contentType?: string;
  body: unknown;
}

export type MockVariables = Record<string, string>;

const placeholderPattern = /\{\{(\w+)\}\}/g;

export function loadMockResponse(
  mockFile: string,
  variables: MockVariables = {},
): MockResponse {
  const template = readFileSync(resolve(import.meta.dirname, mockFile), 'utf8');
  const resolved = template.replace(placeholderPattern, (_, name: string) => {
    if (!(name in variables)) {
      throw new Error(`Mock "${mockFile}" needs the variable "${name}"`);
    }
    return variables[name];
  });

  return JSON.parse(resolved) as MockResponse;
}
