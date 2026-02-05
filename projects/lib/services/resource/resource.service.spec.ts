import { ApolloFactory } from './apollo-factory';
import { ResourceService } from './resource.service';
import { TestBed } from '@angular/core/testing';
import { LuigiCoreService } from '@openmfp/portal-ui-lib';
import { Subject, firstValueFrom, lastValueFrom, of, throwError } from 'rxjs';
import { MockedObject } from 'vitest';
import { mock } from 'vitest-mock-extended';

describe('ResourceService', () => {
  let service: ResourceService;
  let mockApollo: any;
  let mockApolloFactory: any;
  let mockLuigiCoreService: MockedObject<LuigiCoreService>;

  const resourceDefinition: any = {
    group: 'core.k8s.io',
    kind: 'TestKind',
    version: 'v1',
    scope: 'Namespaced',
    namespace: 'default',
    plural: 'testkinds',
  };

  const unversionedResourceDefinition: any = {
    ...resourceDefinition,
    version: undefined,
  };

  const grouplessResourceDefinition: any = {
    ...resourceDefinition,
    group: undefined,
  };

  const grouplessUnversionedResourceDefinition: any = {
    ...resourceDefinition,
    group: undefined,
    version: undefined,
  };

  const namespacedNodeContext: any = {
    cluster: 'test',
    namespaceId: 'test-namespace',
    resourceDefinition: {
      group: 'core.k8s.io',
      kind: 'TestKind',
      version: 'v1',
      scope: 'Namespaced',
      namespace: 'default',
      plural: 'testkinds',
    },
  };

  const unversionedNamespacedNodeContext: any = {
    ...namespacedNodeContext,
    resourceDefinition: {
      ...namespacedNodeContext.resourceDefinition,
      version: undefined,
    },
  };

  const grouplessNamespacedNodeContext: any = {
    ...namespacedNodeContext,
    resourceDefinition: {
      ...namespacedNodeContext.resourceDefinition,
      group: undefined,
    },
  };

  const grouplessUnversionedNamespacedNodeContext: any = {
    ...namespacedNodeContext,
    resourceDefinition: {
      ...namespacedNodeContext.resourceDefinition,
      group: undefined,
      version: undefined,
    },
  };

  const clusterScopeNodeContext: any = {
    namespaceId: 'test-namespace',
    resourceDefinition: {
      group: 'core.k8s.io',
      kind: 'TestKind',
      version: 'v1',
      scope: 'Cluster',
      namespace: 'default',
      plural: 'testkinds',
    },
  };

  const unversionedClusterScopeNodeContext: any = {
    ...clusterScopeNodeContext,
    resourceDefinition: {
      ...clusterScopeNodeContext.resourceDefinition,
      version: undefined,
    },
  };

  const grouplessClusterScopeNodeContext: any = {
    ...clusterScopeNodeContext,
    resourceDefinition: {
      ...clusterScopeNodeContext.resourceDefinition,
      group: undefined,
    },
  };

  const grouplessUnversionedClusterScopeNodeContext: any = {
    ...clusterScopeNodeContext,
    resourceDefinition: {
      ...clusterScopeNodeContext.resourceDefinition,
      group: undefined,
      version: undefined,
    },
  };

  const resource: any = { metadata: { name: 'test-name' } };

  beforeEach(() => {
    mockLuigiCoreService = mock();
    mockApollo = {
      query: vi.fn(),
      subscribe: vi.fn(),
      mutate: vi.fn(),
    };

    mockApolloFactory = {
      apollo: vi.fn().mockReturnValue(mockApollo),
    };

    TestBed.configureTestingModule({
      providers: [
        ResourceService,
        { provide: ApolloFactory, useValue: mockApolloFactory },
        { provide: LuigiCoreService, useValue: mockLuigiCoreService },
      ],
    });

    service = TestBed.inject(ResourceService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('read', () => {
    it('should catch gql parsing error and complete the observable', async () => {
      const invalidQuery =
        `query { core_k8s_io { TestKind(name: "test-name") {` as unknown as any;

      service['luigiCoreService'].showAlert = vi.fn();

      await new Promise<void>((resolve, reject) => {
        service
          .read(
            'test-name',
            { kind: 'TestKind', version: 'v1', group: 'core_k8s_io' },
            invalidQuery,
            namespacedNodeContext,
          )
          .subscribe({
            complete: () => {
              expect(mockLuigiCoreService.showAlert).toHaveBeenCalledWith({
                text: expect.any(String),
                type: 'error',
              });
              resolve();
            },
            error: reject,
          });
      });
    });

    it('should read resource using fields', async () => {
      mockApollo.query.mockReturnValue(
        of({
          data: { core_k8s_io: { v1: { TestKind: { name: 'test' } } } },
        }),
      );

      const res = await firstValueFrom(
        service.read(
          'test-name',
          { kind: 'TestKind', version: 'v1', group: 'core_k8s_io' },
          ['name'],
          namespacedNodeContext,
        ),
      );
      expect(res).toEqual({ name: 'test' });
      expect(mockApollo.query).toHaveBeenCalledWith({
        query: expect.anything(),
        variables: {
          name: 'test-name',
          namespace: 'test-namespace',
        },
      });
    });

    it('should read resource using fields with namespaced scope', async () => {
      mockApollo.query.mockReturnValue(
        of({
          data: { core_k8s_io: { v1: { TestKind: { name: 'test' } } } },
        }),
      );

      const res = await firstValueFrom(
        service.read(
          'test-name',
          { kind: 'TestKind', version: 'v1', group: 'core_k8s_io' },
          ['name'],
          namespacedNodeContext,
        ),
      );
      expect(res).toEqual({ name: 'test' });
      expect(mockApollo.query).toHaveBeenCalledWith({
        query: expect.anything(),
        variables: {
          name: 'test-name',
          namespace: namespacedNodeContext.namespaceId,
        },
      });
    });

    it('should read resource using fields with cluster scope', async () => {
      mockApollo.query.mockReturnValue(
        of({
          data: { core_k8s_io: { v1: { TestKind: { name: 'test' } } } },
        }),
      );

      const res = await firstValueFrom(
        service.read(
          'test-name',
          { kind: 'TestKind', version: 'v1', group: 'core_k8s_io' },
          ['name'],
          clusterScopeNodeContext,
        ),
      );
      expect(res).toEqual({ name: 'test' });
      expect(mockApollo.query).toHaveBeenCalledWith({
        query: expect.anything(),
        variables: {
          name: 'test-name',
        },
      });
    });

    it('should read resource using raw query, namespaced scope', async () => {
      const rawQuery = `query { core_k8s_io { TestKind(name: "test-name") { name } } }`;
      mockApollo.query.mockReturnValue(
        of({
          data: { core_k8s_io: { v1: { TestKind: { name: 'test' } } } },
        }),
      );

      const res = await firstValueFrom(
        service.read(
          'test-name',
          { kind: 'TestKind', version: 'v1', group: 'core_k8s_io' },
          rawQuery,
          namespacedNodeContext,
        ),
      );
      expect(res).toEqual({ name: 'test' });
      expect(mockApollo.query).toHaveBeenCalledWith({
        query: expect.anything(),
        variables: {
          name: 'test-name',
          namespace: 'test-namespace',
        },
      });
    });

    it('should read resource using raw query, cluster scope', async () => {
      const rawQuery = `query { core_k8s_io { TestKind(name: "test") { name } } }`;
      mockApollo.query.mockReturnValue(
        of({
          data: { core_k8s_io: { v1: { TestKind: { name: 'test' } } } },
        }),
      );

      const res = await firstValueFrom(
        service.read(
          'test',
          { kind: 'TestKind', version: 'v1', group: 'core_k8s_io' },
          rawQuery,
          clusterScopeNodeContext,
        ),
      );
      expect(res).toEqual({ name: 'test' });
      expect(mockApollo.query).toHaveBeenCalledWith({
        query: expect.anything(),
        variables: {
          name: 'test',
        },
      });
    });

    it('should read resource using raw query with namespace', async () => {
      const rawQuery = `query { core_k8s_io { TestKind(name: "test-name", namespace: "test-namespace") { name } } }`;
      mockApollo.query.mockReturnValue(
        of({
          data: { core_k8s_io: { v1: { TestKind: { name: 'test' } } } },
        }),
      );

      const res = await firstValueFrom(
        service.read(
          'test-name',
          { kind: 'TestKind', version: 'v1', group: 'core_k8s_io' },
          rawQuery,
          namespacedNodeContext,
        ),
      );
      expect(res).toEqual({ name: 'test' });
      expect(mockApollo.query).toHaveBeenCalledWith({
        query: expect.anything(),
        variables: {
          name: 'test-name',
          namespace: namespacedNodeContext.namespaceId,
        },
      });
    });
  });

  describe('list', () => {
    it('should throw error when resourceDefinition is missing', async () => {
      const contextWithoutDefinition: any = {
        cluster: 'test',
        namespaceId: 'test-namespace',
      };

      await expect(
        firstValueFrom(
          service.list('myList', ['name'], contextWithoutDefinition),
        ),
      ).rejects.toThrow('Resource definition is required');
    });

    it('should throw when list query wrappers are empty', () => {
      const invalidContext: any = {
        ...namespacedNodeContext,
        resourceDefinition: {
          ...namespacedNodeContext.resourceDefinition,
          group: undefined,
          version: undefined,
          plural: '',
        },
      };

      expect(() => service.list('myList', ['name'], invalidContext)).toThrow(
        'At least one wrapper or inner fields is required',
      );
    });

    it('should throw error when initialListQuery returns empty result', async () => {
      mockApollo.query.mockReturnValue(
        of({
          data: {
            core_k8s_io: {},
          },
        }),
      );

      await expect(
        firstValueFrom(service.list('myList', ['name'], namespacedNodeContext)),
      ).rejects.toThrow('Resource list result not found');
    });

    it('should return initial items from query via startWith', async () => {
      mockApollo.query.mockReturnValue(
        of({
          data: {
            core_k8s_io: {
              v1: {
                Testkinds: {
                  resourceVersion: '123',
                  items: [
                    { name: 'res1', metadata: { uid: 'uid1' } },
                    { name: 'res2', metadata: { uid: 'uid2' } },
                  ],
                },
              },
            },
          },
        }),
      );
      const subject = new Subject();
      mockApollo.subscribe.mockReturnValue(subject.asObservable());

      const res = await firstValueFrom(
        service.list('myList', ['name'], namespacedNodeContext),
      );
      expect(res).toEqual([
        { name: 'res1', metadata: { uid: 'uid1' } },
        { name: 'res2', metadata: { uid: 'uid2' } },
      ]);
    });

    it('should list namespaced resources', async () => {
      mockApollo.query.mockReturnValue(
        of({
          data: {
            core_k8s_io: {
              v1: {
                Testkinds: {
                  resourceVersion: '123',
                  items: [{ name: 'res1', metadata: { uid: 'uid1' } }],
                },
              },
            },
          },
        }),
      );
      mockApollo.subscribe.mockReturnValue(
        of({
          data: {
            mylist: {
              type: 'ADDED',
              object: { name: 'res2', metadata: { uid: 'uid2' } },
            },
          },
        }),
      );
      await firstValueFrom(
        service.list('mylist', ['name'], namespacedNodeContext),
      );
      expect(mockApollo.query).toHaveBeenCalled();
      expect(mockApollo.subscribe).toHaveBeenCalledWith({
        query: expect.anything(),
        variables: {
          namespace: namespacedNodeContext.namespaceId,
          resourceVersion: '123',
        },
      });
    });

    it('should list namespaced resources without version', async () => {
      mockApollo.query.mockReturnValue(
        of({
          data: {
            core_k8s_io: {
              Testkinds: {
                resourceVersion: '123',
                items: [{ name: 'res1', metadata: { uid: 'uid1' } }],
              },
            },
          },
        }),
      );
      mockApollo.subscribe.mockReturnValue(
        of({
          data: {
            myList: {
              type: 'ADDED',
              object: { name: 'res2', metadata: { uid: 'uid2' } },
            },
          },
        }),
      );
      await firstValueFrom(
        service.list('myList', ['name'], unversionedNamespacedNodeContext),
      );
      expect(mockApollo.query).toHaveBeenCalled();
      expect(mockApollo.subscribe).toHaveBeenCalledWith({
        query: expect.anything(),
        variables: {
          namespace: unversionedNamespacedNodeContext.namespaceId,
          resourceVersion: '123',
        },
      });
    });

    it('should list namespaced resources without group', async () => {
      mockApollo.query.mockReturnValue(
        of({
          data: {
            v1: {
              Testkinds: {
                resourceVersion: '123',
                items: [{ name: 'res1', metadata: { uid: 'uid1' } }],
              },
            },
          },
        }),
      );
      mockApollo.subscribe.mockReturnValue(
        of({
          data: {
            myList: {
              type: 'ADDED',
              object: { name: 'res2', metadata: { uid: 'uid2' } },
            },
          },
        }),
      );
      await firstValueFrom(
        service.list('myList', ['name'], grouplessNamespacedNodeContext),
      );
      expect(mockApollo.query).toHaveBeenCalled();
      expect(mockApollo.subscribe).toHaveBeenCalledWith({
        query: expect.anything(),
        variables: {
          namespace: grouplessNamespacedNodeContext.namespaceId,
          resourceVersion: '123',
        },
      });
    });

    it('should list namespaced resources without group and version', async () => {
      mockApollo.query.mockReturnValue(
        of({
          data: {
            Testkinds: {
              resourceVersion: '123',
              items: [{ name: 'res1', metadata: { uid: 'uid1' } }],
            },
          },
        }),
      );
      mockApollo.subscribe.mockReturnValue(
        of({
          data: {
            myList: {
              type: 'ADDED',
              object: { name: 'res2', metadata: { uid: 'uid2' } },
            },
          },
        }),
      );
      await firstValueFrom(
        service.list(
          'myList',
          ['name'],
          grouplessUnversionedNamespacedNodeContext,
        ),
      );
      expect(mockApollo.query).toHaveBeenCalled();
      expect(mockApollo.subscribe).toHaveBeenCalledWith({
        query: expect.anything(),
        variables: {
          namespace: grouplessUnversionedNamespacedNodeContext.namespaceId,
          resourceVersion: '123',
        },
      });
    });

    it('should list cluster resources', async () => {
      mockApollo.query.mockReturnValue(
        of({
          data: {
            core_k8s_io: {
              v1: {
                Testkinds: {
                  resourceVersion: '123',
                  items: [{ name: 'res1', metadata: { uid: 'uid1' } }],
                },
              },
            },
          },
        }),
      );
      mockApollo.subscribe.mockReturnValue(
        of({
          data: {
            myList: {
              type: 'ADDED',
              object: { name: 'res2', metadata: { uid: 'uid2' } },
            },
          },
        }),
      );
      await firstValueFrom(
        service.list('myList', ['name'], clusterScopeNodeContext),
      );
      expect(mockApollo.query).toHaveBeenCalled();
      expect(mockApollo.subscribe).toHaveBeenCalledWith({
        query: expect.anything(),
        variables: { resourceVersion: '123' },
      });
    });

    it('should list cluster resources without version', async () => {
      mockApollo.query.mockReturnValue(
        of({
          data: {
            core_k8s_io: {
              Testkinds: {
                resourceVersion: '123',
                items: [{ name: 'res1', metadata: { uid: 'uid1' } }],
              },
            },
          },
        }),
      );
      mockApollo.subscribe.mockReturnValue(
        of({
          data: {
            myList: {
              type: 'ADDED',
              object: { name: 'res2', metadata: { uid: 'uid2' } },
            },
          },
        }),
      );
      await firstValueFrom(
        service.list('myList', ['name'], unversionedClusterScopeNodeContext),
      );
      expect(mockApollo.query).toHaveBeenCalled();
      expect(mockApollo.subscribe).toHaveBeenCalledWith({
        query: expect.anything(),
        variables: { resourceVersion: '123' },
      });
    });

    it('should list cluster resources without group', async () => {
      mockApollo.query.mockReturnValue(
        of({
          data: {
            v1: {
              Testkinds: {
                resourceVersion: '123',
                items: [{ name: 'res1', metadata: { uid: 'uid1' } }],
              },
            },
          },
        }),
      );
      mockApollo.subscribe.mockReturnValue(
        of({
          data: {
            myList: {
              type: 'ADDED',
              object: { name: 'res2', metadata: { uid: 'uid2' } },
            },
          },
        }),
      );
      await firstValueFrom(
        service.list('myList', ['name'], grouplessClusterScopeNodeContext),
      );
      expect(mockApollo.query).toHaveBeenCalled();
      expect(mockApollo.subscribe).toHaveBeenCalledWith({
        query: expect.anything(),
        variables: { resourceVersion: '123' },
      });
    });

    it('should list cluster resources without group and version', async () => {
      mockApollo.query.mockReturnValue(
        of({
          data: {
            Testkinds: {
              resourceVersion: '123',
              items: [{ name: 'res1', metadata: { uid: 'uid1' } }],
            },
          },
        }),
      );
      mockApollo.subscribe.mockReturnValue(
        of({
          data: {
            myList: {
              type: 'ADDED',
              object: { name: 'res2', metadata: { uid: 'uid2' } },
            },
          },
        }),
      );
      await firstValueFrom(
        service.list(
          'myList',
          ['name'],
          grouplessUnversionedClusterScopeNodeContext,
        ),
      );
      expect(mockApollo.query).toHaveBeenCalled();
      expect(mockApollo.subscribe).toHaveBeenCalledWith({
        query: expect.anything(),
        variables: { resourceVersion: '123' },
      });
    });

    it('should list resources with namespace', async () => {
      mockApollo.query.mockReturnValue(
        of({
          data: {
            core_k8s_io: {
              v1: {
                Testkinds: {
                  resourceVersion: '123',
                  items: [{ name: 'res1', metadata: { uid: 'uid1' } }],
                },
              },
            },
          },
        }),
      );
      mockApollo.subscribe.mockReturnValue(
        of({
          data: {
            myList: {
              type: 'ADDED',
              object: { name: 'res2', metadata: { uid: 'uid2' } },
            },
          },
        }),
      );

      await firstValueFrom(
        service.list('myList', ['name'], namespacedNodeContext),
      );
      expect(mockApollo.query).toHaveBeenCalled();
      expect(mockApollo.subscribe).toHaveBeenCalledWith({
        query: expect.anything(),
        variables: {
          namespace: namespacedNodeContext.namespaceId,
          resourceVersion: '123',
        },
      });
    });

    it('should list namespaced resources (raw query string)', async () => {
      const rawQuery = `
      query {
        mylist {
          mydata {
            name
          }
        }
      }
    `;
      mockApollo.query.mockReturnValue(
        of({ data: { mylist: { mydata: [{ name: 'res2' }] } } }),
      );

      const res = await firstValueFrom(
        service.list('mylist.mydata', rawQuery, namespacedNodeContext),
      );
      expect(res).toEqual([{ name: 'res2' }]);
      expect(mockApollo.query).toHaveBeenCalledWith({
        query: expect.anything(),
        variables: {
          namespace: namespacedNodeContext.namespaceId,
        },
      });
    });

    it('should return empty array for raw query when path is missing', async () => {
      const rawQuery = `
      query {
        mylist {
          mydata {
            name
          }
        }
      }
    `;
      mockApollo.query.mockReturnValue(
        of({ data: { mylist: { mydata: [{ name: 'res2' }] } } }),
      );

      const res = await firstValueFrom(
        service.list('mylist.missing', rawQuery, namespacedNodeContext),
      );
      expect(res).toEqual([]);
    });

    it('should list cluster resources (raw query string)', async () => {
      const rawQuery = `
      query {
        mylist {
          name
        }
      }
    `;
      mockApollo.query.mockReturnValue(
        of({ data: { mylist: [{ name: 'res2' }] } }),
      );

      const res = await firstValueFrom(
        service.list('mylist', rawQuery, clusterScopeNodeContext),
      );
      expect(res).toEqual([{ name: 'res2' }]);
      expect(mockApollo.query).toHaveBeenCalledWith({
        query: expect.anything(),
        variables: {},
      });
    });

    it('should handle MODIFIED operation in subscription', (done) => {
      mockApollo.query.mockReturnValue(
        of({
          data: {
            core_k8s_io: {
              v1: {
                Testkinds: {
                  resourceVersion: '123',
                  items: [{ name: 'res1', metadata: { uid: 'uid1' } }],
                },
              },
            },
          },
        }),
      );
      const subject = new Subject();
      mockApollo.subscribe.mockReturnValue(subject.asObservable());

      const results: any[] = [];
      service.list('mylist', ['name'], namespacedNodeContext).subscribe({
        next: (res) => results.push(res),
      });

      subject.next({
        data: {
          mylist: {
            type: 'MODIFIED',
            object: { name: 'res1-updated', metadata: { uid: 'uid1' } },
          },
        },
      });

      expect(results[1]).toEqual([
        { name: 'res1-updated', metadata: { uid: 'uid1' } },
      ]);
    });

    it('should handle DELETED operation in subscription', () => {
      mockApollo.query.mockReturnValue(
        of({
          data: {
            core_k8s_io: {
              v1: {
                Testkinds: {
                  resourceVersion: '123',
                  items: [{ name: 'res1', metadata: { uid: 'uid1' } }],
                },
              },
            },
          },
        }),
      );
      const subject = new Subject();
      mockApollo.subscribe.mockReturnValue(subject.asObservable());

      const results: any[] = [];
      service.list('mylist', ['name'], namespacedNodeContext).subscribe({
        next: (res) => results.push(res),
      });

      subject.next({
        data: {
          mylist: {
            type: 'DELETED',
            object: { name: 'res1', metadata: { uid: 'uid1' } },
          },
        },
      });

      expect(results[1]).toEqual([]);
    });

    it('should return current values when resourceResult is undefined', () => {
      mockApollo.query.mockReturnValue(
        of({
          data: {
            core_k8s_io: {
              v1: {
                Testkinds: {
                  resourceVersion: '123',
                  items: [{ name: 'res1', metadata: { uid: 'uid1' } }],
                },
              },
            },
          },
        }),
      );
      const subject = new Subject();
      mockApollo.subscribe.mockReturnValue(subject.asObservable());

      const results: any[] = [];
      service.list('myList', ['name'], namespacedNodeContext).subscribe({
        next: (res) => results.push(res),
      });

      subject.next({
        data: {
          myList: undefined,
        },
      });

      expect(results[1]).toEqual([{ name: 'res1', metadata: { uid: 'uid1' } }]);
    });

    it('should handle raw query list error', async () => {
      const rawQuery = `query { myList { name } }`;
      const error = new Error('raw query fail');
      mockApollo.query.mockReturnValue(throwError(() => error));
      console.error = vi.fn();

      await expect(
        firstValueFrom(service.list('myList', rawQuery, namespacedNodeContext)),
      ).rejects.toThrow('raw query fail');
      expect(console.error).toHaveBeenCalledWith(
        'Error executing GraphQL query.',
        error,
      );
      expect(mockLuigiCoreService.showAlert).toHaveBeenCalledWith({
        text: 'raw query fail',
        type: 'error',
      });
    });
  });

  describe('delete', () => {
    it('should delete resource', async () => {
      mockApollo.mutate.mockReturnValue(of({}));
      await firstValueFrom(
        service.delete(resource, resourceDefinition, namespacedNodeContext),
      );
      expect(mockApollo.mutate).toHaveBeenCalled();
    });

    it('should delete namespaced resource', async () => {
      mockApollo.mutate.mockReturnValue(of({}));

      await firstValueFrom(
        service.delete(resource, resourceDefinition, namespacedNodeContext),
      );
      expect(mockApollo.mutate).toHaveBeenCalledWith({
        mutation: expect.anything(),
        variables: {
          name: 'test-name',
          namespace: namespacedNodeContext.namespaceId,
        },
      });
    });

    it('should delete namespaced resource without version', async () => {
      mockApollo.mutate.mockReturnValue(of({}));

      await firstValueFrom(
        service.delete(
          resource,
          unversionedResourceDefinition,
          unversionedNamespacedNodeContext,
        ),
      );
      expect(mockApollo.mutate).toHaveBeenCalledWith({
        mutation: expect.anything(),
        variables: {
          name: 'test-name',
          namespace: unversionedNamespacedNodeContext.namespaceId,
        },
      });
    });

    it('should delete namespaced resource without group', async () => {
      mockApollo.mutate.mockReturnValue(of({}));

      await firstValueFrom(
        service.delete(
          resource,
          grouplessResourceDefinition,
          grouplessNamespacedNodeContext,
        ),
      );
      expect(mockApollo.mutate).toHaveBeenCalledWith({
        mutation: expect.anything(),
        variables: {
          name: 'test-name',
          namespace: grouplessNamespacedNodeContext.namespaceId,
        },
      });
    });

    it('should delete namespaced resource without group and version', async () => {
      mockApollo.mutate.mockReturnValue(of({}));

      await firstValueFrom(
        service.delete(
          resource,
          grouplessUnversionedResourceDefinition,
          grouplessUnversionedNamespacedNodeContext,
        ),
      );
      expect(mockApollo.mutate).toHaveBeenCalledWith({
        mutation: expect.anything(),
        variables: {
          name: 'test-name',
          namespace: grouplessUnversionedNamespacedNodeContext.namespaceId,
        },
      });
    });

    it('should delete cluster resource', async () => {
      mockApollo.mutate.mockReturnValue(of({}));

      await firstValueFrom(
        service.delete(resource, resourceDefinition, clusterScopeNodeContext),
      );
      expect(mockApollo.mutate).toHaveBeenCalledWith({
        mutation: expect.anything(),
        variables: {
          name: 'test-name',
        },
      });
    });

    it('should handle delete error', async () => {
      const error = new Error('fail');
      mockApollo.mutate.mockReturnValue(throwError(() => error));
      console.error = vi.fn();

      await expect(
        firstValueFrom(
          service.delete(resource, resourceDefinition, clusterScopeNodeContext),
        ),
      ).rejects.toThrow('fail');
      expect(console.error).toHaveBeenCalledWith(
        'Error executing GraphQL query.',
        error,
      );
      expect(mockLuigiCoreService.showAlert).toHaveBeenCalledWith({
        text: 'fail',
        type: 'error',
      });
    });
  });

  describe('create', () => {
    it('should create resource', async () => {
      mockApollo.mutate.mockReturnValue(
        of({ data: { __typename: 'TestKind' } }),
      );
      await firstValueFrom(
        service.create(resource, resourceDefinition, namespacedNodeContext),
      );
      expect(mockApollo.mutate).toHaveBeenCalled();
    });

    it('should create namespaced resource ', async () => {
      mockApollo.mutate.mockReturnValue(
        of({ data: { __typename: 'TestKind' } }),
      );

      await firstValueFrom(
        service.create(resource, resourceDefinition, namespacedNodeContext),
      );
      expect(mockApollo.mutate).toHaveBeenCalledWith({
        mutation: expect.anything(),
        fetchPolicy: 'no-cache',
        variables: {
          object: resource,
          namespace: namespacedNodeContext.namespaceId,
        },
      });
    });

    it('should create namespaced resource without version', async () => {
      mockApollo.mutate.mockReturnValue(
        of({ data: { __typename: 'TestKind' } }),
      );

      await firstValueFrom(
        service.create(
          resource,
          unversionedResourceDefinition,
          unversionedNamespacedNodeContext,
        ),
      );
      expect(mockApollo.mutate).toHaveBeenCalledWith({
        mutation: expect.anything(),
        fetchPolicy: 'no-cache',
        variables: {
          object: resource,
          namespace: unversionedNamespacedNodeContext.namespaceId,
        },
      });
    });

    it('should create namespaced resource without group', async () => {
      mockApollo.mutate.mockReturnValue(
        of({ data: { __typename: 'TestKind' } }),
      );

      await firstValueFrom(
        service.create(
          resource,
          grouplessResourceDefinition,
          grouplessNamespacedNodeContext,
        ),
      );
      expect(mockApollo.mutate).toHaveBeenCalledWith({
        mutation: expect.anything(),
        fetchPolicy: 'no-cache',
        variables: {
          object: resource,
          namespace: grouplessNamespacedNodeContext.namespaceId,
        },
      });
    });

    it('should create namespaced resource without group and version', async () => {
      mockApollo.mutate.mockReturnValue(
        of({ data: { __typename: 'TestKind' } }),
      );

      await firstValueFrom(
        service.create(
          resource,
          grouplessUnversionedResourceDefinition,
          grouplessUnversionedNamespacedNodeContext,
        ),
      );
      expect(mockApollo.mutate).toHaveBeenCalledWith({
        mutation: expect.anything(),
        fetchPolicy: 'no-cache',
        variables: {
          object: resource,
          namespace: grouplessUnversionedNamespacedNodeContext.namespaceId,
        },
      });
    });

    it('should create cluster resource ', async () => {
      mockApollo.mutate.mockReturnValue(
        of({ data: { __typename: 'TestKind' } }),
      );

      await firstValueFrom(
        service.create(resource, resourceDefinition, clusterScopeNodeContext),
      );
      expect(mockApollo.mutate).toHaveBeenCalledWith({
        mutation: expect.anything(),
        fetchPolicy: 'no-cache',
        variables: {
          object: resource,
        },
      });
    });

    it('should handle create error', async () => {
      const error = new Error('fail');
      mockApollo.mutate.mockReturnValue(throwError(() => error));
      console.error = vi.fn();

      await expect(
        firstValueFrom(
          service.create(resource, resourceDefinition, clusterScopeNodeContext),
        ),
      ).rejects.toThrow('fail');
      expect(console.error).toHaveBeenCalledWith(
        'Error executing GraphQL query.',
        error,
      );
      expect(mockLuigiCoreService.showAlert).toHaveBeenCalledWith({
        text: 'fail',
        type: 'error',
      });
    });
  });

  describe('update', () => {
    it('should strip __typename recursively from update payload', async () => {
      const dirtyResource: any = {
        metadata: { name: 'test-name', __typename: 'Meta' },
        spec: {
          __typename: 'Spec',
          items: [
            { key: 'a', __typename: 'Item' },
            { key: 'b', nested: { foo: 'bar', __typename: 'Nested' } },
          ],
          map: {
            one: { val: 1, __typename: 'Val' },
            two: [{ x: 1, __typename: 'X' }, { y: 2 }],
          },
        },
      };

      mockApollo.mutate.mockReturnValue(
        of({ data: { __typename: 'TestKind' } }),
      );

      await firstValueFrom(
        service.update(
          dirtyResource,
          resourceDefinition,
          namespacedNodeContext,
        ),
      );
      const mutateCall = mockApollo.mutate.mock.calls[0][0];
      const passedObject = mutateCall.variables.object;
      expect(passedObject).toEqual({
        metadata: { name: 'test-name' },
        spec: {
          items: [{ key: 'a' }, { key: 'b', nested: { foo: 'bar' } }],
          map: {
            one: { val: 1 },
            two: [{ x: 1 }, { y: 2 }],
          },
        },
      });
    });
    it('should update resource', async () => {
      mockApollo.mutate.mockReturnValue(
        of({ data: { __typename: 'TestKind' } }),
      );
      await firstValueFrom(
        service.update(resource, resourceDefinition, namespacedNodeContext),
      );
      expect(mockApollo.mutate).toHaveBeenCalled();
    });

    it('should update namespaced resource', async () => {
      mockApollo.mutate.mockReturnValue(
        of({ data: { __typename: 'TestKind' } }),
      );

      await firstValueFrom(
        service.update(resource, resourceDefinition, namespacedNodeContext),
      );
      expect(mockApollo.mutate).toHaveBeenCalledWith({
        mutation: expect.anything(),
        fetchPolicy: 'no-cache',
        variables: {
          name: resource.metadata.name,
          object: resource,
          namespace: namespacedNodeContext.namespaceId,
        },
      });
    });

    it('should update namespaced resource without version', async () => {
      mockApollo.mutate.mockReturnValue(
        of({ data: { __typename: 'TestKind' } }),
      );

      await firstValueFrom(
        service.update(
          resource,
          unversionedResourceDefinition,
          unversionedNamespacedNodeContext,
        ),
      );
      expect(mockApollo.mutate).toHaveBeenCalledWith({
        mutation: expect.anything(),
        fetchPolicy: 'no-cache',
        variables: {
          name: resource.metadata.name,
          object: resource,
          namespace: unversionedNamespacedNodeContext.namespaceId,
        },
      });
    });

    it('should update namespaced resource without group', async () => {
      mockApollo.mutate.mockReturnValue(
        of({ data: { __typename: 'TestKind' } }),
      );

      await firstValueFrom(
        service.update(
          resource,
          grouplessResourceDefinition,
          grouplessNamespacedNodeContext,
        ),
      );
      expect(mockApollo.mutate).toHaveBeenCalledWith({
        mutation: expect.anything(),
        fetchPolicy: 'no-cache',
        variables: {
          name: resource.metadata.name,
          object: resource,
          namespace: grouplessNamespacedNodeContext.namespaceId,
        },
      });
    });

    it('should update namespaced resource without group and version', async () => {
      mockApollo.mutate.mockReturnValue(
        of({ data: { __typename: 'TestKind' } }),
      );

      await firstValueFrom(
        service.update(
          resource,
          grouplessUnversionedResourceDefinition,
          grouplessUnversionedNamespacedNodeContext,
        ),
      );
      expect(mockApollo.mutate).toHaveBeenCalledWith({
        mutation: expect.anything(),
        fetchPolicy: 'no-cache',
        variables: {
          name: resource.metadata.name,
          object: resource,
          namespace: grouplessUnversionedNamespacedNodeContext.namespaceId,
        },
      });
    });

    it('should update cluster resource', async () => {
      mockApollo.mutate.mockReturnValue(
        of({ data: { __typename: 'TestKind' } }),
      );

      await firstValueFrom(
        service.update(resource, resourceDefinition, clusterScopeNodeContext),
      );
      expect(mockApollo.mutate).toHaveBeenCalledWith({
        mutation: expect.anything(),
        fetchPolicy: 'no-cache',
        variables: {
          name: resource.metadata.name,
          object: resource,
        },
      });
    });

    it('should handle update error', async () => {
      const error = new Error('fail');
      mockApollo.mutate.mockReturnValue(throwError(() => error));
      console.error = vi.fn();

      await expect(
        firstValueFrom(
          service.update(resource, resourceDefinition, clusterScopeNodeContext),
        ),
      ).rejects.toThrow('fail');
      expect(console.error).toHaveBeenCalledWith(
        'Error executing GraphQL query.',
        error,
      );
      expect(mockLuigiCoreService.showAlert).toHaveBeenCalledWith({
        text: 'fail',
        type: 'error',
      });
    });
  });
});
