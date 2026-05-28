import { CardConfig, SectionConfig } from '@openmfp/ngx';

export interface DashboardConfigKeyParams {
  workspacePath: string;
  entity: string | undefined;
  resourceId: string | undefined;
  userId: string | undefined;
  seed?: string;
}

export interface DashboardConfigData {
  cards: CardConfig[];
  sections: SectionConfig[];
}

export const calculateDashboardConfigKey = (
  params: DashboardConfigKeyParams,
): string =>
  `pm.workspace:${params.workspacePath}.resourceType:${params.entity}.resourceId:${params.resourceId}.user:${params.userId}` +
  (params.seed ? `.seed:${params.seed}` : '');

export const writeConfig = (
  params: DashboardConfigKeyParams,
  config: DashboardConfigData,
): void => {
  localStorage.setItem(
    calculateDashboardConfigKey(params),
    JSON.stringify(config),
  );
};

export const readConfig = (
  params: DashboardConfigKeyParams,
): DashboardConfigData | null => {
  const raw = localStorage.getItem(calculateDashboardConfigKey(params));
  if (!raw) return null;
  return JSON.parse(raw) as DashboardConfigData;
};
