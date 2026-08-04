import { PersistentPanelComponent } from './persistent-panel';
import { PROVIDER_PANEL_MESSAGE } from './persistent-panel.types';
import { ElementRef, Injector, runInInjectionContext } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

const providerOrigin = 'https://provider.example.test';
const config = {
  id: 'provider.tools',
  title: 'Provider tools',
  url: `${providerOrigin}/panel`,
  origin: providerOrigin,
};

describe('PersistentPanelComponent', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('posts context and lifecycle messages only to the registered origin', () => {
    const postMessage = vi.fn();
    const component = createPanel();
    component.panelFrame = frameWith(postMessage);

    component.open(config, { organization: 'showroom' });
    component.frameLoaded();
    component.updateTarget({ organization: 'showroom', account: 'ig-1' });
    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: PROVIDER_PANEL_MESSAGE.ready },
        origin: providerOrigin,
        source: component.panelFrame.nativeElement.contentWindow,
      }),
    );
    component.close();

    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: PROVIDER_PANEL_MESSAGE.context }),
      providerOrigin,
    );
    expect(postMessage).toHaveBeenLastCalledWith(
      { type: PROVIDER_PANEL_MESSAGE.close, requestId: 1 },
      providerOrigin,
    );
    component.ngOnDestroy();
  });

  it('supports collapse, expand, and maximize without destroying the iframe', () => {
    const component = createPanel();
    component.open(config, {});

    component.collapse();
    expect(component.state()).toBe('hidden');
    component.expand();
    expect(component.state()).toBe('expanded');
    component.toggleSize();
    expect(component.state()).toBe('maximized');
    component.toggleSize();
    expect(component.state()).toBe('expanded');
    expect(component.source()).not.toBeNull();
    component.ngOnDestroy();
  });

  it('retains the iframe until the provider acknowledges cleanup', () => {
    const frameWindow = { postMessage: vi.fn() } as unknown as WindowProxy;
    const component = createPanel();
    component.panelFrame = new ElementRef({
      contentWindow: frameWindow,
    } as HTMLIFrameElement);
    component.open(config, { organization: 'showroom' });
    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: PROVIDER_PANEL_MESSAGE.ready },
        origin: providerOrigin,
        source: frameWindow,
      }),
    );
    component.close();

    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: PROVIDER_PANEL_MESSAGE.closed, requestId: 1 },
        origin: providerOrigin,
        source: frameWindow,
      }),
    );

    expect(component.closing()).toBe(false);
    expect(component.source()).toBeNull();
    component.ngOnDestroy();
  });

  it('accepts ready and request-close only from the registered frame', () => {
    const postMessage = vi.fn();
    const frameWindow = { postMessage } as unknown as WindowProxy;
    const component = createPanel();
    component.panelFrame = new ElementRef({
      contentWindow: frameWindow,
    } as HTMLIFrameElement);
    component.open(config, {});

    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: PROVIDER_PANEL_MESSAGE.ready },
        origin: providerOrigin,
        source: frameWindow,
      }),
    );
    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: PROVIDER_PANEL_MESSAGE.requestClose },
        origin: providerOrigin,
        source: frameWindow,
      }),
    );

    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: PROVIDER_PANEL_MESSAGE.context }),
      providerOrigin,
    );
    expect(component.closing()).toBe(true);
    component.ngOnDestroy();
  });

  it('waits for provider readiness before requesting cleanup', () => {
    const postMessage = vi.fn();
    const frameWindow = { postMessage } as unknown as WindowProxy;
    const component = createPanel();
    component.panelFrame = new ElementRef({
      contentWindow: frameWindow,
    } as HTMLIFrameElement);
    component.open(config, {});

    component.close();
    expect(postMessage).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: PROVIDER_PANEL_MESSAGE.close }),
      providerOrigin,
    );

    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: PROVIDER_PANEL_MESSAGE.ready },
        origin: providerOrigin,
        source: frameWindow,
      }),
    );
    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: PROVIDER_PANEL_MESSAGE.ready },
        origin: providerOrigin,
        source: frameWindow,
      }),
    );

    expect(postMessage).toHaveBeenCalledTimes(1);
    expect(postMessage).toHaveBeenCalledWith(
      { type: PROVIDER_PANEL_MESSAGE.close, requestId: 1 },
      providerOrigin,
    );
    component.ngOnDestroy();
  });

  it('moves focus into, out of, and back to the panel deterministically', async () => {
    const returnButton = document.createElement('button');
    const reopenButton = document.createElement('button');
    const iframe = document.createElement('iframe');
    document.body.append(returnButton, reopenButton, iframe);
    returnButton.focus();
    const component = createPanel();
    component.panelFrame = new ElementRef(iframe);
    component.reopenButton = new ElementRef(reopenButton);

    component.open(config, {});
    await nextMicrotask();
    expect(document.activeElement).toBe(iframe);

    component.collapse();
    await nextMicrotask();
    expect(document.activeElement).toBe(reopenButton);

    component.expand();
    await nextMicrotask();
    expect(document.activeElement).toBe(iframe);

    component.close();
    expect(document.activeElement).toBe(returnButton);

    component.ngOnDestroy();
    returnButton.remove();
    reopenButton.remove();
    iframe.remove();
  });

  it('ignores lifecycle messages from another source, origin, or shape', () => {
    const frameWindow = { postMessage: vi.fn() } as unknown as WindowProxy;
    const component = createPanel();
    component.panelFrame = new ElementRef({
      contentWindow: frameWindow,
    } as HTMLIFrameElement);
    component.open(config, {});
    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: PROVIDER_PANEL_MESSAGE.ready },
        origin: providerOrigin,
        source: frameWindow,
      }),
    );
    component.close();

    for (const event of [
      new MessageEvent('message', {
        data: { type: PROVIDER_PANEL_MESSAGE.closed, requestId: 1 },
        origin: 'https://attacker.example',
        source: frameWindow,
      }),
      new MessageEvent('message', {
        data: { type: PROVIDER_PANEL_MESSAGE.closed, requestId: 1 },
        origin: providerOrigin,
        source: { postMessage: vi.fn() } as unknown as WindowProxy,
      }),
      new MessageEvent('message', {
        data: [],
        origin: providerOrigin,
        source: frameWindow,
      }),
    ]) {
      window.dispatchEvent(event);
    }

    expect(component.closing()).toBe(true);
    expect(component.source()).not.toBeNull();
    component.ngOnDestroy();
  });

  it('cancels stale close completion when the panel is reopened', () => {
    vi.useFakeTimers();
    const frameWindow = { postMessage: vi.fn() } as unknown as WindowProxy;
    const component = createPanel();
    component.panelFrame = new ElementRef({
      contentWindow: frameWindow,
    } as HTMLIFrameElement);
    component.open(config, {});
    component.close();

    component.open(config, { account: 'team-a' });
    vi.advanceTimersByTime(30_000);
    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: PROVIDER_PANEL_MESSAGE.closed, requestId: 1 },
        origin: providerOrigin,
        source: frameWindow,
      }),
    );

    expect(component.closing()).toBe(false);
    expect(component.source()).not.toBeNull();
    expect(component.state()).toBe('expanded');
    component.ngOnDestroy();
  });

  it('keeps an unresponsive iframe visible after the bounded timeout', () => {
    vi.useFakeTimers();
    const postMessage = vi.fn();
    const component = createPanel();
    component.panelFrame = frameWith(postMessage);
    component.open(config, {});

    component.close();
    component.close();
    vi.advanceTimersByTime(30_000);

    expect(component.closing()).toBe(false);
    expect(component.source()).not.toBeNull();
    expect(component.state()).toBe('expanded');
    expect(component.closeError()).toMatch(/cleanup is incomplete/i);
    component.ngOnDestroy();
  });

  it('keeps the iframe visible when the provider reports cleanup failure', () => {
    const frameWindow = { postMessage: vi.fn() } as unknown as WindowProxy;
    const component = createPanel();
    component.panelFrame = new ElementRef({
      contentWindow: frameWindow,
    } as HTMLIFrameElement);
    component.open(config, {});
    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: PROVIDER_PANEL_MESSAGE.ready },
        origin: providerOrigin,
        source: frameWindow,
      }),
    );
    component.close();

    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: PROVIDER_PANEL_MESSAGE.closeFailed, requestId: 1 },
        origin: providerOrigin,
        source: frameWindow,
      }),
    );

    expect(component.closing()).toBe(false);
    expect(component.source()).not.toBeNull();
    expect(component.state()).toBe('expanded');
    component.ngOnDestroy();
  });
});

function createPanel(): PersistentPanelComponent {
  const injector = Injector.create({
    providers: [
      {
        provide: DomSanitizer,
        useValue: { bypassSecurityTrustResourceUrl: (url: string) => url },
      },
    ],
  });
  return runInInjectionContext(injector, () => new PersistentPanelComponent());
}

function frameWith(postMessage: ReturnType<typeof vi.fn>) {
  return new ElementRef({
    contentWindow: { postMessage } as unknown as WindowProxy,
  } as HTMLIFrameElement);
}

function nextMicrotask(): Promise<void> {
  return new Promise((resolve) => queueMicrotask(resolve));
}
