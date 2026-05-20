import { calculateDashboardConfigKey } from './dashboard-config-key';

describe('calculateDashboardConfigKey', () => {
  it('builds key with all parts', () => {
    expect(calculateDashboardConfigKey('root:orgs:myorg', 'Account', 'res-456', 'user-123')).toBe(
      'pm.workspace:root:orgs:myorg.resourceType:Account.resourceId:res-456.user:user-123',
    );
  });

  it('builds key with undefined entity', () => {
    expect(calculateDashboardConfigKey('root:orgs:myorg', undefined, 'res-456', 'user-123')).toBe(
      'pm.workspace:root:orgs:myorg.resourceType:undefined.resourceId:res-456.user:user-123',
    );
  });

  it('builds key with empty workspacePath', () => {
    expect(calculateDashboardConfigKey('', 'Account', 'res-456', 'user-123')).toBe(
      'pm.workspace:.resourceType:Account.resourceId:res-456.user:user-123',
    );
  });

  it('builds key with empty userId', () => {
    expect(calculateDashboardConfigKey('root:orgs:myorg', 'Account', 'res-456', '')).toBe(
      'pm.workspace:root:orgs:myorg.resourceType:Account.resourceId:res-456.user:',
    );
  });
});
