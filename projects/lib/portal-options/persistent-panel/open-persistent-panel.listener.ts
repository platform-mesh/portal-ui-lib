import { PersistentPanelService } from './persistent-panel.service';
import {
  OPEN_PERSISTENT_PANEL_MESSAGE,
  mergePersistentPanelTargets,
  parsePersistentPanelConfig,
  persistentPanelTarget,
} from './persistent-panel.types';
import { Injectable, inject } from '@angular/core';
import {
  CustomMessageListener,
  LuigiCoreService,
  NodeContext,
} from '@openmfp/portal-ui-lib';

@Injectable({ providedIn: 'root' })
export class OpenPersistentPanelListener implements CustomMessageListener {
  private readonly luigiCoreService = inject(LuigiCoreService);
  private readonly persistentPanelService = inject(PersistentPanelService);

  messageId(): string {
    return OPEN_PERSISTENT_PANEL_MESSAGE;
  }

  onCustomMessageReceived(
    customMessage: Record<string, unknown>,
    _microFrontend: unknown,
    microFrontendNode: { context?: NodeContext; viewUrl?: string } | undefined,
  ): void {
    const globalContext = this.luigiCoreService.getGlobalContext();
    const config = parsePersistentPanelConfig(
      customMessage as { id: string },
      microFrontendNode,
      new URL(document.baseURI).origin,
      {
        context: {
          ...globalContext,
          ...this.persistentPanelService.currentNavigationContext(),
          ...microFrontendNode?.context,
        },
        nodeParams: this.currentNodeParams(),
      },
    );
    const target = mergePersistentPanelTargets(
      this.persistentPanelService.currentTarget(),
      persistentPanelTarget(globalContext, microFrontendNode?.context),
    );
    this.persistentPanelService.open(config, target);
  }

  private currentNodeParams(): Record<string, string> {
    const configuredPrefix = this.luigiCoreService.getConfigValue(
      'routing.nodeParamPrefix',
    );
    const prefix =
      configuredPrefix === false ? '' : (configuredPrefix as string) || '~';
    const searchParams: Record<string, string> = this.luigiCoreService
      .routing()
      .getSearchParams();
    return Object.fromEntries(
      Object.entries(searchParams)
        .filter(([key]) => key.startsWith(prefix))
        .map(([key, value]) => [
          key.slice(prefix.length),
          this.sanitizeNodeParam(value),
        ]),
    );
  }

  private sanitizeNodeParam(value: string): string {
    return String(value)
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/\//g, '&sol;');
  }
}
