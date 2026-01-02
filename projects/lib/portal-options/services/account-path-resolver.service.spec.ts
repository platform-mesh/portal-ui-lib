import { PortalLuigiNode } from '../models/luigi-node';
import { AccountPathResolverService } from './account-path-resolver.service';
import { TestBed } from '@angular/core/testing';

describe('AccountPathResolverService', () => {
  let service: AccountPathResolverService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AccountPathResolverService],
    });
    service = TestBed.inject(AccountPathResolverService);
  });

  it('should return cached accountPath if already exists', () => {
    const node: PortalLuigiNode = {
      context: { accountPath: 'cached:path' },
      parent: undefined,
    } as any;

    const result = service.resolveAccountHierarchy(node);

    expect(result).toBe('cached:path');
  });

  it('should build path from entity metadata, skipping non-Account types', () => {
    const node: PortalLuigiNode = {
      context: {
        entity: { metadata: { name: 'acc3' }, __typename: 'Account' },
      },
      parent: {
        context: {
          entity: { metadata: { name: 'proj1' }, __typename: 'Project' },
        },
        parent: {
          context: {
            entity: { metadata: { name: 'acc2' }, __typename: 'Account' },
          },
          parent: {
            context: {
              entity: { metadata: { name: 'team1' }, __typename: 'Team' },
            },
            parent: {
              context: {
                entity: { metadata: { name: 'acc1' }, __typename: 'Account' },
              },
              parent: undefined,
            },
          },
        },
      },
    } as any;

    const result = service.resolveAccountHierarchy(node);

    expect(result).toBe('acc1:acc2:acc3');
  });

  it('should cache result in node context', () => {
    const node: PortalLuigiNode = {
      context: {
        entity: { metadata: { name: 'acc1' }, __typename: 'Account' },
      },
      parent: undefined,
    } as any;

    service.resolveAccountHierarchy(node);

    expect(node.context.accountPath).toBe('acc1');
  });

  it('should return empty string for node without Account entities', () => {
    const node: PortalLuigiNode = {
      context: {
        entity: { metadata: { name: 'proj1' }, __typename: 'Project' },
      },
      parent: undefined,
    } as any;

    const result = service.resolveAccountHierarchy(node);

    expect(result).toBe('');
  });

  it('should handle node without entity metadata', () => {
    const node: PortalLuigiNode = {
      context: {},
      parent: undefined,
    } as any;

    const result = service.resolveAccountHierarchy(node);

    expect(result).toBe('');
  });

  it('should append entityId when kind is Account', () => {
    const node: PortalLuigiNode = {
      context: {},
      parent: {
        context: {
          entity: { metadata: { name: 'acc1' }, __typename: 'Account' },
        },
        parent: undefined,
      },
    } as any;

    const result = service.resolveAccountHierarchy(node, 'leafAcc', 'Account');

    expect(result).toBe('acc1:leafAcc');
  });

  it('should not append entityId when kind is not Account', () => {
    const node: PortalLuigiNode = {
      context: {},
      parent: {
        context: {
          entity: { metadata: { name: 'acc1' }, __typename: 'Account' },
        },
        parent: undefined,
      },
    } as any;

    const result = service.resolveAccountHierarchy(node, 'proj1', 'Project');

    expect(result).toBe('acc1');
  });

  it('should not append entityId when entityId is not provided', () => {
    const node: PortalLuigiNode = {
      context: {},
      parent: {
        context: {
          entity: { metadata: { name: 'acc1' }, __typename: 'Account' },
        },
        parent: undefined,
      },
    } as any;

    const result = service.resolveAccountHierarchy(node, undefined, 'Account');

    expect(result).toBe('acc1');
  });

  it('should aggregate parent Account entities and append entityId', () => {
    const node: PortalLuigiNode = {
      context: {},
      parent: {
        context: {
          entity: { metadata: { name: 'acc2' }, __typename: 'Account' },
        },
        parent: {
          context: {
            entity: { metadata: { name: 'team1' }, __typename: 'Team' },
          },
          parent: {
            context: {
              entity: { metadata: { name: 'acc1' }, __typename: 'Account' },
            },
            parent: undefined,
          },
        },
      },
    } as any;

    const result = service.resolveAccountHierarchy(node, 'leafAcc', 'Account');

    expect(result).toBe('acc1:acc2:leafAcc');
  });

  it('should handle entity without metadata', () => {
    const node: PortalLuigiNode = {
      context: {
        entity: { __typename: 'Account' },
      },
      parent: undefined,
    } as any;

    const result = service.resolveAccountHierarchy(node);

    expect(result).toBe('');
  });

  it('should handle node with entity on current node and append entityId', () => {
    const node: PortalLuigiNode = {
      context: {
        entity: { metadata: { name: 'acc1' }, __typename: 'Account' },
      },
      parent: undefined,
    } as any;

    const result = service.resolveAccountHierarchy(node, 'acc2', 'Account');

    expect(result).toBe('acc1:acc2');
  });
});
