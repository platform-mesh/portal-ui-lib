import {
  DashboardConfigKeyParams,
  calculateDashboardConfigKey,
  readConfig,
  writeConfig,
} from './dashboard-config';

const params: DashboardConfigKeyParams = {
  workspacePath: 'root:orgs:myorg',
  entity: 'Account',
  resourceId: 'res-456',
  userId: 'user-123',
};

const expectedKey =
  'pm.workspace:root:orgs:myorg.resourceType:Account.resourceId:res-456.user:user-123';

describe('calculateDashboardConfigKey', () => {
  it('builds key with all parts', () => {
    expect(calculateDashboardConfigKey(params)).toBe(expectedKey);
  });

  it('builds key with undefined entity', () => {
    expect(calculateDashboardConfigKey({ ...params, entity: undefined })).toBe(
      'pm.workspace:root:orgs:myorg.resourceType:undefined.resourceId:res-456.user:user-123',
    );
  });

  it('builds key with undefined resourceId', () => {
    expect(
      calculateDashboardConfigKey({ ...params, resourceId: undefined }),
    ).toBe(
      'pm.workspace:root:orgs:myorg.resourceType:Account.resourceId:undefined.user:user-123',
    );
  });

  it('builds key with empty workspacePath', () => {
    expect(calculateDashboardConfigKey({ ...params, workspacePath: '' })).toBe(
      'pm.workspace:.resourceType:Account.resourceId:res-456.user:user-123',
    );
  });

  it('builds key with empty userId', () => {
    expect(calculateDashboardConfigKey({ ...params, userId: '' })).toBe(
      'pm.workspace:root:orgs:myorg.resourceType:Account.resourceId:res-456.user:',
    );
  });
});

describe('writeConfig', () => {
  beforeEach(() => localStorage.clear());

  it('stores serialized config under the calculated key', () => {
    const config = { cards: [], sections: [] };
    writeConfig(params, config);
    expect(localStorage.getItem(expectedKey)).toBe(JSON.stringify(config));
  });

  it('overwrites existing config', () => {
    writeConfig(params, { cards: [], sections: [] });
    const updated = { cards: [{ id: 'c1' } as any], sections: [] };
    writeConfig(params, updated);
    expect(localStorage.getItem(expectedKey)).toBe(JSON.stringify(updated));
  });
});

describe('readConfig', () => {
  beforeEach(() => localStorage.clear());

  it('returns parsed config when key exists', () => {
    const config = { cards: [], sections: [] };
    localStorage.setItem(expectedKey, JSON.stringify(config));
    expect(readConfig(params)).toEqual(config);
  });

  it('returns null when key does not exist', () => {
    expect(readConfig(params)).toBeNull();
  });
});
