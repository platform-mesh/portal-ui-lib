import { PortalLuigiNode } from '../models/luigi-node';
import {
  calculateAccountHierarchy,
  collectAccountNamesFromNodeHierarchy,
  getInitialAccountId,
} from './account-hierarchy.util';
import { describe, expect, it } from 'vitest';

const createNode = (
  name?: string,
  type = 'Account',
  parent?: PortalLuigiNode,
): PortalLuigiNode =>
  ({
    context: name ? { entityName: name, entityKind: type } : {},
    parent,
  }) as unknown as PortalLuigiNode;

const createEntityNode = (
  accountNameChain: string[],
  defineEntityId?: string,
  defineEntityContextKey?: string,
) => {
  let node: PortalLuigiNode | undefined;

  accountNameChain.forEach((name) => {
    node = createNode(name, 'Account', node);
  });

  const entityNode = node as PortalLuigiNode;

  if (defineEntityId || defineEntityContextKey) {
    (entityNode as any).defineEntity = {
      ...(defineEntityId ? { id: defineEntityId } : {}),
      ...(defineEntityContextKey
        ? { contextKey: defineEntityContextKey }
        : {}),
    };
  }

  return entityNode;
};

describe('collectAccountNamesFromHierarchy', () => {
  it('returns empty array when node is undefined', () => {
    expect(collectAccountNamesFromNodeHierarchy(undefined)).toEqual([]);
  });

  it('collects account names in ancestor order and skips non-accounts', () => {
    const root = createNode('root');
    const middle = createNode('service', 'Service', root);
    const leaf = createNode('leaf', 'Account', middle);

    expect(collectAccountNamesFromNodeHierarchy(leaf)).toEqual([
      'root',
      'leaf',
    ]);
  });

  it('returns empty array for a node without context', () => {
    const node = { parent: undefined } as unknown as PortalLuigiNode;
    expect(collectAccountNamesFromNodeHierarchy(node)).toEqual([]);
  });

  it('matches entityKind case-insensitively', () => {
    const node = {
      context: { entityName: 'foo', entityKind: 'ACCOUNT' },
    } as unknown as PortalLuigiNode;

    expect(collectAccountNamesFromNodeHierarchy(node)).toEqual(['foo']);
  });

  it('skips ancestors that have entityName but no entityKind', () => {
    const root = {
      context: { entityName: 'rootless' },
    } as unknown as PortalLuigiNode;
    const leaf = createNode('leaf', 'Account', root);

    expect(collectAccountNamesFromNodeHierarchy(leaf)).toEqual(['leaf']);
  });
});

describe('getInitialAccountId', () => {
  it('returns the entityId when kind is account (any casing)', () => {
    expect(getInitialAccountId('id-1', 'Account')).toBe('id-1');
    expect(getInitialAccountId('id-1', 'account')).toBe('id-1');
    expect(getInitialAccountId('id-1', 'ACCOUNT')).toBe('id-1');
  });

  it('returns undefined when kind is not account', () => {
    expect(getInitialAccountId('id-1', 'Project')).toBeUndefined();
  });

  it('returns undefined when entityId is missing even if kind is account', () => {
    expect(getInitialAccountId(undefined, 'Account')).toBeUndefined();
    expect(getInitialAccountId('', 'Account')).toBeUndefined();
  });

  it('returns undefined when both arguments are missing', () => {
    expect(getInitialAccountId()).toBeUndefined();
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

  it('resets entityName/entityKind on the entity node when defineEntity.contextKey + account id are set', () => {
    const entityNode = createEntityNode(
      ['root', 'child'],
      'core_platform-mesh_io_account:3',
      'accountId',
    );

    // sanity: the leaf was seeded with entityName='child', entityKind='Account'
    expect(entityNode.context.entityName).toBe('child');
    expect(entityNode.context.entityKind).toBe('Account');

    const result = calculateAccountHierarchy(
      entityNode,
      'new-account-id',
      'Account',
    );

    // The leaf's own entityName/entityKind get wiped before collection,
    // so the collected hierarchy excludes the leaf and we only re-add the new id.
    expect(result).toEqual(['root', 'new-account-id']);
    expect(entityNode.context.entityName).toBeUndefined();
    expect(entityNode.context.entityKind).toBeUndefined();
  });

  it('does NOT reset context when defineEntity.contextKey is set but kind is not account', () => {
    const entityNode = createEntityNode(['root', 'child'], 'x:1', 'accountId');
    expect(entityNode.context.entityName).toBe('child');

    calculateAccountHierarchy(entityNode, 'some-id', 'Project');

    expect(entityNode.context.entityName).toBe('child');
    expect(entityNode.context.entityKind).toBe('Account');
  });

  it('does NOT reset context when contextKey is missing even if kind is account', () => {
    const entityNode = createEntityNode(['root', 'child'], 'x:1');
    expect(entityNode.context.entityName).toBe('child');

    const result = calculateAccountHierarchy(
      entityNode,
      'new-account-id',
      'Account',
    );

    // contextKey missing → context untouched, so the leaf is still included
    // in the collected hierarchy alongside the appended initial id.
    expect(result).toEqual(['root', 'child', 'new-account-id']);
    expect(entityNode.context.entityName).toBe('child');
    expect(entityNode.context.entityKind).toBe('Account');
  });

  it('does not append a duplicate when initialAccountId is missing', () => {
    const entityNode = createEntityNode(['root']);

    expect(calculateAccountHierarchy(entityNode)).toEqual(['root']);
  });
});
