import { TestBed } from '@angular/core/testing';
import { PermissionsDefinition } from '@platform-mesh/portal-ui-lib/models';
import {
  InstancePermissionsService,
  ResourceNodeContext,
} from '@platform-mesh/portal-ui-lib/services';
import { Subject, of } from 'rxjs';
import { MockedObject } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { InstancePermissionsStore } from './instance-permissions-store.service';

const makePd = (overrides: Partial<PermissionsDefinition> = {}): PermissionsDefinition => ({
  group: 'core.k8s.io',
  resource: 'clusters',
  entityActions: ['get', 'update', 'delete'],
  resourceActions: ['create'],
  entityContextKey: 'entityName',
  ...overrides,
});

const makeContext = (): ResourceNodeContext =>
  ({
    organization: 'my-org',
    accountPath: '/orgs/my-org',
  }) as any;

describe('InstancePermissionsStore', () => {
  let store: InstancePermissionsStore;
  let mockInstancePermissionsService: MockedObject<InstancePermissionsService>;

  beforeEach(() => {
    mockInstancePermissionsService = mock<InstancePermissionsService>();
    mockInstancePermissionsService.checkInstances.mockReturnValue(of([]));

    TestBed.configureTestingModule({
      providers: [
        InstancePermissionsStore,
        {
          provide: InstancePermissionsService,
          useValue: mockInstancePermissionsService,
        },
      ],
    });

    store = TestBed.inject(InstancePermissionsStore);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('missing()', () => {
    it('returns all instances when the map is empty', () => {
      const instances = [{ name: 'c1' }, { name: 'c2', namespace: 'ns' }];
      expect(store.missing('clusters', instances)).toEqual(instances);
    });

    it('returns only instances not yet in the map', () => {
      // Pre-populate the map by merging one entry
      store.merge([{ resource: 'clusters', name: 'c1', actions: ['get'] }]);
      const instances = [{ name: 'c1' }, { name: 'c2' }];
      expect(store.missing('clusters', instances)).toEqual([{ name: 'c2' }]);
    });

    it('returns empty array when all instances are already cached', () => {
      store.merge([
        { resource: 'clusters', name: 'c1', actions: ['get'] },
        { resource: 'clusters', name: 'c2', namespace: 'ns', actions: ['get'] },
      ]);
      const instances = [{ name: 'c1' }, { name: 'c2', namespace: 'ns' }];
      expect(store.missing('clusters', instances)).toHaveLength(0);
    });

    it('keys by permissionKey so different resources are treated independently', () => {
      // 'pods/c1' and 'clusters/c1' are different keys
      store.merge([{ resource: 'pods', name: 'c1', actions: ['get'] }]);
      const instances = [{ name: 'c1' }];
      // 'clusters/c1' is not in the map, so c1 is still missing for 'clusters'
      expect(store.missing('clusters', instances)).toEqual([{ name: 'c1' }]);
    });
  });

  describe('merge()', () => {
    it('stores an entry keyed by permissionKey(resource/name)', () => {
      store.merge([{ resource: 'clusters', name: 'c1', actions: ['get', 'update'] }]);
      expect(store.actionsFor('clusters', undefined, 'c1')).toEqual(['get', 'update']);
    });

    it('stores an entry keyed by permissionKey(resource/namespace/name)', () => {
      store.merge([{ resource: 'pods', name: 'p1', namespace: 'default', actions: ['get'] }]);
      expect(store.actionsFor('pods', 'default', 'p1')).toEqual(['get']);
    });

    it('overwrites an existing entry on second merge', () => {
      store.merge([{ resource: 'clusters', name: 'c1', actions: ['get'] }]);
      store.merge([{ resource: 'clusters', name: 'c1', actions: ['get', 'delete'] }]);
      expect(store.actionsFor('clusters', undefined, 'c1')).toEqual(['get', 'delete']);
    });

    it('stores multiple entries from a single merge call', () => {
      store.merge([
        { resource: 'clusters', name: 'c1', actions: ['get'] },
        { resource: 'clusters', name: 'c2', namespace: 'ns', actions: ['update'] },
      ]);
      expect(store.actionsFor('clusters', undefined, 'c1')).toEqual(['get']);
      expect(store.actionsFor('clusters', 'ns', 'c2')).toEqual(['update']);
    });

    it('updates the permissions() signal after merge', () => {
      store.merge([{ resource: 'clusters', name: 'c1', actions: ['get'] }]);
      const perms = store.permissions();
      expect(perms['clusters/c1']).toEqual(['get']);
    });
  });

  describe('actionsFor()', () => {
    it('returns empty array when the key is not in the map', () => {
      expect(store.actionsFor('clusters', undefined, 'missing')).toEqual([]);
    });

    it('returns the stored actions when the key exists', () => {
      store.merge([{ resource: 'clusters', name: 'c1', actions: ['get', 'delete'] }]);
      expect(store.actionsFor('clusters', undefined, 'c1')).toEqual(['get', 'delete']);
    });
  });

  describe('reset()', () => {
    it('clears the map', () => {
      store.merge([{ resource: 'clusters', name: 'c1', actions: ['get'] }]);
      store.reset();
      expect(store.actionsFor('clusters', undefined, 'c1')).toEqual([]);
      expect(Object.keys(store.permissions()).length).toBe(0);
    });
  });

  describe('sync()', () => {
    it('calls checkInstances with only the missing instances', () => {
      // Pre-populate 'c1'
      store.merge([{ resource: 'clusters', name: 'c1', actions: ['get'] }]);

      const pd = makePd();
      store.sync(makeContext(), pd, [{ name: 'c1' }, { name: 'c2' }]);

      expect(mockInstancePermissionsService.checkInstances).toHaveBeenCalledWith(
        expect.any(Object),
        pd,
        [{ name: 'c2' }],
      );
    });

    it('does NOT call checkInstances when all instances are already cached', () => {
      store.merge([{ resource: 'clusters', name: 'c1', actions: ['get'] }]);

      store.sync(makeContext(), makePd(), [{ name: 'c1' }]);

      expect(mockInstancePermissionsService.checkInstances).not.toHaveBeenCalled();
    });

    it('merges the response from checkInstances into the map', () => {
      mockInstancePermissionsService.checkInstances.mockReturnValue(
        of([{ resource: 'clusters', name: 'c1', actions: ['get', 'update'] }]),
      );

      store.sync(makeContext(), makePd(), [{ name: 'c1' }]);

      expect(store.actionsFor('clusters', undefined, 'c1')).toEqual(['get', 'update']);
    });

    it('handles a stream that emits multiple times (Subject)', () => {
      const subject = new Subject<any>();
      mockInstancePermissionsService.checkInstances.mockReturnValue(subject.asObservable());

      store.sync(makeContext(), makePd(), [{ name: 'c1' }]);

      subject.next([{ resource: 'clusters', name: 'c1', actions: ['get'] }]);
      expect(store.actionsFor('clusters', undefined, 'c1')).toEqual(['get']);

      subject.next([{ resource: 'clusters', name: 'c1', actions: ['get', 'delete'] }]);
      expect(store.actionsFor('clusters', undefined, 'c1')).toEqual(['get', 'delete']);
    });
  });
});
