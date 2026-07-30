import { PersistentPanelService } from './persistent-panel.service';
import { TestBed } from '@angular/core/testing';

const config = {
  id: 'provider.tools',
  title: 'Provider tools',
  url: 'https://provider.example.test/panel',
  origin: 'https://provider.example.test',
};

describe('PersistentPanelService', () => {
  let service: PersistentPanelService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PersistentPanelService);
  });

  afterEach(() => {
    service.destroy();
  });

  it('creates one panel host and reuses it for subsequent opens', () => {
    service.open(config, { organization: 'showroom' });
    const panelHost = document.querySelector('pm-persistent-panel');

    expect(panelHost?.querySelector('iframe')).not.toBeNull();
    expect(panelHost?.textContent).toContain('Provider tools');

    service.open(config, { organization: 'showroom', account: 'ig-1' });

    expect(document.querySelectorAll('pm-persistent-panel')).toHaveLength(1);
    expect(service.currentTarget()).toEqual({
      organization: 'showroom',
      account: 'ig-1',
    });
  });

  it('tracks navigation before a panel is opened and clears state on destroy', () => {
    service.beginTargetUpdate()({
      organization: 'showroom',
      accountId: 'ig-1',
    });
    expect(service.currentTarget()).toEqual({
      organization: 'showroom',
      account: 'ig-1',
      workspacePath: 'root:orgs:showroom:ig-1',
    });

    service.open(config, service.currentTarget());
    service.destroy();
    service.destroy();

    expect(service.currentTarget()).toEqual({});
    expect(document.querySelector('pm-persistent-panel')).toBeNull();
  });

  it('normalizes raw Portal context and clears stale descendant scope', () => {
    service.beginTargetUpdate()({
      organization: 'showroom',
      accountId: 'ig-1',
      namespaceId: 'apps',
      token: 'must-not-leak',
    });
    expect(service.currentTarget()).toEqual({
      organization: 'showroom',
      account: 'ig-1',
      workspacePath: 'root:orgs:showroom:ig-1',
      namespace: 'apps',
    });

    service.beginTargetUpdate()({ organization: 'showroom' });
    expect(service.currentTarget()).toEqual({ organization: 'showroom' });
  });

  it('ignores completion from an older navigation', () => {
    const completeFirstNavigation = service.beginTargetUpdate();
    const completeSecondNavigation = service.beginTargetUpdate();

    completeSecondNavigation({
      organization: 'showroom',
      accountId: 'account-b',
    });
    completeFirstNavigation({
      organization: 'showroom',
      accountId: 'account-a',
    });

    expect(service.currentTarget()).toEqual({
      organization: 'showroom',
      account: 'account-b',
      workspacePath: 'root:orgs:showroom:account-b',
    });
  });

  it('uses the resolver-enriched path for a nested account', () => {
    service.beginTargetUpdate()({
      organization: 'showroom',
      accountId: 'child',
      accountPath: 'parent:child',
      kcpPath: 'root:orgs:showroom:parent:child',
    });

    expect(service.currentTarget()).toEqual({
      organization: 'showroom',
      account: 'child',
      workspacePath: 'root:orgs:showroom:parent:child',
    });
  });

  it('invalidates a pending navigation when destroyed', () => {
    const completeNavigation = service.beginTargetUpdate();

    service.destroy();
    completeNavigation({ organization: 'showroom', accountId: 'ig-1' });

    expect(service.currentTarget()).toEqual({});
  });
});
