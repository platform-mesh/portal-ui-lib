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
    vi.restoreAllMocks();
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

  it('resizes with a pointer and clamps the panel to the supported bounds', () => {
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(1200);
    const component = createPanel();
    const handle = resizeHandle();
    component.open(config, {});

    component.beginResize(pointerEvent(handle, 7, 656));
    expect(handle.setPointerCapture).toHaveBeenCalledWith(7);
    expect(component.resizing()).toBe(true);

    component.resize(pointerEvent(handle, 7, 1199));
    expect(component.panelWidth()).toBe(320);
    component.resize(pointerEvent(handle, 7, 0));
    expect(component.panelWidth()).toBe(1132);

    component.finishResize(pointerEvent(handle, 7, 0));
    expect(handle.releasePointerCapture).toHaveBeenCalledWith(7);
    expect(component.resizing()).toBe(false);
    expect(component.source()).not.toBeNull();
    component.ngOnDestroy();
  });

  it('supports accessible keyboard resizing', () => {
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(1200);
    const component = createPanel();
    const preventDefault = vi.fn();

    component.resizeWithKeyboard({
      key: 'ArrowLeft',
      preventDefault,
    } as unknown as KeyboardEvent);
    expect(component.panelWidth()).toBe(576);

    component.resizeWithKeyboard({
      key: 'Home',
      preventDefault,
    } as unknown as KeyboardEvent);
    expect(component.panelWidth()).toBe(320);

    component.resizeWithKeyboard({
      key: 'End',
      preventDefault,
    } as unknown as KeyboardEvent);
    expect(component.panelWidth()).toBe(1132);
    expect(preventDefault).toHaveBeenCalledTimes(3);
    component.ngOnDestroy();
  });

  it('keeps the preferred width while clamping it to a resized viewport', () => {
    let viewportWidth = 1200;
    vi.spyOn(window, 'innerWidth', 'get').mockImplementation(
      () => viewportWidth,
    );
    const component = createPanel();
    component.resizeWithKeyboard({
      key: 'End',
      preventDefault: vi.fn(),
    } as unknown as KeyboardEvent);
    expect(component.panelWidth()).toBe(1132);

    viewportWidth = 800;
    window.dispatchEvent(new Event('resize'));
    expect(component.panelWidth()).toBe(732);

    viewportWidth = 1200;
    window.dispatchEvent(new Event('resize'));
    expect(component.panelWidth()).toBe(1132);
    component.ngOnDestroy();
  });

  it('ignores unsupported resize input and releases lost pointer capture', () => {
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(200);
    const component = createPanel();
    const handle = resizeHandle(false);

    component.beginResize(pointerEvent(handle, 7, 0));
    component.open(config, {});
    component.beginResize(pointerEvent(handle, 7, 0, { button: 1 }));
    component.beginResize(pointerEvent(handle, 7, 0, { isPrimary: false }));
    expect(component.resizing()).toBe(false);
    expect(component.maxPanelWidth()).toBe(320);

    component.beginResize(pointerEvent(handle, 7, 0));
    component.resize(pointerEvent(handle, 8, 0));
    expect(component.panelWidth()).toBe(320);
    component.finishResize(pointerEvent(handle, 8, 0));
    expect(component.resizing()).toBe(true);
    component.finishResize(pointerEvent(handle, 7, 0));
    expect(handle.releasePointerCapture).not.toHaveBeenCalled();
    component.finishResize(pointerEvent(handle, 7, 0));

    const preventDefault = vi.fn();
    component.resizeWithKeyboard({
      key: 'ArrowRight',
      preventDefault,
    } as unknown as KeyboardEvent);
    component.resizeWithKeyboard({
      key: 'PageDown',
      preventDefault,
    } as unknown as KeyboardEvent);
    expect(preventDefault).toHaveBeenCalledTimes(1);
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

function resizeHandle(hasCapture = true) {
  return {
    setPointerCapture: vi.fn(),
    hasPointerCapture: vi.fn().mockReturnValue(hasCapture),
    releasePointerCapture: vi.fn(),
  };
}

function pointerEvent(
  handle: ReturnType<typeof resizeHandle>,
  pointerId: number,
  clientX: number,
  overrides: Partial<PointerEvent> = {},
): PointerEvent {
  return {
    button: 0,
    clientX,
    currentTarget: handle,
    isPrimary: true,
    pointerId,
    preventDefault: vi.fn(),
    ...overrides,
  } as unknown as PointerEvent;
}
