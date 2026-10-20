import { PortalNodeContext } from '../models/luigi-context';
import { PortalLuigiNode } from '../models/luigi-node';
import { NamespacedResourceSelectionService } from './namespaced-resource-selection.service';
import { TestBed } from '@angular/core/testing';
import { LuigiCoreService } from '@openmfp/portal-ui-lib';

describe('NamespacedResourceSelectionService', () => {
  let service: NamespacedResourceSelectionService;
  let searchParams: Record<string, string>;
  let addSearchParams: ReturnType<typeof vi.fn>;

  const kcpPath = 'root:orgs:org:account';
  const namespacedCtx = {
    resourceDefinition: { scope: 'Namespaced' },
  } as unknown as PortalNodeContext;
  const clusterCtx = {
    resourceDefinition: { scope: 'Cluster' },
  } as unknown as PortalNodeContext;

  const listNode = {
    pathSegment: 'httpbins',
    context: {},
  } as unknown as PortalLuigiNode;
  const resourceNode = {
    pathSegment: ':httpbinId',
    defineEntity: { id: 'httpbin', contextKey: 'httpbinId' },
    context: {},
    parent: listNode,
  } as unknown as PortalLuigiNode;
  const siblingNode = {
    pathSegment: 'yaml',
    context: {},
    parent: resourceNode,
  } as unknown as PortalLuigiNode;

  beforeEach(() => {
    searchParams = {};
    addSearchParams = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        NamespacedResourceSelectionService,
        {
          provide: LuigiCoreService,
          useValue: {
            routing: () => ({
              getSearchParams: () => searchParams,
              addSearchParams,
            }),
          },
        },
      ],
    });

    service = TestBed.inject(NamespacedResourceSelectionService);
  });

  describe('resolveNamespace', () => {
    it('returns the namespace search param for a non-namespaced entity', () => {
      searchParams = { namespace: 'team-a' };

      expect(
        service.resolveNamespace(resourceNode, 'account', kcpPath, clusterCtx),
      ).toBe('team-a');
    });

    it('treats the all-namespaces selection as no namespace', () => {
      searchParams = { namespace: '-all-' };

      expect(
        service.resolveNamespace(resourceNode, 'account', kcpPath, clusterCtx),
      ).toBeUndefined();
    });

    it('returns the namespace search param for a namespaced resource', () => {
      searchParams = { namespace: 'team-a' };

      expect(
        service.resolveNamespace(resourceNode, 'bin-1', kcpPath, namespacedCtx),
      ).toBe('team-a');
    });

    it('keeps the selected namespace when the same resource is resolved again without the search param', () => {
      searchParams = { namespace: 'team-a' };
      service.resolveNamespace(resourceNode, 'bin-1', kcpPath, namespacedCtx);
      searchParams = {};

      expect(
        service.resolveNamespace(resourceNode, 'bin-1', kcpPath, namespacedCtx),
      ).toBe('team-a');
    });

    it('keeps the selected namespace when the search param is the all-namespaces selection', () => {
      searchParams = { namespace: 'team-a' };
      service.resolveNamespace(resourceNode, 'bin-1', kcpPath, namespacedCtx);
      searchParams = { namespace: '-all-' };

      expect(
        service.resolveNamespace(resourceNode, 'bin-1', kcpPath, namespacedCtx),
      ).toBe('team-a');
    });

    it('prefers a different namespace from the search param over the selected one', () => {
      searchParams = { namespace: 'team-a' };
      service.resolveNamespace(resourceNode, 'bin-1', kcpPath, namespacedCtx);
      searchParams = { namespace: 'team-b' };

      expect(
        service.resolveNamespace(resourceNode, 'bin-1', kcpPath, namespacedCtx),
      ).toBe('team-b');
    });

    it('does not reuse the selected namespace for another resource', () => {
      searchParams = { namespace: 'team-a' };
      service.resolveNamespace(resourceNode, 'bin-1', kcpPath, namespacedCtx);
      searchParams = {};

      expect(
        service.resolveNamespace(resourceNode, 'bin-2', kcpPath, namespacedCtx),
      ).toBeUndefined();
    });

    it('does not reuse the selected namespace for the same resource in another account', () => {
      searchParams = { namespace: 'team-a' };
      service.resolveNamespace(resourceNode, 'bin-1', kcpPath, namespacedCtx);
      searchParams = {};

      expect(
        service.resolveNamespace(
          resourceNode,
          'bin-1',
          'root:orgs:org:other',
          namespacedCtx,
        ),
      ).toBeUndefined();
    });
  });

  describe('restoreNamespaceSearchParam', () => {
    const resourceCtx = { httpbinId: 'bin-1' } as any;

    beforeEach(() => {
      searchParams = { namespace: 'team-a' };
      service.resolveNamespace(resourceNode, 'bin-1', kcpPath, namespacedCtx);
    });

    it('adds the selected namespace to the url without a history entry and without a Luigi config update', () => {
      searchParams = {};

      service.restoreNamespaceSearchParam(siblingNode, resourceCtx);

      expect(addSearchParams).toHaveBeenCalledWith(
        { namespace: 'team-a' },
        false,
        true,
      );
    });

    it('replaces the all-namespaces selection with the selected namespace', () => {
      searchParams = { namespace: '-all-' };

      service.restoreNamespaceSearchParam(siblingNode, resourceCtx);

      expect(addSearchParams).toHaveBeenCalledWith(
        { namespace: 'team-a' },
        false,
        true,
      );
    });

    it('does not touch the url when it already carries a namespace', () => {
      service.restoreNamespaceSearchParam(siblingNode, resourceCtx);

      expect(addSearchParams).not.toHaveBeenCalled();
    });

    it('does not restore the namespace for another resource of the same type', () => {
      searchParams = {};

      service.restoreNamespaceSearchParam(siblingNode, {
        httpbinId: 'bin-2',
      } as any);

      expect(addSearchParams).not.toHaveBeenCalled();
    });

    it('forgets the selection after navigating outside of the selected resource', () => {
      searchParams = {};

      service.restoreNamespaceSearchParam(listNode, {} as any);
      service.restoreNamespaceSearchParam(siblingNode, resourceCtx);

      expect(addSearchParams).not.toHaveBeenCalled();
      expect(
        service.resolveNamespace(resourceNode, 'bin-1', kcpPath, namespacedCtx),
      ).toBeUndefined();
    });

    it('does nothing when no namespaced resource is selected', () => {
      searchParams = {};
      service.resolveNamespace(resourceNode, 'bin-2', kcpPath, namespacedCtx);

      service.restoreNamespaceSearchParam(siblingNode, resourceCtx);

      expect(addSearchParams).not.toHaveBeenCalled();
    });
  });
});
