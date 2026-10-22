import { resolveFormPlaceholders } from './resolve-form-placeholders';

describe('resolveFormPlaceholders', () => {
  it('replaces a simple {form.x} placeholder', () => {
    expect(resolveFormPlaceholders('{form.namespace}', { namespace: 'default' })).toBe('default');
  });

  it('replaces multiple placeholders in one string', () => {
    expect(
      resolveFormPlaceholders('{form.region}-{form.zone}', { region: 'eu-west', zone: 'a' }),
    ).toBe('eu-west-a');
  });

  it('replaces a repeated placeholder', () => {
    expect(
      resolveFormPlaceholders('{form.ns}/{form.ns}', { ns: 'default' }),
    ).toBe('default/default');
  });

  it('resolves a flat key that contains dots (e.g. metadata.namespace)', () => {
    expect(
      resolveFormPlaceholders('{form.metadata.namespace}', { 'metadata.namespace': 'my-ns' }),
    ).toBe('my-ns');
  });

  it('leaves the placeholder literal when the key is missing', () => {
    expect(
      resolveFormPlaceholders('{form.missing}', {}),
    ).toBe('{form.missing}');
  });

  it('leaves the placeholder literal when the value is null', () => {
    expect(
      resolveFormPlaceholders('{form.ns}', { ns: null }),
    ).toBe('{form.ns}');
  });

  it('leaves the placeholder literal when the value is undefined', () => {
    expect(
      resolveFormPlaceholders('{form.ns}', { ns: undefined }),
    ).toBe('{form.ns}');
  });

  it('leaves the placeholder literal when the value is an empty string', () => {
    // Empty string means "parent not yet selected" — leave literal so the
    // namespace-skip guard can fire.
    expect(
      resolveFormPlaceholders('{form.ns}', { ns: '' }),
    ).toBe('{form.ns}');
  });

  it('coerces 0 to "0" (not left literal)', () => {
    expect(resolveFormPlaceholders('{form.count}', { count: 0 })).toBe('0');
  });

  it('coerces false to "false" (not left literal)', () => {
    expect(resolveFormPlaceholders('{form.flag}', { flag: false })).toBe('false');
  });

  it('does not touch a {context.x} placeholder', () => {
    expect(
      resolveFormPlaceholders('{context.userId}', { userId: 'u1' }),
    ).toBe('{context.userId}');
  });

  it('returns "" when value is undefined', () => {
    expect(resolveFormPlaceholders(undefined, { ns: 'x' })).toBe('');
  });

  it('returns "" when value is not a string', () => {
    expect(resolveFormPlaceholders(42 as unknown as string, {})).toBe('');
    expect(resolveFormPlaceholders(null as unknown as string, {})).toBe('');
  });

  it('returns a string without placeholders unchanged', () => {
    expect(resolveFormPlaceholders('plain', {})).toBe('plain');
  });

  it('returns an empty string unchanged', () => {
    expect(resolveFormPlaceholders('', {})).toBe('');
  });
});
