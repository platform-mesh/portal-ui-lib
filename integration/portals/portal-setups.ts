import { platformMeshPortalSetup } from './platform-mesh/portal-setup.ts';
import type { PortalSetup } from './portal-setup.ts';

export const portalSetups: PortalSetup[] = [platformMeshPortalSetup];

export function findPortalSetup(name: string): PortalSetup {
  const setup = portalSetups.find((candidate) => candidate.name === name);
  if (!setup) {
    const known = portalSetups.map((candidate) => candidate.name).join(', ');
    throw new Error(`Unknown portal setup "${name}". Known setups: ${known}`);
  }
  return setup;
}
