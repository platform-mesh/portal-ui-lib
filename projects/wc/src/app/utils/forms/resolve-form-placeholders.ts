export const FORM_PLACEHOLDER_PATTERN = /\{form\.([^{}\s]+)\}/g;

/**
 * Replaces `{form.<name>}` placeholders in `value` with values from `form`.
 *
 *   "{form.metadata.namespace}"   → form["metadata.namespace"]  (flat-key lookup)
 *   "{form.spec.region}"          → form["spec.region"]
 *
 * Keys are always flat — they match the form control names as produced by
 * `toFormFields`/`buildInitialValues` (e.g. `"metadata.namespace"`, not a
 * nested path traversal).
 *
 * An exact placeholder preserves the value's type; interpolation into a
 * larger string converts it to text. Property names may include `-` and `/`.
 * If the resolved value is `undefined`, `null`, or an empty string the
 * original placeholder is left in place. This lets the namespace-skip guard
 * fire correctly when the parent field has no value yet.
 */
export function resolveFormPlaceholders(
  value: string | undefined,
  form: Record<string, unknown>,
): unknown {
  if (typeof value !== 'string') return '';

  const exactMatch = /^\{form\.([^{}\s]+)\}$/.exec(value);
  if (exactMatch) {
    const resolved = form[exactMatch[1]];
    return resolved == null || resolved === '' ? value : resolved;
  }

  return value.replace(FORM_PLACEHOLDER_PATTERN, (match, name: string) => {
    const resolved = form[name];
    return resolved == null || resolved === '' ? match : String(resolved);
  });
}
