import {
  PROVIDER_PANEL_MESSAGE,
  PersistentPanelConfig,
  PersistentPanelTarget,
} from './persistent-panel.types';
import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

type PanelState = 'hidden' | 'expanded' | 'maximized';

const PORTAL_MAIN_AREA_SELECTOR = '.iframeContainer';
const PORTAL_LAYOUT_SELECTORS = [
  PORTAL_MAIN_AREA_SELECTOR,
  '.spinnerContainer.appSpinner',
  '#splitViewContainer',
  '#splitViewDragger',
  '#splitViewDraggerBackdrop',
  '#tabsContainer',
].join(',');

interface InlineStyleValue {
  value: string;
  priority: string;
}

@Component({
  selector: 'pm-persistent-panel',
  imports: [CommonModule],
  standalone: true,
  templateUrl: './persistent-panel.html',
  styleUrl: './persistent-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PersistentPanelComponent implements OnDestroy {
  @ViewChild('panelFrame') panelFrame?: ElementRef<HTMLIFrameElement>;
  @ViewChild('reopenButton') reopenButton?: ElementRef<HTMLButtonElement>;

  private readonly dimensions = panelDimensions();
  private readonly preferredPanelWidth = signal(this.dimensions.defaultWidth);

  readonly state = signal<PanelState>('hidden');
  readonly title = signal('');
  readonly source = signal<SafeResourceUrl | null>(null);
  readonly closing = signal(false);
  readonly closeError = signal('');
  readonly resizing = signal(false);
  readonly maxPanelWidth = signal(this.availablePanelWidth());
  readonly minPanelWidth = computed(() =>
    Math.min(this.dimensions.minimumWidth, this.maxPanelWidth()),
  );
  readonly panelWidth = computed(() =>
    Math.max(
      this.minPanelWidth(),
      Math.min(
        this.state() === 'maximized'
          ? this.maxPanelWidth()
          : this.preferredPanelWidth(),
        this.maxPanelWidth(),
      ),
    ),
  );

  private readonly sanitizer = inject(DomSanitizer);
  private config: PersistentPanelConfig | null = null;
  private target: PersistentPanelTarget = {};
  private sequence = 0;
  private closeSequence = 0;
  private closeTimeout: number | null = null;
  private closeRequestIdSent: number | null = null;
  private destroyed = false;
  private ready = false;
  private returnFocusElement: HTMLElement | null = null;
  private resizePointerId: number | null = null;
  private observingPortalLayout = false;
  private observedMainArea: HTMLElement | null = null;
  private readonly portalLayoutStyles = new Map<
    HTMLElement,
    InlineStyleValue
  >();
  private readonly portalLayoutObserver = new MutationObserver(() => {
    if (this.state() === 'hidden') {
      return;
    }
    this.maxPanelWidth.set(this.availablePanelWidth());
    this.syncPortalLayout();
  });
  private readonly mainAreaResizeObserver =
    typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(() => {
          if (this.state() === 'hidden') {
            return;
          }
          this.maxPanelWidth.set(this.availablePanelWidth());
          this.syncPortalLayout();
        });

  constructor() {
    window.addEventListener('message', this.onMessage);
    window.addEventListener('resize', this.onWindowResize);
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    window.removeEventListener('message', this.onMessage);
    window.removeEventListener('resize', this.onWindowResize);
    this.clearCloseTimeout();
    this.resizePointerId = null;
    this.resizing.set(false);
    this.portalLayoutObserver.disconnect();
    this.mainAreaResizeObserver?.disconnect();
    this.restorePortalLayout();
  }

  open(config: PersistentPanelConfig, target: PersistentPanelTarget): void {
    if (this.closing()) {
      this.closeSequence += 1;
    }
    this.clearCloseTimeout();
    this.closeRequestIdSent = null;
    this.closing.set(false);
    this.closeError.set('');
    const sourceChanged = this.config?.url !== config.url;
    if (!this.source()) {
      this.returnFocusElement =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
    }
    if (sourceChanged) {
      this.ready = false;
    }
    this.config = config;
    this.target = structuredClone(target);
    this.title.set(config.title);
    if (sourceChanged || !this.source()) {
      this.source.set(
        this.sanitizer.bypassSecurityTrustResourceUrl(config.url),
      );
    }
    this.maxPanelWidth.set(this.availablePanelWidth());
    this.state.set('expanded');
    this.syncPortalLayout();
    queueMicrotask(() => {
      if (this.destroyed) {
        return;
      }
      this.publishTarget();
      this.focusPanel();
    });
  }

  updateTarget(target: PersistentPanelTarget): void {
    this.target = structuredClone(target);
    this.maxPanelWidth.set(this.availablePanelWidth());
    this.syncPortalLayout();
    this.publishTarget();
  }

  collapse(): void {
    this.state.set('hidden');
    this.syncPortalLayout();
    queueMicrotask(() => {
      if (this.destroyed) {
        return;
      }
      this.reopenButton?.nativeElement.focus();
    });
  }

  expand(): void {
    this.maxPanelWidth.set(this.availablePanelWidth());
    this.state.set('expanded');
    this.syncPortalLayout();
    queueMicrotask(() => {
      if (this.destroyed) {
        return;
      }
      this.focusPanel();
    });
  }

  toggleSize(): void {
    this.state.update((state) =>
      state === 'maximized' ? 'expanded' : 'maximized',
    );
    this.syncPortalLayout();
  }

  beginResize(event: PointerEvent): void {
    if (
      this.state() !== 'expanded' ||
      event.button !== 0 ||
      event.isPrimary === false
    ) {
      return;
    }
    this.resizePointerId = event.pointerId;
    this.resizing.set(true);
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    event.preventDefault();
  }

  resize(event: PointerEvent): void {
    if (event.pointerId !== this.resizePointerId) {
      return;
    }
    this.setPanelWidth(window.innerWidth - event.clientX);
    event.preventDefault();
  }

  finishResize(event: PointerEvent): void {
    if (event.pointerId !== this.resizePointerId) {
      return;
    }
    const handle = event.currentTarget as HTMLElement;
    if (handle.hasPointerCapture(event.pointerId)) {
      handle.releasePointerCapture(event.pointerId);
    }
    this.resizePointerId = null;
    this.resizing.set(false);
    event.preventDefault();
  }

  resizeWithKeyboard(event: KeyboardEvent): void {
    let width: number;
    switch (event.key) {
      case 'ArrowLeft':
        width = this.panelWidth() + this.dimensions.keyboardStep;
        break;
      case 'ArrowRight':
        width = this.panelWidth() - this.dimensions.keyboardStep;
        break;
      case 'Home':
        width = this.minPanelWidth();
        break;
      case 'End':
        width = this.maxPanelWidth();
        break;
      default:
        return;
    }
    this.setPanelWidth(width);
    event.preventDefault();
  }

  close(): void {
    if (!this.source() || this.closing()) {
      return;
    }
    this.closeSequence += 1;
    const requestId = this.closeSequence;
    this.closeRequestIdSent = null;
    this.closing.set(true);
    this.closeError.set('');
    this.state.set('hidden');
    this.syncPortalLayout();
    this.focusReturnTarget();
    this.requestCloseIfReady(requestId);
    this.closeTimeout = window.setTimeout(() => {
      this.failClose(requestId);
    }, 30_000);
  }

  private failClose(requestId: number): void {
    if (!this.closing() || requestId !== this.closeSequence) {
      return;
    }
    this.clearCloseTimeout();
    this.closeRequestIdSent = null;
    this.closing.set(false);
    this.closeError.set('Provider cleanup is incomplete. Try closing again.');
    this.maxPanelWidth.set(this.availablePanelWidth());
    this.state.set('expanded');
    this.syncPortalLayout();
    queueMicrotask(() => {
      if (this.destroyed) {
        return;
      }
      this.focusPanel();
    });
  }

  private finishClose(requestId: number): void {
    if (
      !this.closing() ||
      requestId !== this.closeSequence ||
      this.closeRequestIdSent !== requestId
    ) {
      return;
    }
    this.clearCloseTimeout();
    this.closeRequestIdSent = null;
    this.closing.set(false);
    this.closeError.set('');
    this.config = null;
    this.ready = false;
    this.source.set(null);
    this.title.set('');
    this.state.set('hidden');
    this.syncPortalLayout();
    this.focusReturnTarget();
    this.returnFocusElement = null;
  }

  private clearCloseTimeout(): void {
    if (this.closeTimeout !== null) {
      window.clearTimeout(this.closeTimeout);
      this.closeTimeout = null;
    }
  }

  frameLoaded(): void {
    this.maxPanelWidth.set(this.availablePanelWidth());
    this.syncPortalLayout();
    this.publishTarget();
  }

  private publishTarget(): void {
    if (!this.config) {
      return;
    }
    this.sequence += 1;
    this.post({
      type: PROVIDER_PANEL_MESSAGE.context,
      panelId: this.config.id,
      sequence: this.sequence,
      target: this.target,
    });
  }

  private requestCloseIfReady(requestId: number): void {
    if (
      !this.ready ||
      !this.closing() ||
      requestId !== this.closeSequence ||
      this.closeRequestIdSent === requestId
    ) {
      return;
    }
    this.closeRequestIdSent = requestId;
    this.post({ type: PROVIDER_PANEL_MESSAGE.close, requestId });
  }

  private focusPanel(): void {
    this.panelFrame?.nativeElement.focus?.();
  }

  private focusReturnTarget(): void {
    if (this.returnFocusElement?.isConnected) {
      this.returnFocusElement.focus();
    }
  }

  private post(message: Record<string, unknown>): void {
    if (!this.config) {
      return;
    }
    this.panelFrame?.nativeElement.contentWindow?.postMessage(
      message,
      this.config.origin,
    );
  }

  private setPanelWidth(width: number): void {
    this.preferredPanelWidth.set(
      Math.min(Math.max(width, this.minPanelWidth()), this.maxPanelWidth()),
    );
    this.syncPortalLayout();
  }

  private availablePanelWidth(): number {
    if (this.isMobileViewport()) {
      return Math.max(1, window.innerWidth);
    }
    return Math.max(1, Math.floor(this.availableMainAreaWidth() / 2));
  }

  private availableMainAreaWidth(): number {
    const mainArea = document.querySelector<HTMLElement>(
      PORTAL_MAIN_AREA_SELECTOR,
    );
    if (mainArea) {
      return Math.max(
        1,
        window.innerWidth - mainArea.getBoundingClientRect().left,
      );
    }
    return Math.max(1, window.innerWidth);
  }

  private syncPortalLayout(): void {
    if (this.state() === 'hidden' || this.isMobileViewport()) {
      this.stopObservingPortalLayout();
      this.restorePortalLayout();
      return;
    }

    this.observePortalLayout();
    const offset = `${this.panelWidth()}px`;
    document
      .querySelectorAll<HTMLElement>(PORTAL_LAYOUT_SELECTORS)
      .forEach((element) => {
        if (!this.portalLayoutStyles.has(element)) {
          this.portalLayoutStyles.set(element, {
            value: element.style.getPropertyValue('right'),
            priority: element.style.getPropertyPriority('right'),
          });
        }
        element.style.setProperty('right', offset);
      });
  }

  private restorePortalLayout(): void {
    this.portalLayoutStyles.forEach(({ value, priority }, element) => {
      if (value) {
        element.style.setProperty('right', value, priority);
      } else {
        element.style.removeProperty('right');
      }
    });
    this.portalLayoutStyles.clear();
  }

  private observePortalLayout(): void {
    this.observeMainAreaResize();
    if (this.observingPortalLayout) {
      return;
    }
    this.portalLayoutObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });
    this.observingPortalLayout = true;
  }

  private stopObservingPortalLayout(): void {
    this.portalLayoutObserver.disconnect();
    this.mainAreaResizeObserver?.disconnect();
    this.observedMainArea = null;
    this.observingPortalLayout = false;
  }

  private observeMainAreaResize(): void {
    const mainArea = document.querySelector<HTMLElement>(
      PORTAL_MAIN_AREA_SELECTOR,
    );
    if (!this.mainAreaResizeObserver || mainArea === this.observedMainArea) {
      return;
    }
    this.mainAreaResizeObserver.disconnect();
    this.observedMainArea = mainArea;
    if (mainArea) {
      this.mainAreaResizeObserver.observe(mainArea);
    }
  }

  private isMobileViewport(): boolean {
    return window.innerWidth <= 600;
  }

  private readonly onWindowResize = (): void => {
    this.maxPanelWidth.set(this.availablePanelWidth());
    this.syncPortalLayout();
  };

  private readonly onMessage = (event: MessageEvent<unknown>): void => {
    const frame = this.panelFrame?.nativeElement;
    if (
      !frame ||
      event.source !== frame.contentWindow ||
      event.origin !== this.config?.origin ||
      !isRecord(event.data)
    ) {
      return;
    }
    if (event.data['type'] === PROVIDER_PANEL_MESSAGE.ready) {
      this.ready = true;
      if (this.closing()) {
        this.requestCloseIfReady(this.closeSequence);
      } else {
        this.publishTarget();
      }
    }
    if (event.data['type'] === PROVIDER_PANEL_MESSAGE.requestClose) {
      this.close();
    }
    if (
      event.data['type'] === PROVIDER_PANEL_MESSAGE.closeFailed &&
      typeof event.data['requestId'] === 'number' &&
      event.data['requestId'] === this.closeRequestIdSent
    ) {
      this.failClose(event.data['requestId']);
    }
    if (
      event.data['type'] === PROVIDER_PANEL_MESSAGE.closed &&
      typeof event.data['requestId'] === 'number'
    ) {
      this.finishClose(event.data['requestId']);
    }
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function panelDimensions() {
  const rootFontSize = Number.parseFloat(
    window.getComputedStyle(document.documentElement).fontSize,
  );
  const rem =
    Number.isFinite(rootFontSize) && rootFontSize > 0 ? rootFontSize : 16;
  return {
    defaultWidth: 34 * rem,
    minimumWidth: 20 * rem,
    keyboardStep: 2 * rem,
  };
}
