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
    vi.unstubAllGlobals();
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
    expect(component.panelWidth()).toBe(600);

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
    expect(component.panelWidth()).toBe(600);
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
    expect(component.panelWidth()).toBe(600);

    viewportWidth = 800;
    window.dispatchEvent(new Event('resize'));
    expect(component.panelWidth()).toBe(400);

    viewportWidth = 1200;
    window.dispatchEvent(new Event('resize'));
    expect(component.panelWidth()).toBe(600);
    component.ngOnDestroy();
  });

  it('limits the panel to half of the measured Portal main area', () => {
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(1400);
    const mainArea = portalLayoutElement('iframeContainer', 280);
    const component = createPanel();

    expect(component.maxPanelWidth()).toBe(560);
    component.open(config, {});
    expect(component.panelWidth()).toBe(544);
    expect(mainArea.style.right).toBe('544px');

    component.resizeWithKeyboard({
      key: 'ArrowRight',
      preventDefault: vi.fn(),
    } as unknown as KeyboardEvent);
    expect(component.panelWidth()).toBe(512);

    component.toggleSize();
    expect(component.state()).toBe('maximized');
    expect(component.panelWidth()).toBe(560);
    expect(mainArea.style.right).toBe('560px');

    component.toggleSize();
    expect(component.state()).toBe('expanded');
    expect(component.panelWidth()).toBe(512);
    expect(mainArea.style.right).toBe('512px');

    component.ngOnDestroy();
    expect(mainArea.style.right).toBe('');
    mainArea.remove();
  });

  it('resizes and restores every Portal main-area layer', () => {
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(1200);
    const mainArea = portalLayoutElement('iframeContainer', 200);
    const spinner = portalLayoutElement('spinnerContainer appSpinner', 200);
    const modalSpinner = portalLayoutElement('spinnerContainer', 200);
    const tabs = portalLayoutElement('', 200, 'tabsContainer');
    const splitView = portalLayoutElement('', 200, 'splitViewContainer');
    const splitDragger = portalLayoutElement('', 200, 'splitViewDragger');
    const splitBackdrop = portalLayoutElement(
      '',
      200,
      'splitViewDraggerBackdrop',
    );
    mainArea.style.setProperty('right', '12px', 'important');
    const component = createPanel();

    component.open(config, {});
    expect(component.maxPanelWidth()).toBe(500);
    expect(component.panelWidth()).toBe(500);
    expect(mainArea.style.right).toBe('500px');
    expect(spinner.style.right).toBe('500px');
    expect(tabs.style.right).toBe('500px');
    expect(splitView.style.right).toBe('500px');
    expect(splitDragger.style.right).toBe('500px');
    expect(splitBackdrop.style.right).toBe('500px');
    expect(modalSpinner.style.right).toBe('');

    component.resizeWithKeyboard({
      key: 'ArrowRight',
      preventDefault: vi.fn(),
    } as unknown as KeyboardEvent);
    expect(component.panelWidth()).toBe(468);
    expect(mainArea.style.right).toBe('468px');

    component.collapse();
    expect(mainArea.style.getPropertyValue('right')).toBe('12px');
    expect(mainArea.style.getPropertyPriority('right')).toBe('important');
    expect(spinner.style.right).toBe('');
    expect(tabs.style.right).toBe('');
    expect(splitView.style.right).toBe('');
    expect(splitDragger.style.right).toBe('');
    expect(splitBackdrop.style.right).toBe('');
    expect(modalSpinner.style.right).toBe('');

    component.expand();
    expect(mainArea.style.right).toBe('468px');
    component.close();
    expect(mainArea.style.getPropertyValue('right')).toBe('12px');
    expect(mainArea.style.getPropertyPriority('right')).toBe('important');
    component.ngOnDestroy();
    expect(mainArea.style.getPropertyValue('right')).toBe('12px');
    expect(mainArea.style.getPropertyPriority('right')).toBe('important');

    mainArea.remove();
    spinner.remove();
    tabs.remove();
    splitView.remove();
    splitDragger.remove();
    splitBackdrop.remove();
    modalSpinner.remove();
  });

  it('applies the current inset to Portal layers added after opening', async () => {
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(1200);
    const mainArea = portalLayoutElement('iframeContainer', 200);
    const component = createPanel();
    component.open(config, {});

    const spinner = portalLayoutElement('spinnerContainer appSpinner', 200);
    await nextMicrotask();
    expect(spinner.style.right).toBe('500px');

    component.ngOnDestroy();
    mainArea.remove();
    spinner.remove();
  });

  it('recomputes the limit when the Portal navigation resizes the main area', () => {
    let notifyResize: ResizeObserverCallback = () => undefined;
    class ResizeObserverMock {
      constructor(callback: ResizeObserverCallback) {
        notifyResize = callback;
      }
      observe = vi.fn();
      disconnect = vi.fn();
    }
    vi.stubGlobal('ResizeObserver', ResizeObserverMock);
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(1200);
    let mainAreaLeft = 200;
    const mainArea = document.createElement('div');
    mainArea.className = 'iframeContainer';
    vi.spyOn(mainArea, 'getBoundingClientRect').mockImplementation(
      () =>
        ({
          left: mainAreaLeft,
        }) as DOMRect,
    );
    document.body.appendChild(mainArea);
    const component = createPanel();
    component.open(config, {});
    expect(component.maxPanelWidth()).toBe(500);

    mainAreaLeft = 400;
    notifyResize([], {} as ResizeObserver);

    expect(component.maxPanelWidth()).toBe(400);
    expect(component.panelWidth()).toBe(400);
    expect(mainArea.style.right).toBe('400px');

    component.ngOnDestroy();
    mainArea.remove();
  });

  it('restores the main area when crossing into mobile full-screen mode', () => {
    let viewportWidth = 1200;
    vi.spyOn(window, 'innerWidth', 'get').mockImplementation(
      () => viewportWidth,
    );
    const mainArea = portalLayoutElement('iframeContainer', 200);
    const component = createPanel();
    component.open(config, {});
    expect(mainArea.style.right).toBe('500px');

    viewportWidth = 600;
    window.dispatchEvent(new Event('resize'));
    expect(mainArea.style.right).toBe('');

    viewportWidth = 1200;
    window.dispatchEvent(new Event('resize'));
    expect(mainArea.style.right).toBe('500px');

    component.ngOnDestroy();
    mainArea.remove();
  });

  it('keeps the Portal layout unchanged in the mobile full-screen mode', () => {
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(600);
    const mainArea = portalLayoutElement('iframeContainer', 0);
    const component = createPanel();

    component.open(config, {});
    expect(component.maxPanelWidth()).toBe(600);
    expect(mainArea.style.right).toBe('');

    component.ngOnDestroy();
    mainArea.remove();
  });

  it('derives panel bounds from the Portal root font size', () => {
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({
      fontSize: '20px',
    } as CSSStyleDeclaration);
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(1200);
    const component = createPanel();

    expect(component.minPanelWidth()).toBe(400);
    expect(component.panelWidth()).toBe(600);
    expect(component.maxPanelWidth()).toBe(600);
    component.ngOnDestroy();
  });

  it('keeps the panel and ARIA bounds inside a narrow large-text viewport', () => {
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({
      fontSize: '32px',
    } as CSSStyleDeclaration);
    let viewportWidth = 601;
    vi.spyOn(window, 'innerWidth', 'get').mockImplementation(
      () => viewportWidth,
    );
    const component = createPanel();

    expect(component.minPanelWidth()).toBe(300);
    expect(component.panelWidth()).toBe(300);
    expect(component.maxPanelWidth()).toBe(300);

    viewportWidth = 1600;
    window.dispatchEvent(new Event('resize'));
    expect(component.minPanelWidth()).toBe(640);
    expect(component.panelWidth()).toBe(800);
    expect(component.maxPanelWidth()).toBe(800);
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
    expect(component.maxPanelWidth()).toBe(200);

    component.beginResize(pointerEvent(handle, 7, 0));
    component.resize(pointerEvent(handle, 8, 0));
    expect(component.panelWidth()).toBe(200);
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
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(1200);
    let mainAreaLeft = 200;
    const mainArea = document.createElement('div');
    mainArea.className = 'iframeContainer';
    vi.spyOn(mainArea, 'getBoundingClientRect').mockImplementation(
      () => ({ left: mainAreaLeft }) as DOMRect,
    );
    document.body.appendChild(mainArea);
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
    mainAreaLeft = 400;

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
    expect(component.maxPanelWidth()).toBe(400);
    expect(mainArea.style.right).toBe('400px');
    component.ngOnDestroy();
    mainArea.remove();
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

function portalLayoutElement(
  className: string,
  left: number,
  id = '',
): HTMLElement {
  const element = document.createElement('div');
  element.className = className;
  element.id = id;
  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({
    bottom: 800,
    height: 800,
    left,
    right: window.innerWidth,
    top: 0,
    width: window.innerWidth - left,
    x: left,
    y: 0,
    toJSON: () => ({}),
  });
  document.body.appendChild(element);
  return element;
}
