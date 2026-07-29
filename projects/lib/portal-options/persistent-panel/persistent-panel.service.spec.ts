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
    service.updateTarget({ organization: 'showroom', account: 'ig-1' });
    expect(service.currentTarget()).toEqual({
      organization: 'showroom',
      account: 'ig-1',
    });

    service.open(config, service.currentTarget());
    service.destroy();
    service.destroy();

    expect(service.currentTarget()).toEqual({});
    expect(document.querySelector('pm-persistent-panel')).toBeNull();
  });
});
