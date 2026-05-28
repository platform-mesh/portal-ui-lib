import {
  DashboardConfigData,
  DashboardConfigKeyParams,
  readConfig,
  writeConfig,
} from '../../../utils/dashboard-config';
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class DashboardConfigService {
  read(params: DashboardConfigKeyParams): DashboardConfigData | null {
    return readConfig(params);
  }

  write(params: DashboardConfigKeyParams, config: DashboardConfigData): void {
    writeConfig(params, config);
  }
}
