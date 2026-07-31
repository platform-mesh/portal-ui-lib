import { OpenPersistentPanelListener } from './open-persistent-panel.listener';
import { PersistentPanelService } from './persistent-panel.service';
import { OPEN_PERSISTENT_PANEL_MESSAGE } from './persistent-panel.types';
import { Injector, runInInjectionContext } from '@angular/core';
import { LuigiCoreService, NodeContext } from '@openmfp/portal-ui-lib';

describe('OpenPersistentPanelListener', () => {
  it('opens the registered provider UI with bounded Portal context', () => {
    const panelService = {
      currentTarget: vi.fn().mockReturnValue({
        organization: 'showroom',
        account: 'ig-1',
        workspacePath: 'root:orgs:showroom:ig-1',
      }),
      open: vi.fn(),
    };
    const luigiCoreService = {
      getGlobalContext: vi.fn().mockReturnValue({
        organization: 'showroom',
        token: 'must-not-leak',
      }),
    };
    const injector = Injector.create({
      providers: [
        { provide: PersistentPanelService, useValue: panelService },
        { provide: LuigiCoreService, useValue: luigiCoreService },
      ],
    });
    const listener = runInInjectionContext(
      injector,
      () => new OpenPersistentPanelListener(),
    );

    expect(listener.messageId()).toBe(OPEN_PERSISTENT_PANEL_MESSAGE);
    listener.onCustomMessageReceived(
      { id: OPEN_PERSISTENT_PANEL_MESSAGE, url: 'https://attacker.example' },
      undefined,
      {
        viewUrl: 'https://provider.example.test/panel',
        context: {
          persistentPanel: { id: 'provider.tools', title: 'Provider tools' },
        } as unknown as NodeContext,
      },
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
});
