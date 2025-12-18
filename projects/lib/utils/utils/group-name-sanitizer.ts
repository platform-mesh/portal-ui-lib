/**
 * Utility function to replace all occurrences of dots (.) and hyphens (-) with underscores (_)
 * @param input - The input string to process
 * @returns The processed string with dots and hyphens replaced by underscores
 */
export function replaceDotsAndHyphensWithUnderscores(input: string): string {
  if (!input) {
    return input;
  }

  return input.replace(/[.-]/g, '_');
}

export function capitalize(input: string): string {
  return input.charAt(0).toUpperCase() + input.slice(1);
}
