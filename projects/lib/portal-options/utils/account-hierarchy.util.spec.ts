import { PortalLuigiNode } from '../models/luigi-node';
import {
  calculateAccountHierarchy,
  collectAccountNamesFromHierarchy,
  getInitialAccountId,
} from './account-hierarchy.util';

const createNode = (
  name?: string,
  type = 'Account',
  parent?: PortalLuigiNode,
): PortalLuigiNode =>
  ({
    context: name ? { entity: { metadata: { name }, __typename: type } } : {},
    parent,
  }) as unknown as PortalLuigiNode;

const createEntityNode = (
  accountNameChain: string[],
  defineEntityId?: string,
) => {
  let node: PortalLuigiNode | undefined;

  accountNameChain.forEach((name) => {
    node = createNode(name, 'Account', node);
  });

  const entityNode = node as PortalLuigiNode;

  if (defineEntityId) {
    (entityNode as any).defineEntity = { id: defineEntityId };
  }

  return entityNode;
};

describe('collectAccountNamesFromHierarchy', () => {
  it('returns empty array when node is undefined', () => {
    expect(collectAccountNamesFromHierarchy(undefined)).toEqual([]);
  });

  it('collects account names in ancestor order and skips non-accounts', () => {
    const root = createNode('root');
    const middle = createNode('service', 'Service', root);
    const leaf = createNode('leaf', 'Account', middle);

    expect(collectAccountNamesFromHierarchy(leaf)).toEqual(['root', 'leaf']);
  });
});

describe('getInitialAccountId', () => {
  it('returns entityId when kind is Account', () => {
    expect(getInitialAccountId('id-1', 'Account')).toBe('id-1');
  });

  it('returns undefined when kind is not Account or id missing', () => {
    expect(getInitialAccountId('id-1', 'Project')).toBeUndefined();
    expect(getInitialAccountId(undefined, 'Account')).toBeUndefined();
  });
});

describe('calculateAccountHierarchy', () => {
  it('returns collected hierarchy when no initial account id', () => {
    const entityNode = createEntityNode(['root', 'child']);

    expect(calculateAccountHierarchy(entityNode, 'id-1', 'Project')).toEqual([
      'root',
      'child',
    ]);
  });

  it('replaces last account name when deep level matches length', () => {
    const entityNode = createEntityNode(
      ['root', 'child'],
      'core_platform-mesh_io_account:2',
    );

    expect(
      calculateAccountHierarchy(entityNode, 'account-id', 'Account'),
    ).toEqual(['root', 'account-id']);
  });

  it('appends initial id when hierarchy shorter than deep level', () => {
    const entityNode = createEntityNode(
      ['root', 'child'],
      'core_platform-mesh_io_account:3',
    );

    expect(
      calculateAccountHierarchy(entityNode, 'account-id', 'Account'),
    ).toEqual(['root', 'child', 'account-id']);
  });

  it('appends initial id when entity definition is not account', () => {
    const entityNode = createEntityNode(['root', 'child'], 'other:2');

    expect(
      calculateAccountHierarchy(entityNode, 'account-id', 'Account'),
    ).toEqual(['root', 'child', 'account-id']);
  });
});
