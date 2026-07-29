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
    const config = parsePersistentPanelConfig(
      customMessage as { id: string },
      microFrontendNode,
      new URL(document.baseURI).origin,
    );
    const target = mergePersistentPanelTargets(
      this.persistentPanelService.currentTarget(),
      persistentPanelTarget(
        this.luigiCoreService.getGlobalContext(),
        microFrontendNode?.context,
      ),
    );
    this.persistentPanelService.open(config, target);
  }
}
