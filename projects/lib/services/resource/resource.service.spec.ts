import { ApolloFactory } from './apollo-factory';
import { ResourceService } from './resource.service';
import { TestBed } from '@angular/core/testing';
import { LuigiCoreService } from '@openmfp/portal-ui-lib';
import { mock } from 'jest-mock-extended';
import { Subject, of, throwError } from 'rxjs';

describe('ResourceService', () => {
  let service: ResourceService;
  let mockApollo: any;
  let mockApolloFactory: any;
  let mockLuigiCoreService: jest.Mocked<LuigiCoreService>;

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
      query: jest.fn(),
      subscribe: jest.fn(),
      mutate: jest.fn(),
    };

    mockApolloFactory = {
      apollo: jest.fn().mockReturnValue(mockApollo),
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

  describe('read', () => {
    it('should catch gql parsing error and complete the observable', (done) => {
      const invalidQuery =
        `query { core_k8s_io { TestKind(name: "test-name") {` as unknown as any;

      service['luigiCoreService'].showAlert = jest.fn();

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
            done();
          },
        });
    });

    it('should read resource using fields', (done) => {
      mockApollo.query.mockReturnValue(
        of({
          data: { core_k8s_io: { v1: { TestKind: { name: 'test' } } } },
        }),
      );

      service
        .read(
          'test-name',
          { kind: 'TestKind', version: 'v1', group: 'core_k8s_io' },
          ['name'],
          namespacedNodeContext,
        )
        .subscribe((res) => {
          expect(res).toEqual({ name: 'test' });
          expect(mockApollo.query).toHaveBeenCalledWith({
            query: expect.anything(),
            variables: {
              name: 'test-name',
              namespace: 'test-namespace',
            },
          });
          done();
        });
    });

    it('should read resource using fields with namespaced scope', (done) => {
      mockApollo.query.mockReturnValue(
        of({
          data: { core_k8s_io: { v1: { TestKind: { name: 'test' } } } },
        }),
      );

      service
        .read(
          'test-name',
          { kind: 'TestKind', version: 'v1', group: 'core_k8s_io' },
          ['name'],
          namespacedNodeContext,
        )
        .subscribe((res) => {
          expect(res).toEqual({ name: 'test' });
          expect(mockApollo.query).toHaveBeenCalledWith({
            query: expect.anything(),
            variables: {
              name: 'test-name',
              namespace: namespacedNodeContext.namespaceId,
            },
          });
          done();
        });
    });

    it('should read resource using fields with cluster scope', (done) => {
      mockApollo.query.mockReturnValue(
        of({
          data: { core_k8s_io: { v1: { TestKind: { name: 'test' } } } },
        }),
      );

      service
        .read(
          'test-name',
          { kind: 'TestKind', version: 'v1', group: 'core_k8s_io' },
          ['name'],
          clusterScopeNodeContext,
        )
        .subscribe((res) => {
          expect(res).toEqual({ name: 'test' });
          expect(mockApollo.query).toHaveBeenCalledWith({
            query: expect.anything(),
            variables: {
              name: 'test-name',
            },
          });
          done();
        });
    });

    it('should read resource using raw query, namespaced scope', (done) => {
      const rawQuery = `query { core_k8s_io { TestKind(name: "test-name") { name } } }`;
      mockApollo.query.mockReturnValue(
        of({
          data: { core_k8s_io: { v1: { TestKind: { name: 'test' } } } },
        }),
      );

      service
        .read(
          'test-name',
          { kind: 'TestKind', version: 'v1', group: 'core_k8s_io' },
          rawQuery,
          namespacedNodeContext,
        )
        .subscribe((res) => {
          expect(res).toEqual({ name: 'test' });
          expect(mockApollo.query).toHaveBeenCalledWith({
            query: expect.anything(),
            variables: {
              name: 'test-name',
              namespace: 'test-namespace',
            },
          });
          done();
        });
    });

    it('should read resource using raw query, cluster scope', (done) => {
      const rawQuery = `query { core_k8s_io { TestKind(name: "test") { name } } }`;
      mockApollo.query.mockReturnValue(
        of({
          data: { core_k8s_io: { v1: { TestKind: { name: 'test' } } } },
        }),
      );

      service
        .read(
          'test',
          { kind: 'TestKind', version: 'v1', group: 'core_k8s_io' },
          rawQuery,
          clusterScopeNodeContext,
        )
        .subscribe((res) => {
          expect(res).toEqual({ name: 'test' });
          expect(mockApollo.query).toHaveBeenCalledWith({
            query: expect.anything(),
            variables: {
              name: 'test',
            },
          });
          done();
        });
    });

    it('should read resource using raw query with namespace', (done) => {
      const rawQuery = `query { core_k8s_io { TestKind(name: "test-name", namespace: "test-namespace") { name } } }`;
      mockApollo.query.mockReturnValue(
        of({
          data: { core_k8s_io: { v1: { TestKind: { name: 'test' } } } },
        }),
      );

      service
        .read(
          'test-name',
          { kind: 'TestKind', version: 'v1', group: 'core_k8s_io' },
          rawQuery,
          namespacedNodeContext,
        )
        .subscribe((res) => {
          expect(res).toEqual({ name: 'test' });
          expect(mockApollo.query).toHaveBeenCalledWith({
            query: expect.anything(),
            variables: {
              name: 'test-name',
              namespace: namespacedNodeContext.namespaceId,
            },
          });
          done();
        });
    });

    it('should handle resource in pending deletion state', (done) => {
      const rawQuery = `query { core_k8s_io { TestKind(name: "test") { name } } }`;
      const navigateMock = jest.fn();
      mockLuigiCoreService.navigation.mockReturnValue({
        navigate: navigateMock,
      });
      mockApollo.query.mockReturnValue(
        of({
          data: {
            core_k8s_io: {
              v1: {
                TestKind: {
                  name: 'test',
                  metadata: { deletionTimestamp: '2021-01-01T00:00:00Z' },
                },
              },
            },
          },
        }),
      );

      service
        .read(
          'test',
          { kind: 'TestKind', version: 'v1', group: 'core_k8s_io' },
          rawQuery,
          clusterScopeNodeContext,
        )
        .subscribe({
          error: (error) => {
            expect(navigateMock).toHaveBeenCalledWith('/error/422');
            expect(error.message).toEqual(
              'The resource test is pending deletion.',
            );
            done();
          },
        });
    });

    it('should handle read error', (done) => {
      const error = new Error('fail');
      mockApollo.query.mockReturnValue(throwError(() => error));
      console.error = jest.fn();
      const navigateMock = jest.fn();
      mockLuigiCoreService.navigation.mockReturnValue({
        navigate: navigateMock,
      });

      service
        .read(
          'test-name',
          { kind: 'TestKind', version: 'v1', group: 'core_k8s_io' },
          ['name'],
          namespacedNodeContext,
        )
        .subscribe({
          error: (_err) => {
            expect(console.error).toHaveBeenCalledWith(
              'Error executing GraphQL query.',
              error,
            );
            expect(navigateMock).toHaveBeenCalledWith('/error/404');
            done();
          },
        });
    });

    it('should handle 403 read error', (done) => {
      const error = new Error('fail forbidden');
      error.message = 'Forbidden';
      mockApollo.query.mockReturnValue(throwError(() => error));
      console.error = jest.fn();
      const navigateMock = jest.fn();
      mockLuigiCoreService.navigation.mockReturnValue({
        navigate: navigateMock,
      });

      service
        .read(
          'test-name',
          { kind: 'TestKind', version: 'v1', group: 'core_k8s_io' },
          ['name'],
          namespacedNodeContext,
        )
        .subscribe({
          error: (err) => {
            expect(console.error).toHaveBeenCalledWith(
              'Error executing GraphQL query.',
              error,
            );
            expect(navigateMock).toHaveBeenCalledWith('/error/403');
            done();
          },
        });
    });
  });

  describe('list', () => {
    it('should throw error when resourceDefinition is missing', (done) => {
      const contextWithoutDefinition: any = {
        cluster: 'test',
        namespaceId: 'test-namespace',
      };

      service.list('myList', ['name'], contextWithoutDefinition).subscribe({
        error: (err) => {
          expect(err.message).toBe('Resource definition is required');
          done();
        },
      });
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

    it('should throw error when initialListQuery returns empty result', (done) => {
      mockApollo.query.mockReturnValue(
        of({
          data: {
            core_k8s_io: {},
          },
        }),
      );

      service.list('myList', ['name'], namespacedNodeContext).subscribe({
        error: (err) => {
          expect(err.message).toBe('Resource list result not found');
          done();
        },
      });
    });

    it('should return initial items from query via startWith', (done) => {
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

      const results: any[] = [];
      service.list('myList', ['name'], namespacedNodeContext).subscribe({
        next: (res) => results.push(res),
      });

      expect(results[0]).toEqual([
        { name: 'res1', metadata: { uid: 'uid1' } },
        { name: 'res2', metadata: { uid: 'uid2' } },
      ]);
      done();
    });

    it('should list namespaced resources', (done) => {
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
      service
        .list('mylist', ['name'], namespacedNodeContext)
        .subscribe((res) => {
          expect(mockApollo.query).toHaveBeenCalled();
          expect(mockApollo.subscribe).toHaveBeenCalledWith({
            query: expect.anything(),
            variables: {
              namespace: namespacedNodeContext.namespaceId,
              resourceVersion: '123',
            },
          });
          done();
        });
    });

    it('should list namespaced resources without version', (done) => {
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
      service
        .list('myList', ['name'], unversionedNamespacedNodeContext)
        .subscribe(() => {
          expect(mockApollo.query).toHaveBeenCalled();
          expect(mockApollo.subscribe).toHaveBeenCalledWith({
            query: expect.anything(),
            variables: {
              namespace: unversionedNamespacedNodeContext.namespaceId,
              resourceVersion: '123',
            },
          });
          done();
        });
    });

    it('should list namespaced resources without group', (done) => {
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
      service
        .list('myList', ['name'], grouplessNamespacedNodeContext)
        .subscribe(() => {
          expect(mockApollo.query).toHaveBeenCalled();
          expect(mockApollo.subscribe).toHaveBeenCalledWith({
            query: expect.anything(),
            variables: {
              namespace: grouplessNamespacedNodeContext.namespaceId,
              resourceVersion: '123',
            },
          });
          done();
        });
    });

    it('should list namespaced resources without group and version', (done) => {
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
      service
        .list('myList', ['name'], grouplessUnversionedNamespacedNodeContext)
        .subscribe(() => {
          expect(mockApollo.query).toHaveBeenCalled();
          expect(mockApollo.subscribe).toHaveBeenCalledWith({
            query: expect.anything(),
            variables: {
              namespace: grouplessUnversionedNamespacedNodeContext.namespaceId,
              resourceVersion: '123',
            },
          });
          done();
        });
    });

    it('should list cluster resources', (done) => {
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
      service
        .list('myList', ['name'], clusterScopeNodeContext)
        .subscribe((res) => {
          expect(mockApollo.query).toHaveBeenCalled();
          expect(mockApollo.subscribe).toHaveBeenCalledWith({
            query: expect.anything(),
            variables: { resourceVersion: '123' },
          });
          done();
        });
    });

    it('should list cluster resources without version', (done) => {
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
      service
        .list('myList', ['name'], unversionedClusterScopeNodeContext)
        .subscribe(() => {
          expect(mockApollo.query).toHaveBeenCalled();
          expect(mockApollo.subscribe).toHaveBeenCalledWith({
            query: expect.anything(),
            variables: { resourceVersion: '123' },
          });
          done();
        });
    });

    it('should list cluster resources without group', (done) => {
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
      service
        .list('myList', ['name'], grouplessClusterScopeNodeContext)
        .subscribe(() => {
          expect(mockApollo.query).toHaveBeenCalled();
          expect(mockApollo.subscribe).toHaveBeenCalledWith({
            query: expect.anything(),
            variables: { resourceVersion: '123' },
          });
          done();
        });
    });

    it('should list cluster resources without group and version', (done) => {
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
      service
        .list('myList', ['name'], grouplessUnversionedClusterScopeNodeContext)
        .subscribe(() => {
          expect(mockApollo.query).toHaveBeenCalled();
          expect(mockApollo.subscribe).toHaveBeenCalledWith({
            query: expect.anything(),
            variables: { resourceVersion: '123' },
          });
          done();
        });
    });

    it('should list resources with namespace', (done) => {
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

      service
        .list('myList', ['name'], namespacedNodeContext)
        .subscribe((res) => {
          expect(mockApollo.query).toHaveBeenCalled();
          expect(mockApollo.subscribe).toHaveBeenCalledWith({
            query: expect.anything(),
            variables: {
              namespace: namespacedNodeContext.namespaceId,
              resourceVersion: '123',
            },
          });
          done();
        });
    });

    it('should list namespaced resources (raw query string)', (done) => {
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

      service
        .list('mylist.mydata', rawQuery, namespacedNodeContext)
        .subscribe((res) => {
          expect(res).toEqual([{ name: 'res2' }]);
          expect(mockApollo.query).toHaveBeenCalledWith({
            query: expect.anything(),
            variables: {
              namespace: namespacedNodeContext.namespaceId,
            },
          });
          done();
        });
    });

    it('should return empty array for raw query when path is missing', (done) => {
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

      service
        .list('mylist.missing', rawQuery, namespacedNodeContext)
        .subscribe((res) => {
          expect(res).toEqual([]);
          done();
        });
    });

    it('should list cluster resources (raw query string)', (done) => {
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

      service
        .list('mylist', rawQuery, clusterScopeNodeContext)
        .subscribe((res) => {
          expect(res).toEqual([{ name: 'res2' }]);
          expect(mockApollo.query).toHaveBeenCalledWith({
            query: expect.anything(),
            variables: {},
          });
          done();
        });
    });

    it('should handle list error', (done) => {
      const error = new Error('fail');
      mockApollo.query.mockReturnValue(
        of({
          data: {
            core_k8s_io: {
              v1: {
                Testkinds: {
                  resourceVersion: '123',
                  items: [],
                },
              },
            },
          },
        }),
      );
      mockApollo.subscribe.mockReturnValue(throwError(() => error));
      console.error = jest.fn();

      service.list('myList', ['name'], namespacedNodeContext).subscribe({
        error: (err) => {
          expect(console.error).toHaveBeenCalledWith(
            'Error executing GraphQL query.',
            error,
          );
          done();
        },
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
      done();
    });

    it('should handle DELETED operation in subscription', (done) => {
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
      done();
    });

    it('should return current values when resourceResult is undefined', (done) => {
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
      done();
    });

    it('should handle raw query list error', (done) => {
      const rawQuery = `query { myList { name } }`;
      const error = new Error('raw query fail');
      mockApollo.query.mockReturnValue(throwError(() => error));
      console.error = jest.fn();

      service.list('myList', rawQuery, namespacedNodeContext).subscribe({
        error: (err) => {
          expect(console.error).toHaveBeenCalledWith(
            'Error executing GraphQL query.',
            error,
          );
          expect(mockLuigiCoreService.showAlert).toHaveBeenCalledWith({
            text: 'raw query fail',
            type: 'error',
          });
          done();
        },
      });
    });
  });

  describe('delete', () => {
    it('should delete resource', (done) => {
      mockApollo.mutate.mockReturnValue(of({}));
      service
        .delete(resource, resourceDefinition, namespacedNodeContext)
        .subscribe((res) => {
          expect(mockApollo.mutate).toHaveBeenCalled();
          done();
        });
    });

    it('should delete namespaced resource', (done) => {
      mockApollo.mutate.mockReturnValue(of({}));

      service
        .delete(resource, resourceDefinition, namespacedNodeContext)
        .subscribe(() => {
          expect(mockApollo.mutate).toHaveBeenCalledWith({
            mutation: expect.anything(),
            variables: {
              name: 'test-name',
              namespace: namespacedNodeContext.namespaceId,
            },
          });
          done();
        });
    });

    it('should delete namespaced resource without version', (done) => {
      mockApollo.mutate.mockReturnValue(of({}));

      service
        .delete(
          resource,
          unversionedResourceDefinition,
          unversionedNamespacedNodeContext,
        )
        .subscribe(() => {
          expect(mockApollo.mutate).toHaveBeenCalledWith({
            mutation: expect.anything(),
            variables: {
              name: 'test-name',
              namespace: unversionedNamespacedNodeContext.namespaceId,
            },
          });
          done();
        });
    });

    it('should delete namespaced resource without group', (done) => {
      mockApollo.mutate.mockReturnValue(of({}));

      service
        .delete(
          resource,
          grouplessResourceDefinition,
          grouplessNamespacedNodeContext,
        )
        .subscribe(() => {
          expect(mockApollo.mutate).toHaveBeenCalledWith({
            mutation: expect.anything(),
            variables: {
              name: 'test-name',
              namespace: grouplessNamespacedNodeContext.namespaceId,
            },
          });
          done();
        });
    });

    it('should delete namespaced resource without group and version', (done) => {
      mockApollo.mutate.mockReturnValue(of({}));

      service
        .delete(
          resource,
          grouplessUnversionedResourceDefinition,
          grouplessUnversionedNamespacedNodeContext,
        )
        .subscribe(() => {
          expect(mockApollo.mutate).toHaveBeenCalledWith({
            mutation: expect.anything(),
            variables: {
              name: 'test-name',
              namespace: grouplessUnversionedNamespacedNodeContext.namespaceId,
            },
          });
          done();
        });
    });

    it('should delete cluster resource', (done) => {
      mockApollo.mutate.mockReturnValue(of({}));

      service
        .delete(resource, resourceDefinition, clusterScopeNodeContext)
        .subscribe(() => {
          expect(mockApollo.mutate).toHaveBeenCalledWith({
            mutation: expect.anything(),
            variables: {
              name: 'test-name',
            },
          });
          done();
        });
    });

    it('should handle delete error', (done) => {
      const error = new Error('fail');
      mockApollo.mutate.mockReturnValue(throwError(() => error));
      console.error = jest.fn();

      service
        .delete(resource, resourceDefinition, clusterScopeNodeContext)
        .subscribe({
          error: () => {
            expect(console.error).toHaveBeenCalledWith(
              'Error executing GraphQL query.',
              error,
            );
            expect(mockLuigiCoreService.showAlert).toHaveBeenCalledWith({
              text: 'fail',
              type: 'error',
            });
            done();
          },
        });
    });
  });

  describe('create', () => {
    it('should create resource', (done) => {
      mockApollo.mutate.mockReturnValue(
        of({ data: { __typename: 'TestKind' } }),
      );
      service
        .create(resource, resourceDefinition, namespacedNodeContext)
        .subscribe((res) => {
          expect(mockApollo.mutate).toHaveBeenCalled();
          done();
        });
    });

    it('should create namespaced resource ', (done) => {
      mockApollo.mutate.mockReturnValue(
        of({ data: { __typename: 'TestKind' } }),
      );

      service
        .create(resource, resourceDefinition, namespacedNodeContext)
        .subscribe(() => {
          expect(mockApollo.mutate).toHaveBeenCalledWith({
            mutation: expect.anything(),
            fetchPolicy: 'no-cache',
            variables: {
              object: resource,
              namespace: namespacedNodeContext.namespaceId,
            },
          });
          done();
        });
    });

    it('should create namespaced resource without version', (done) => {
      mockApollo.mutate.mockReturnValue(
        of({ data: { __typename: 'TestKind' } }),
      );

      service
        .create(
          resource,
          unversionedResourceDefinition,
          unversionedNamespacedNodeContext,
        )
        .subscribe(() => {
          expect(mockApollo.mutate).toHaveBeenCalledWith({
            mutation: expect.anything(),
            fetchPolicy: 'no-cache',
            variables: {
              object: resource,
              namespace: unversionedNamespacedNodeContext.namespaceId,
            },
          });
          done();
        });
    });

    it('should create namespaced resource without group', (done) => {
      mockApollo.mutate.mockReturnValue(
        of({ data: { __typename: 'TestKind' } }),
      );

      service
        .create(
          resource,
          grouplessResourceDefinition,
          grouplessNamespacedNodeContext,
        )
        .subscribe(() => {
          expect(mockApollo.mutate).toHaveBeenCalledWith({
            mutation: expect.anything(),
            fetchPolicy: 'no-cache',
            variables: {
              object: resource,
              namespace: grouplessNamespacedNodeContext.namespaceId,
            },
          });
          done();
        });
    });

    it('should create namespaced resource without group and version', (done) => {
      mockApollo.mutate.mockReturnValue(
        of({ data: { __typename: 'TestKind' } }),
      );

      service
        .create(
          resource,
          grouplessUnversionedResourceDefinition,
          grouplessUnversionedNamespacedNodeContext,
        )
        .subscribe(() => {
          expect(mockApollo.mutate).toHaveBeenCalledWith({
            mutation: expect.anything(),
            fetchPolicy: 'no-cache',
            variables: {
              object: resource,
              namespace: grouplessUnversionedNamespacedNodeContext.namespaceId,
            },
          });
          done();
        });
    });

    it('should create cluster resource ', (done) => {
      mockApollo.mutate.mockReturnValue(
        of({ data: { __typename: 'TestKind' } }),
      );

      service
        .create(resource, resourceDefinition, clusterScopeNodeContext)
        .subscribe(() => {
          expect(mockApollo.mutate).toHaveBeenCalledWith({
            mutation: expect.anything(),
            fetchPolicy: 'no-cache',
            variables: {
              object: resource,
            },
          });
          done();
        });
    });

    it('should handle create error', (done) => {
      const error = new Error('fail');
      mockApollo.mutate.mockReturnValue(throwError(() => error));
      console.error = jest.fn();

      service
        .create(resource, resourceDefinition, clusterScopeNodeContext)
        .subscribe({
          error: () => {
            expect(console.error).toHaveBeenCalledWith(
              'Error executing GraphQL query.',
              error,
            );
            expect(mockLuigiCoreService.showAlert).toHaveBeenCalledWith({
              text: 'fail',
              type: 'error',
            });
            done();
          },
        });
    });
  });

  describe('update', () => {
    it('should strip __typename recursively from update payload', (done) => {
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

      service
        .update(dirtyResource, resourceDefinition, namespacedNodeContext)
        .subscribe(() => {
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
          done();
        });
    });
    it('should update resource', (done) => {
      mockApollo.mutate.mockReturnValue(
        of({ data: { __typename: 'TestKind' } }),
      );
      service
        .update(resource, resourceDefinition, namespacedNodeContext)
        .subscribe(() => {
          expect(mockApollo.mutate).toHaveBeenCalled();
          done();
        });
    });

    it('should update namespaced resource', (done) => {
      mockApollo.mutate.mockReturnValue(
        of({ data: { __typename: 'TestKind' } }),
      );

      service
        .update(resource, resourceDefinition, namespacedNodeContext)
        .subscribe(() => {
          expect(mockApollo.mutate).toHaveBeenCalledWith({
            mutation: expect.anything(),
            fetchPolicy: 'no-cache',
            variables: {
              name: resource.metadata.name,
              object: resource,
              namespace: namespacedNodeContext.namespaceId,
            },
          });
          done();
        });
    });

    it('should update namespaced resource without version', (done) => {
      mockApollo.mutate.mockReturnValue(
        of({ data: { __typename: 'TestKind' } }),
      );

      service
        .update(
          resource,
          unversionedResourceDefinition,
          unversionedNamespacedNodeContext,
        )
        .subscribe(() => {
          expect(mockApollo.mutate).toHaveBeenCalledWith({
            mutation: expect.anything(),
            fetchPolicy: 'no-cache',
            variables: {
              name: resource.metadata.name,
              object: resource,
              namespace: unversionedNamespacedNodeContext.namespaceId,
            },
          });
          done();
        });
    });

    it('should update namespaced resource without group', (done) => {
      mockApollo.mutate.mockReturnValue(
        of({ data: { __typename: 'TestKind' } }),
      );

      service
        .update(
          resource,
          grouplessResourceDefinition,
          grouplessNamespacedNodeContext,
        )
        .subscribe(() => {
          expect(mockApollo.mutate).toHaveBeenCalledWith({
            mutation: expect.anything(),
            fetchPolicy: 'no-cache',
            variables: {
              name: resource.metadata.name,
              object: resource,
              namespace: grouplessNamespacedNodeContext.namespaceId,
            },
          });
          done();
        });
    });

    it('should update namespaced resource without group and version', (done) => {
      mockApollo.mutate.mockReturnValue(
        of({ data: { __typename: 'TestKind' } }),
      );

      service
        .update(
          resource,
          grouplessUnversionedResourceDefinition,
          grouplessUnversionedNamespacedNodeContext,
        )
        .subscribe(() => {
          expect(mockApollo.mutate).toHaveBeenCalledWith({
            mutation: expect.anything(),
            fetchPolicy: 'no-cache',
            variables: {
              name: resource.metadata.name,
              object: resource,
              namespace: grouplessUnversionedNamespacedNodeContext.namespaceId,
            },
          });
          done();
        });
    });

    it('should update cluster resource', (done) => {
      mockApollo.mutate.mockReturnValue(
        of({ data: { __typename: 'TestKind' } }),
      );

      service
        .update(resource, resourceDefinition, clusterScopeNodeContext)
        .subscribe(() => {
          expect(mockApollo.mutate).toHaveBeenCalledWith({
            mutation: expect.anything(),
            fetchPolicy: 'no-cache',
            variables: {
              name: resource.metadata.name,
              object: resource,
            },
          });
          done();
        });
    });

    it('should handle update error', (done) => {
      const error = new Error('fail');
      mockApollo.mutate.mockReturnValue(throwError(() => error));
      console.error = jest.fn();

      service
        .update(resource, resourceDefinition, clusterScopeNodeContext)
        .subscribe({
          error: () => {
            expect(console.error).toHaveBeenCalledWith(
              'Error executing GraphQL query.',
              error,
            );
            expect(mockLuigiCoreService.showAlert).toHaveBeenCalledWith({
              text: 'fail',
              type: 'error',
            });
            done();
          },
        });
    });
  });
});
