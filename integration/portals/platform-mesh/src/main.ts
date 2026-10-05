import { StaticSettingsConfigServiceImpl } from './app/static-settings-config.service';
import { provideZonelessChangeDetection } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import {
  PortalComponent,
  PortalOptions,
  providePortal,
} from '@openmfp/portal-ui-lib';
import {
  CustomGlobalNodesServiceImpl,
  CustomRoutingConfigServiceImpl,
  HeaderBarConfigServiceImpl,
  LuigiExtendedGlobalContextConfigServiceImpl,
  NavigationRedirectStrategyServiceImpl,
  NodeChangeHookConfigServiceImpl,
  NodeContextProcessingServiceImpl,
  OpenPersistentPanelListener,
  UserProfileConfigServiceImpl,
} from '@platform-mesh/portal-ui-lib/portal-options';

const portalOptions: PortalOptions = {
  staticSettingsConfigService: StaticSettingsConfigServiceImpl,
  nodeChangeHookConfigService: NodeChangeHookConfigServiceImpl,
  customMessageListeners: [OpenPersistentPanelListener],
  customGlobalNodesService: CustomGlobalNodesServiceImpl,
  nodeContextProcessingService: NodeContextProcessingServiceImpl,
  luigiExtendedGlobalContextConfigService:
    LuigiExtendedGlobalContextConfigServiceImpl,
  headerBarConfigService: HeaderBarConfigServiceImpl,
  userProfileConfigService: UserProfileConfigServiceImpl,
  routingConfigService: CustomRoutingConfigServiceImpl,
  navigationRedirectStrategy: NavigationRedirectStrategyServiceImpl,
};

bootstrapApplication(PortalComponent, {
  providers: [providePortal(portalOptions), provideZonelessChangeDetection()],
}).catch((err) => console.error(err));
