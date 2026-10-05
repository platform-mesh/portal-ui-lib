import type { PortalSetup } from '../portal-setup.ts';

export const platformMeshPortalSetup: PortalSetup = {
  name: 'platform-mesh',
  angularProject: 'platform-mesh',
  port: 4400,
  testDir: 'tests/platform-mesh',
  staticMounts: [
    {
      urlPath: '/',
      directory: 'integration/dist/portals/platform-mesh/browser',
    },
    {
      urlPath: '/assets',
      directory: 'integration/portals/platform-mesh/assets',
    },
    { urlPath: '/assets', directory: 'dist-wc/assets' },
    {
      urlPath: '/assets',
      directory: 'node_modules/@openmfp/portal-ui-lib/assets',
    },
    { urlPath: '/luigi-core', directory: 'node_modules/@luigi-project/core' },
  ],
};
