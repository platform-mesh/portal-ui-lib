import { Injectable, inject } from '@angular/core';
import {
  ConfigService,
  HeaderBarConfig,
  HeaderBarConfigService,
} from '@openmfp/portal-ui-lib';
import { NamespaceSelectionRendererService } from './header-bar-renderers/namespace-selection-renderer.service';
import { breadcrumbRenderer } from './header-bar-renderers/breadcrumb-renderer';

@Injectable({
  providedIn: 'root',
})
export class HeaderBarConfigServiceImpl implements HeaderBarConfigService {
  private configService = inject(ConfigService);
  private namespaceSelectionRendererService = inject(NamespaceSelectionRendererService);

  public async getConfig(): Promise<HeaderBarConfig> {
    const portalConfig = await this.configService.getPortalConfig();

    return {
      pendingItemLabel: '...',
      omitRoot: false,
      clearBeforeRender: true,
      autoHide: true,
      leftRenderers: [breadcrumbRenderer],
      rightRenderers: [this.namespaceSelectionRendererService.create(portalConfig)],
    };
  }
}
