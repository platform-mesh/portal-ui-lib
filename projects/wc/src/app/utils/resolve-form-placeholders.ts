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
 * If the resolved value is `undefined`, `null`, or an empty string the
 * original placeholder is left in place. This lets the namespace-skip guard
 * fire correctly when the parent field has no value yet.
 */
export function resolveFormPlaceholders(
  value: string | undefined,
  form: Record<string, unknown>,
): string {
  if (typeof value !== 'string') return '';

  return value.replace(/\{form\.([\w.]+)\}/g, (match, name: string) => {
    const resolved = form[name];
    return resolved == null || resolved === '' ? match : String(resolved);
  });
}
