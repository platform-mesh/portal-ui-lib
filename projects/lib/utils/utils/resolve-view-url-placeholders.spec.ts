import { resolveViewUrlPlaceholders } from './resolve-view-url-placeholders';

describe('resolveViewUrlPlaceholders', () => {
  it('replaces context and node param placeholders', () => {
    expect(
      resolveViewUrlPlaceholders(
        'https://provider.example.test/panel?organization={context.organization}&account={context.accountId}&tab={nodeParams.tab}',
        {
          context: { organization: 'showroom', accountId: 'ig-1' },
          nodeParams: { tab: 'logs' },
        },
      ),
    ).toBe(
      'https://provider.example.test/panel?organization=showroom&account=ig-1&tab=logs',
    );
  });

  it('resolves nested context paths and keys with dashes', () => {
    expect(
      resolveViewUrlPlaceholders(
        '/panel/{context.entityContext.account.id}/{context.core_platform-mesh_io_accountId}',
        {
          context: {
            entityContext: { account: { id: 'ig-1' } },
            'core_platform-mesh_io_accountId': 'ig-2',
          },
        },
      ),
    ).toBe('/panel/ig-1/ig-2');
  });

  it('converts number and boolean values to strings', () => {
    expect(
      resolveViewUrlPlaceholders(
        '/panel?page={nodeParams.page}&on={context.on}',
        {
          context: { on: false },
          nodeParams: { page: 2 },
        },
      ),
    ).toBe('/panel?page=2&on=false');
  });

  it('returns the URL unchanged when it has no placeholders', () => {
    expect(
      resolveViewUrlPlaceholders('https://provider.example.test/panel', {}),
    ).toBe('https://provider.example.test/panel');
  });

  it('leaves other placeholder kinds untouched', () => {
    expect(
      resolveViewUrlPlaceholders('/panel/{i18n.currentLocale}', {
        context: { i18n: { currentLocale: 'en' } },
      }),
    ).toBe('/panel/{i18n.currentLocale}');
  });

  it.each([
    ['a missing value', '/panel?org={context.organization}', {}],
    [
      'an empty string',
      '/panel?org={context.organization}',
      { organization: ' ' },
    ],
    ['null', '/panel?org={context.organization}', { organization: null }],
    [
      'an object',
      '/panel?account={context.entityContext}',
      { entityContext: { id: 'ig-1' } },
    ],
    ['an inherited property', '/panel?x={context.toString}', {}],
    [
      'a missing nested value',
      '/panel?id={context.entityContext.account.id}',
      { entityContext: {} },
    ],
  ])('returns undefined for %s', (_case, viewUrl, context) => {
    expect(resolveViewUrlPlaceholders(viewUrl, { context })).toBeUndefined();
  });

  it('returns undefined when a node param is missing', () => {
    expect(
      resolveViewUrlPlaceholders('/panel?tab={nodeParams.tab}', {
        context: { tab: 'logs' },
      }),
    ).toBeUndefined();
  });
});
