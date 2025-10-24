import { ApolloFactory } from './apollo-factory';
import { ResourceService } from './resource.service';
import { TestBed } from '@angular/core/testing';
import { LuigiCoreService } from '@openmfp/portal-ui-lib';
import { mock } from 'jest-mock-extended';
import { of, throwError } from 'rxjs';

describe('ResourceService', () => {
  let service: ResourceService;
  let mockApollo: any;
  let mockApolloFactory: any;
  let mockLuigiCoreService: jest.Mocked<LuigiCoreService>;

  const resourceDefinition: any = {
    group: 'core.k8s.io',
    kind: 'TestKind',
    scope: 'Namespaced',
    namespace: 'default',
  };

  const namespacedNodeContext: any = {
    cluster: 'test',
    namespaceId: 'test-namespace',
    resourceDefinition: {
      group: 'core.k8s.io',
      kind: 'TestKind',
      scope: 'Namespaced',
      namespace: 'default',
    },
  };

  const clusterScopeNodeContext: any = {
    namespaceId: 'test-namespace',
    resourceDefinition: {
      group: 'core.k8s.io',
      kind: 'TestKind',
      scope: 'Cluster',
      namespace: 'default',
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

      const mockShowAlert = jest.fn();
      service['luigiCoreService'].showAlert = mockShowAlert;

      service
        .read(
          'test-name',
          'core_k8s_io',
          'TestKind',
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
        of({ data: { core_k8s_io: { TestKind: { name: 'test' } } } }),
      );

      service
        .read(
          'test-name',
          'core_k8s_io',
          'TestKind',
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
        of({ data: { core_k8s_io: { TestKind: { name: 'test' } } } }),
      );

      service
        .read(
          'test-name',
          'core_k8s_io',
          'TestKind',
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
        of({ data: { core_k8s_io: { TestKind: { name: 'test' } } } }),
      );

      service
        .read(
          'test-name',
          'core_k8s_io',
          'TestKind',
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
        of({ data: { core_k8s_io: { TestKind: { name: 'test' } } } }),
      );

      service
        .read(
          'test-name',
          'core_k8s_io',
          'TestKind',
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
        of({ data: { core_k8s_io: { TestKind: { name: 'test' } } } }),
      );

      service
        .read(
          'test',
          'core_k8s_io',
          'TestKind',
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
        of({ data: { core_k8s_io: { TestKind: { name: 'test' } } } }),
      );

      service
        .read(
          'test-name',
          'core_k8s_io',
          'TestKind',
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

    it('should handle read error', (done) => {
      const error = new Error('fail');
      mockApollo.query.mockReturnValue(throwError(() => error));
      console.error = jest.fn();

      service
        .read(
          'test-name',
          'core_k8s_io',
          'TestKind',
          ['name'],
          namespacedNodeContext,
        )
        .subscribe({
          error: (err) => {
            expect(console.error).toHaveBeenCalledWith(
              'Error executing GraphQL query.',
              error,
            );
            done();
          },
        });
    });
  });

  describe('list', () => {
    it('should list namespaced resources', (done) => {
      mockApollo.subscribe.mockReturnValue(
        of({ data: { myList: [{ name: 'res1' }] } }),
      );
      service
        .list('myList', ['name'], namespacedNodeContext)
        .subscribe((res) => {
          expect(res).toEqual([{ name: 'res1' }]);
          expect(mockApollo.subscribe).toHaveBeenCalledWith({
            query: expect.anything(),
            variables: { namespace: namespacedNodeContext.namespaceId },
          });
          done();
        });
    });

    it('should list cluster resources', (done) => {
      mockApollo.subscribe.mockReturnValue(
        of({ data: { myList: [{ name: 'res1' }] } }),
      );
      service
        .list('myList', ['name'], clusterScopeNodeContext)
        .subscribe((res) => {
          expect(res).toEqual([{ name: 'res1' }]);
          expect(mockApollo.subscribe).toHaveBeenCalledWith({
            query: expect.anything(),
            variables: {},
          });
          done();
        });
    });

    it('should list resources with namespace', (done) => {
      mockApollo.subscribe.mockReturnValue(
        of({ data: { myList: [{ name: 'res1' }] } }),
      );

      service
        .list('myList', ['name'], namespacedNodeContext)
        .subscribe((res) => {
          expect(res).toEqual([{ name: 'res1' }]);
          expect(mockApollo.subscribe).toHaveBeenCalledWith({
            query: expect.anything(),
            variables: { namespace: namespacedNodeContext.namespaceId },
          });
          done();
        });
    });

    it('should list namespaced resources (raw query string)', (done) => {
      const rawQuery = `
      subscription {
        myList {
          name
        }
      }
    `;
      mockApollo.subscribe.mockReturnValue(
        of({ data: { myList: { myData: [{ name: 'res2' }] } } }),
      );

      service
        .list('myList.myData', rawQuery, namespacedNodeContext)
        .subscribe((res) => {
          expect(res).toEqual([{ name: 'res2' }]);
          expect(mockApollo.subscribe).toHaveBeenCalledWith({
            query: expect.anything(),
            variables: {
              namespace: namespacedNodeContext.namespaceId,
            },
          });
          done();
        });
    });

    it('should list cluster resources (raw query string)', (done) => {
      const rawQuery = `
      subscription {
        myList {
          name
        }
      }
    `;
      mockApollo.subscribe.mockReturnValue(
        of({ data: { myList: [{ name: 'res2' }] } }),
      );

      service
        .list('myList', rawQuery, clusterScopeNodeContext)
        .subscribe((res) => {
          expect(res).toEqual([{ name: 'res2' }]);
          expect(mockApollo.subscribe).toHaveBeenCalledWith({
            query: expect.anything(),
            variables: {},
          });
          done();
        });
    });

    it('should handle list error', (done) => {
      const error = new Error('fail');
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

  describe('readAccountInfo', () => {
    it('should read account info', (done) => {
      const ca = 'cert-data';
      const accountInfo = { spec: { clusterInfo: { ca } } };
      mockApollo.query.mockReturnValue(
        of({
          data: {
            core_platform_mesh_io: {
              AccountInfo: accountInfo,
            },
          },
        }),
      );

      service.readAccountInfo(namespacedNodeContext).subscribe((res) => {
        expect(res).toBe(accountInfo);
        expect(mockApolloFactory.apollo).toHaveBeenCalledWith(
          namespacedNodeContext,
        );
        done();
      });
    });

    it('should handle read account info error', (done) => {
      const error = new Error('fail');
      mockApollo.query.mockReturnValue(throwError(() => error));
      console.error = jest.fn();

      service.readAccountInfo(namespacedNodeContext).subscribe({
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
