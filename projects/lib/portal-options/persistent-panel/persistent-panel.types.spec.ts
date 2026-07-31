import {
  OPEN_PERSISTENT_PANEL_MESSAGE,
  mergePersistentPanelTargets,
  parsePersistentPanelConfig,
  persistentPanelTarget,
} from './persistent-panel.types';

const trustedNode = (viewUrl: string) => ({
  viewUrl,
  context: {
    persistentPanel: { id: 'provider.tools', title: 'Provider tools' },
  },
});

describe('persistent provider panel contract', () => {
  it('derives the iframe URL and exact origin from the registered provider UI', () => {
    expect(
      parsePersistentPanelConfig(
        {
          id: OPEN_PERSISTENT_PANEL_MESSAGE,
          panel: {
            id: 'provider.tools',
            title: 'Provider tools',
            url: 'https://attacker.example/panel',
          },
        },
        trustedNode('https://provider.example.test/panel?mode=embedded'),
        'https://portal.example.test',
      ),
    ).toEqual({
      id: 'provider.tools',
      title: 'Provider tools',
      url: 'https://provider.example.test/panel?mode=embedded',
      origin: 'https://provider.example.test',
    });
  });

  it('rejects a registered same-origin provider UI URL', () => {
    expect(() =>
      parsePersistentPanelConfig(
        { id: OPEN_PERSISTENT_PANEL_MESSAGE },
        trustedNode('/provider/panel'),
        'https://portal.example.test',
      ),
    ).toThrow(/registered provider UI URL is invalid/i);
  });

  it('rejects a wrong message id', () => {
    expect(() =>
      parsePersistentPanelConfig(
        { id: 'wrong.message' },
        trustedNode('https://provider.example.test/panel'),
        'https://portal.example.test',
      ),
    ).toThrow(/request is invalid/i);
  });

  it('rejects missing or invalid registered capability metadata', () => {
    expect(() =>
      parsePersistentPanelConfig(
        { id: OPEN_PERSISTENT_PANEL_MESSAGE },
        undefined,
        'https://portal.example.test',
      ),
    ).toThrow(/registered persistent panel id/i);
    expect(() =>
      parsePersistentPanelConfig(
        { id: OPEN_PERSISTENT_PANEL_MESSAGE },
        {
          viewUrl: 'https://provider.example.test/panel',
          context: {
            persistentPanel: { id: '../provider', title: 'Provider tools' },
          },
        },
        'https://portal.example.test',
      ),
    ).toThrow(/registered persistent panel id/i);
    expect(() =>
      parsePersistentPanelConfig(
        { id: OPEN_PERSISTENT_PANEL_MESSAGE },
        {
          viewUrl: 'https://provider.example.test/panel',
          context: { persistentPanel: { id: 'provider.tools', title: '' } },
        },
        'https://portal.example.test',
      ),
    ).toThrow(/registered persistent panel title/i);
  });

  it('rejects a missing or unsafe registered provider UI URL', () => {
    expect(() =>
      parsePersistentPanelConfig(
        { id: OPEN_PERSISTENT_PANEL_MESSAGE },
        {
          context: {
            persistentPanel: { id: 'provider.tools', title: 'Provider tools' },
          },
        },
        'https://portal.example.test',
      ),
    ).toThrow(/registered provider UI URL is missing/i);
    expect(() =>
      parsePersistentPanelConfig(
        { id: OPEN_PERSISTENT_PANEL_MESSAGE },
        trustedNode('javascript:alert(1)'),
        'https://portal.example.test',
      ),
    ).toThrow(/registered provider UI URL is invalid/i);
    expect(() =>
      parsePersistentPanelConfig(
        { id: OPEN_PERSISTENT_PANEL_MESSAGE },
        trustedNode('https://user:password@provider.example.test/panel'),
        'https://portal.example.test',
      ),
    ).toThrow(/registered provider UI URL is invalid/i);
    expect(() =>
      parsePersistentPanelConfig(
        { id: OPEN_PERSISTENT_PANEL_MESSAGE },
        trustedNode('http://provider.example.test/panel'),
        'https://portal.example.test',
      ),
    ).toThrow(/registered provider UI URL is invalid/i);
  });

  it('derives identity only from trusted node metadata', () => {
    expect(
      parsePersistentPanelConfig(
        {
          id: OPEN_PERSISTENT_PANEL_MESSAGE,
          panel: { id: 'attacker.panel', title: 'Impersonated UI' },
        },
        trustedNode('https://provider.example.test/panel'),
        'https://portal.example.test',
      ),
    ).toMatchObject({ id: 'provider.tools', title: 'Provider tools' });
  });

  it('allows HTTP loopback only from an HTTP development Portal', () => {
    expect(
      parsePersistentPanelConfig(
        { id: OPEN_PERSISTENT_PANEL_MESSAGE },
        trustedNode('http://127.0.0.1:8080/panel'),
        'http://localhost:4200',
      ),
    ).toMatchObject({ origin: 'http://127.0.0.1:8080' });
    expect(() =>
      parsePersistentPanelConfig(
        { id: OPEN_PERSISTENT_PANEL_MESSAGE },
        trustedNode('http://127.0.0.1:8080/panel'),
        'https://portal.example.test',
      ),
    ).toThrow(/registered provider UI URL is invalid/i);
  });

  it('projects only bounded account and workspace fields and never credentials', () => {
    const target = persistentPanelTarget(
      {
        organization: 'org-a',
        token: 'must-not-leak',
        portalContext: { crdGatewayApiUrl: 'must-not-leak' },
      },
      {
        portalContext: {},
        entityId: 'parent/default',
        accountId: 'team-a',
        userId: 'must-not-leak',
        userEmail: 'must-not-leak',
        token: 'must-not-leak',
        portalBaseUrl: 'must-not-leak',
        accountPath: 'root:orgs:org-a:team-a',
        kcpPath: 'root:orgs:org-a:team-a',
        namespaceId: 'apps',
        entityName: 'example',
        entityKind: 'Database',
        resourceDefinition: {
          group: 'database.example.io',
          version: 'v1alpha1',
          kind: 'Database',
        },
      },
    );

    expect(target).toEqual({
      organization: 'org-a',
      account: 'team-a',
      accountPath: 'root:orgs:org-a:team-a',
      workspacePath: 'root:orgs:org-a:team-a',
      namespace: 'apps',
      resource: {
        group: 'database.example.io',
        version: 'v1alpha1',
        kind: 'Database',
        name: 'example',
      },
    });
    expect(JSON.stringify(target)).not.toMatch(
      /must-not-leak|token|gateway|email/i,
    );
  });

  it('projects the observed Portal account and organization shapes', () => {
    expect(
      persistentPanelTarget({
        organization: 'showroom',
        organizationId: 'parent/showroom',
        accountId: 'ig-1',
        entityId: 'parent/default',
      }),
    ).toEqual({
      organization: 'showroom',
      organizationId: 'parent/showroom',
      account: 'ig-1',
      workspacePath: 'root:orgs:showroom:ig-1',
    });
    expect(
      persistentPanelTarget({
        organization: 'showroom',
        organizationId: 'parent/showroom',
        kcpPath: 'root:orgs:showroom',
      }),
    ).toEqual({
      organization: 'showroom',
      organizationId: 'parent/showroom',
    });
  });

  it('uses bounded account fields in canonical precedence order', () => {
    expect(
      persistentPanelTarget({
        organization: 'showroom',
        entityContext: { account: { id: 'from-entity-context' } },
        accountId: 'from-account-id',
        'core_platform-mesh_io_accountId': 'from-core-account-id',
        accountPath: 'root:orgs:showroom:from-path',
      }),
    ).toMatchObject({ account: 'from-entity-context' });
    expect(
      persistentPanelTarget({
        organization: 'showroom',
        accountId: 'from-account-id',
        'core_platform-mesh_io_accountId': 'from-core-account-id',
        accountPath: 'root:orgs:showroom:from-path',
      }),
    ).toMatchObject({ account: 'from-account-id' });
    expect(
      persistentPanelTarget({
        organization: 'showroom',
        'core_platform-mesh_io_accountId': 'from-core-account-id',
        accountPath: 'root:orgs:showroom:from-path',
      }),
    ).toMatchObject({ account: 'from-core-account-id' });
  });

  it('uses a valid matching account path only as the final account fallback', () => {
    expect(
      persistentPanelTarget({
        organization: 'showroom',
        accountPath: 'root:orgs:showroom:ig-1',
      }),
    ).toMatchObject({ account: 'ig-1' });
    expect(
      persistentPanelTarget({
        organization: 'showroom',
        accountPath: 'root:orgs:another-org:ig-1',
      }),
    ).not.toHaveProperty('account');
    expect(
      persistentPanelTarget({
        organization: 'showroom',
        accountPath: 'ig-1',
      }),
    ).toMatchObject({
      account: 'ig-1',
      accountPath: 'ig-1',
      workspacePath: 'root:orgs:showroom:ig-1',
    });
  });

  it('uses the Account entity shape as a bounded fallback', () => {
    expect(
      persistentPanelTarget({
        organization: 'showroom',
        entityKind: 'Account',
        entityName: 'ig-1',
      }),
    ).toMatchObject({
      account: 'ig-1',
      workspacePath: 'root:orgs:showroom:ig-1',
    });
    expect(
      persistentPanelTarget({
        organization: 'showroom',
        entityKind: 'Namespace',
        entityName: 'default',
      }),
    ).not.toHaveProperty('account');
  });

  it('rejects invalid workspace segments and overlong values', () => {
    expect(
      persistentPanelTarget({
        organization: 'showroom',
        accountId: 'not/a/workspace',
      }),
    ).not.toHaveProperty('workspacePath');
    expect(
      persistentPanelTarget({
        organization: 'x'.repeat(254),
        accountId: 'team-a',
      }),
    ).not.toHaveProperty('organization');
    expect(
      persistentPanelTarget({
        organization: 'showroom',
        accountId: 'team-a',
        workspacePath: 'root:orgs:another-org:team-a',
      }),
    ).toMatchObject({
      workspacePath: 'root:orgs:showroom:team-a',
    });
    expect(
      persistentPanelTarget({
        organization: 'showroom',
        accountId: 'team-a',
        kcpPath: 'root:orgs:showroom:team-b',
      }),
    ).toMatchObject({
      workspacePath: 'root:orgs:showroom:team-a',
    });
  });

  it('keeps the tracked navigation target when provider metadata is sparse', () => {
    expect(
      mergePersistentPanelTargets(
        {
          organization: 'org-a',
          account: 'team-a',
          namespace: 'apps',
          resource: { kind: 'Database', name: 'old' },
        },
        { organization: 'org-a' },
      ),
    ).toEqual({
      organization: 'org-a',
      account: 'team-a',
      namespace: 'apps',
      resource: { kind: 'Database', name: 'old' },
    });
  });

  it('drops deeper tracked scope when provider identity changes', () => {
    expect(
      mergePersistentPanelTargets(
        { organization: 'org-a', account: 'team-a', namespace: 'apps' },
        { organization: 'org-a', account: 'team-b' },
      ),
    ).toEqual({ organization: 'org-a', account: 'team-b' });
    expect(
      mergePersistentPanelTargets(
        {
          organization: 'org-a',
          account: 'team-a',
          namespace: 'apps',
          resource: { kind: 'Database', name: 'old' },
        },
        { organization: 'org-b' },
      ),
    ).toEqual({ organization: 'org-b' });
  });
});
