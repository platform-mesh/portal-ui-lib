import { EnvironmentProviders } from '@angular/core';
import { PortalOptions, providePortal } from '@openmfp/portal-ui-lib';
import { CustomGlobalNodesServiceImpl } from './services/custom-global-nodes.service';
import { LuigiExtendedGlobalContextConfigServiceImpl } from './services/luigi-extended-global-context-config.service';
import { NodeChangeHookConfigServiceImpl } from './services/node-change-hook-config.service';
import { NodeContextProcessingServiceImpl } from './services/node-context-processing.service';

const defaultPoralOptions: PortalOptions = {
  nodeChangeHookConfigService: NodeChangeHookConfigServiceImpl,
  customGlobalNodesService: CustomGlobalNodesServiceImpl,
  nodeContextProcessingService: NodeContextProcessingServiceImpl,
  luigiExtendedGlobalContextConfigService:
    LuigiExtendedGlobalContextConfigServiceImpl,
};

export const providePortalUi = (
  options: PortalOptions
): EnvironmentProviders => {
  return providePortal({ ...defaultPoralOptions, ...options });
};
