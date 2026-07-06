import { resolveContextPlaceholders } from './resolve-context-placeholders';

describe('resolveContextPlaceholders', () => {
  it('replaces a simple top-level placeholder', () => {
    expect(
      resolveContextPlaceholders('{context.userId}', { userId: 'u1' }),
    ).toBe('u1');
  });

  it('replaces multiple placeholders in one string', () => {
    expect(
      resolveContextPlaceholders(
        '/users/{context.userId}/orgs/{context.orgId}',
        { userId: 'u1', orgId: 'o2' },
      ),
    ).toBe('/users/u1/orgs/o2');
  });

  it('resolves nested dot paths', () => {
    expect(
      resolveContextPlaceholders('{context.user.email}', {
        user: { email: 'a@b.c' },
      }),
    ).toBe('a@b.c');
  });

  it('coerces non-string resolved values to strings', () => {
    // Numbers, booleans, and other primitives are passed through String().
    expect(
      resolveContextPlaceholders('n={context.count}', { count: 42 }),
    ).toBe('n=42');
    expect(
      resolveContextPlaceholders('b={context.flag}', { flag: false }),
    ).toBe('b=false');
  });

  it('treats 0 and false as resolved (not left literal)', () => {
    // Guards the `resolved == null` check: only null/undefined are considered missing.
    expect(resolveContextPlaceholders('{context.n}', { n: 0 })).toBe('0');
    expect(resolveContextPlaceholders('{context.f}', { f: false })).toBe(
      'false',
    );
  });

  it('leaves the placeholder literal when the value resolves to undefined', () => {
    expect(
      resolveContextPlaceholders('hi {context.missing}!', {}),
    ).toBe('hi {context.missing}!');
  });

  it('leaves the placeholder literal when the value resolves to null', () => {
    expect(
      resolveContextPlaceholders('{context.userId}', { userId: null }),
    ).toBe('{context.userId}');
  });

  it('leaves the placeholder literal when an intermediate path segment is missing', () => {
    // `user` is absent → nested reduce short-circuits to undefined.
    expect(
      resolveContextPlaceholders('{context.user.email}', {}),
    ).toBe('{context.user.email}');
  });

  it('leaves the placeholder literal when an intermediate path segment is null', () => {
    // Guards the `acc == null ? acc : acc[key]` short-circuit in the reducer.
    expect(
      resolveContextPlaceholders('{context.user.email}', { user: null }),
    ).toBe('{context.user.email}');
  });

  it('returns strings without placeholders unchanged', () => {
    expect(resolveContextPlaceholders('plain', { userId: 'u1' })).toBe(
      'plain',
    );
  });

  it('returns an empty string unchanged', () => {
    expect(resolveContextPlaceholders('', { userId: 'u1' })).toBe('');
  });

  it('replaces every occurrence of the same placeholder', () => {
    expect(
      resolveContextPlaceholders('{context.id}-{context.id}', { id: 'x' }),
    ).toBe('x-x');
  });

  it('does not touch text that only resembles a placeholder', () => {
    // Missing the `context.` prefix — not a placeholder.
    expect(
      resolveContextPlaceholders('{userId}', { userId: 'u1' }),
    ).toBe('{userId}');
    // Placeholder with trailing dot is not matched by [\w.]+ ending pattern...
    // actually [\w.]+ does allow trailing dots — assert current behavior: the
    // path becomes "userId." and the reducer walks into an undefined "" key,
    // so the value resolves to undefined and the placeholder is left literal.
    expect(
      resolveContextPlaceholders('{context.userId.}', { userId: 'u1' }),
    ).toBe('{context.userId.}');
  });

  it('does not match keys containing characters outside [\\w.]', () => {
    // The regex only accepts word chars and dots inside the path. A hyphen
    // breaks the match so the placeholder is left literal, even if `ctx`
    // has that exact key.
    expect(
      resolveContextPlaceholders('{context.user-id}', { 'user-id': 'u1' }),
    ).toBe('{context.user-id}');
  });

  it('returns "" when value is undefined', () => {
    expect(resolveContextPlaceholders(undefined, { userId: 'u1' })).toBe('');
  });

  it('returns "" when value is not a string (defensive typing guard)', () => {
    // The signature is `string | undefined`, but the runtime guard checks
    // typeof === 'string' — assert the defensive branch.
    expect(
      resolveContextPlaceholders(123 as unknown as string, { userId: 'u1' }),
    ).toBe('');
    expect(
      resolveContextPlaceholders(null as unknown as string, { userId: 'u1' }),
    ).toBe('');
  });
});
