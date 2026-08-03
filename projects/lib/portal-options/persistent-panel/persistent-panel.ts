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
  inject,
  signal,
} from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

type PanelState = 'hidden' | 'expanded' | 'maximized';

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

  readonly state = signal<PanelState>('hidden');
  readonly title = signal('');
  readonly source = signal<SafeResourceUrl | null>(null);
  readonly closing = signal(false);
  readonly closeError = signal('');

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

  constructor() {
    window.addEventListener('message', this.onMessage);
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    window.removeEventListener('message', this.onMessage);
    this.clearCloseTimeout();
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
    this.state.set('expanded');
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
    this.publishTarget();
  }

  collapse(): void {
    this.state.set('hidden');
    queueMicrotask(() => {
      if (this.destroyed) {
        return;
      }
      this.reopenButton?.nativeElement.focus();
    });
  }

  expand(): void {
    this.state.set('expanded');
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
    this.state.set('expanded');
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
