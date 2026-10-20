import { TestBed } from '@angular/core/testing';
import {
  NamespaceService,
  ResourceService,
} from '@platform-mesh/portal-ui-lib/services';
import { firstValueFrom, of, throwError } from 'rxjs';
import { MockedObject } from 'vitest';
import { mock } from 'vitest-mock-extended';

describe(NamespaceService, () => {
  let service: NamespaceService;
  let resourceService: MockedObject<ResourceService>;

  const nodeContext: any = {
    portalContext: { crdGatewayApiUrl: 'https://api.example.com/graphql' },
    token: 'token-1',
    kcpPath: 'root:orgs:test:account',
    resourceDefinition: { entity: 'HttpBin', scope: 'Namespaced' },
  };

  beforeEach(() => {
    resourceService = mock<ResourceService>();

    TestBed.configureTestingModule({
      providers: [{ provide: ResourceService, useValue: resourceService }],
    });

    service = TestBed.inject(NamespaceService);
  });

  it('lists the namespace names of the workspace of the node context', async () => {
    resourceService.list.mockReturnValue(
      of({
        items: [
          { metadata: { name: 'team-a' } },
          { metadata: { name: 'team-b' } },
        ],
      }),
    );

    const namespaces = await firstValueFrom(service.list(nodeContext));

    expect(namespaces).toEqual(['team-a', 'team-b']);
    expect(resourceService.list).toHaveBeenCalledWith(
      'v1_namespaces',
      expect.any(Array),
      {
        portalContext: {
          crdGatewayApiUrl: 'https://api.example.com/graphql',
        },
        resourceDefinition: {
          version: 'v1',
          entityCollection: 'Namespaces',
          entity: 'Namespace',
          scope: 'Cluster',
        },
        kcpPath: 'root:orgs:test:account',
        token: 'token-1',
      },
    );
  });

  it('propagates list errors', async () => {
    const error = new Error('list failed');
    resourceService.list.mockReturnValue(throwError(() => error));

    await expect(firstValueFrom(service.list(nodeContext))).rejects.toBe(error);
  });
});
