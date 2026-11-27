import { OpenPersistentPanelListener } from './open-persistent-panel.listener';
import { PersistentPanelService } from './persistent-panel.service';
import { OPEN_PERSISTENT_PANEL_MESSAGE } from './persistent-panel.types';
import { Injector, runInInjectionContext } from '@angular/core';
import { LuigiCoreService, NodeContext } from '@openmfp/portal-ui-lib';

describe('OpenPersistentPanelListener', () => {
  let panelService: {
    currentTarget: ReturnType<typeof vi.fn>;
    currentNavigationContext: ReturnType<typeof vi.fn>;
    open: ReturnType<typeof vi.fn>;
  };
  let luigiCoreService: {
    getGlobalContext: ReturnType<typeof vi.fn>;
    getConfigValue: ReturnType<typeof vi.fn>;
    routing: ReturnType<typeof vi.fn>;
  };
  let searchParams: Record<string, string>;
  let listener: OpenPersistentPanelListener;

  const providerNode = (viewUrl: string) => ({
    viewUrl,
    context: {
      persistentPanel: { id: 'provider.tools', title: 'Provider tools' },
    } as unknown as NodeContext,
  });

  beforeEach(() => {
    searchParams = {};
    panelService = {
      currentTarget: vi.fn().mockReturnValue({
        organization: 'showroom',
        account: 'ig-1',
        workspacePath: 'root:orgs:showroom:ig-1',
      }),
      currentNavigationContext: vi.fn().mockReturnValue({}),
      open: vi.fn(),
    };
    luigiCoreService = {
      getGlobalContext: vi.fn().mockReturnValue({
        organization: 'showroom',
        token: 'must-not-leak',
      }),
      getConfigValue: vi.fn().mockReturnValue(undefined),
      routing: vi.fn(() => ({ getSearchParams: () => searchParams })),
    };
    const injector = Injector.create({
      providers: [
        { provide: PersistentPanelService, useValue: panelService },
        { provide: LuigiCoreService, useValue: luigiCoreService },
      ],
    });
    listener = runInInjectionContext(
      injector,
      () => new OpenPersistentPanelListener(),
    );
  });

  it('opens the registered provider UI with bounded Portal context', () => {
    expect(listener.messageId()).toBe(OPEN_PERSISTENT_PANEL_MESSAGE);
    listener.onCustomMessageReceived(
      { id: OPEN_PERSISTENT_PANEL_MESSAGE, url: 'https://attacker.example' },
      undefined,
      providerNode('https://provider.example.test/panel'),
    );

    expect(panelService.open).toHaveBeenCalledWith(
      {
        id: 'provider.tools',
        title: 'Provider tools',
        url: 'https://provider.example.test/panel',
        origin: 'https://provider.example.test',
      },
      {
        organization: 'showroom',
        account: 'ig-1',
        workspacePath: 'root:orgs:showroom:ig-1',
      },
    );
  });

  it('replaces viewUrl placeholders from the navigation context and node params', () => {
    panelService.currentNavigationContext.mockReturnValue({
      accountId: 'ig-1',
    });
    searchParams = { '~tab': 'logs', namespace: 'apps' };

    listener.onCustomMessageReceived(
      { id: OPEN_PERSISTENT_PANEL_MESSAGE },
      undefined,
      providerNode(
        'https://provider.example.test/panel?organization={context.organization}&account={context.accountId}&tab={nodeParams.tab}',
      ),
    );

    expect(panelService.open).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://provider.example.test/panel?organization=showroom&account=ig-1&tab=logs',
      }),
      expect.anything(),
    );
  });

  it('prefers the requesting node context over the navigation context', () => {
    panelService.currentNavigationContext.mockReturnValue({
      organization: 'other',
    });
    const node = providerNode(
      'https://provider.example.test/panel?organization={context.organization}',
    );
    node.context = { ...node.context, organization: 'showroom' };

    listener.onCustomMessageReceived(
      { id: OPEN_PERSISTENT_PANEL_MESSAGE },
      undefined,
      node,
    );

    expect(panelService.open).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://provider.example.test/panel?organization=showroom',
      }),
      expect.anything(),
    );
  });

  it.each([
    ['a custom', '_', { _tab: 'logs', '~tab': 'ignored' }],
    ['an empty', false, { tab: 'logs' }],
  ])(
    'reads node params with %s routing.nodeParamPrefix',
    (_case, prefix, params) => {
      luigiCoreService.getConfigValue.mockImplementation((key: string) =>
        key === 'routing.nodeParamPrefix' ? prefix : undefined,
      );
      searchParams = params;

      listener.onCustomMessageReceived(
        { id: OPEN_PERSISTENT_PANEL_MESSAGE },
        undefined,
        providerNode(
          'https://provider.example.test/panel?tab={nodeParams.tab}',
        ),
      );

      expect(panelService.open).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'https://provider.example.test/panel?tab=logs',
        }),
        expect.anything(),
      );
    },
  );

  it('sanitizes node param values the way Luigi does for the node view', () => {
    searchParams = { '~q': `<a href='/x'>"` };

    listener.onCustomMessageReceived(
      { id: OPEN_PERSISTENT_PANEL_MESSAGE },
      undefined,
      providerNode('https://provider.example.test/panel?q={nodeParams.q}'),
    );

    expect(panelService.open.mock.calls[0][0].url).toBe(
      new URL(
        'https://provider.example.test/panel?q=&lt;a href=&#39;&sol;x&#39;&gt;&quot;',
      ).toString(),
    );
  });

  it('does not open the panel when a placeholder cannot be resolved', () => {
    expect(() =>
      listener.onCustomMessageReceived(
        { id: OPEN_PERSISTENT_PANEL_MESSAGE },
        undefined,
        providerNode(
          'https://provider.example.test/panel?account={context.accountId}',
        ),
      ),
    ).toThrow(/unresolved placeholders/i);
    expect(panelService.open).not.toHaveBeenCalled();
  });
});
