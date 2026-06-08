import { CustomGlobalNodesServiceImpl } from './custom-global-nodes.service';
import { TestBed } from '@angular/core/testing';
import { EntityType, I18nService } from '@openmfp/portal-ui-lib';
import { MockedObject } from 'vitest';
import { mock } from 'vitest-mock-extended';

describe('CustomGlobalNodesServiceImpl', () => {
  let service: CustomGlobalNodesServiceImpl;
  let mockI18nService: MockedObject<I18nService>;

  const translationTable = { 'common.error': 'Error' };

  beforeEach(() => {
    mockI18nService = mock<I18nService>();
    (mockI18nService as any).translationTable = translationTable;

    TestBed.configureTestingModule({
      providers: [
        CustomGlobalNodesServiceImpl,
        { provide: I18nService, useValue: mockI18nService },
      ],
    });

    service = TestBed.inject(CustomGlobalNodesServiceImpl);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getCustomGlobalNodes', () => {
    it('should return exactly two top-level nodes', async () => {
      const nodes = await service.getCustomGlobalNodes();
      expect(nodes).toHaveLength(2);
    });

    it('should return a Promise', () => {
      const result = service.getCustomGlobalNodes();
      expect(result).toBeInstanceOf(Promise);
    });

    describe('error node', () => {
      it('should be configured with pathSegment "error" and hidden from nav', async () => {
        const [errorNode] = await service.getCustomGlobalNodes();
        expect(errorNode.pathSegment).toBe('error');
        expect(errorNode.order).toBe(1000);
        expect(errorNode.hideFromNav).toBe(true);
        expect(errorNode.showBreadcrumbs).toBe(false);
      });

      it('should have an empty context object', async () => {
        const [errorNode] = await service.getCustomGlobalNodes();
        expect(errorNode.context).toEqual({});
      });

      it('should expose a single :id child', async () => {
        const [errorNode] = await service.getCustomGlobalNodes();
        expect(errorNode.children).toHaveLength(1);
        const child = (errorNode.children as any[])[0];
        expect(child.pathSegment).toBe(':id');
      });

      it('should configure :id child as ENTITY_ERROR with the error web component view URL', async () => {
        const [errorNode] = await service.getCustomGlobalNodes();
        const child = (errorNode.children as any[])[0];
        expect(child.entityType).toBe(EntityType.ENTITY_ERROR);
        expect(child.viewUrl).toBe(
          '/assets/platform-mesh-portal-ui-wc.js#error-component',
        );
        expect(child.hideFromNav).toBe(true);
        expect(child.hideSideNav).toBe(true);
      });

      it('should pass id placeholder and translationTable from i18nService into the child context', async () => {
        const [errorNode] = await service.getCustomGlobalNodes();
        const child = (errorNode.children as any[])[0];
        expect(child.context).toEqual({
          id: ':id',
          translationTable,
        });
        // identity check: the same reference should be wired in
        expect(child.context.translationTable).toBe(translationTable);
      });

      it('should mark the :id child webcomponent as self-registered', async () => {
        const [errorNode] = await service.getCustomGlobalNodes();
        const child = (errorNode.children as any[])[0];
        expect(child.webcomponent).toEqual({ selfRegistered: true });
      });
    });

    describe('users node', () => {
      it('should be configured with pathSegment "users" and hidden from nav', async () => {
        const [, usersNode] = await service.getCustomGlobalNodes();
        expect(usersNode.pathSegment).toBe('users');
        expect(usersNode.entityType).toBe('global');
        expect(usersNode.hideFromNav).toBe(true);
        expect(usersNode.hideSideNav).toBe(true);
        expect(usersNode.showBreadcrumbs).toBe(false);
      });

      it('should have an empty context object', async () => {
        const [, usersNode] = await service.getCustomGlobalNodes();
        expect(usersNode.context).toEqual({});
      });

      it('should expose a single :userId child that defines the user entity', async () => {
        const [, usersNode] = await service.getCustomGlobalNodes();
        expect(usersNode.children).toHaveLength(1);
        const userNode = (usersNode.children as any[])[0];
        expect(userNode.pathSegment).toBe(':userId');
        expect(userNode.hideFromNav).toBe(true);
        expect(userNode.hideSideNav).toBe(true);
        expect(userNode.defineEntity).toEqual({ id: 'user' });
        expect(userNode.context).toEqual({ userId: ':userId' });
      });

      it('should expose an overview compound child under :userId that defines the overview entity', async () => {
        const [, usersNode] = await service.getCustomGlobalNodes();
        const userNode = (usersNode.children as any[])[0];
        expect(userNode.children).toHaveLength(1);
        const overview = userNode.children[0];

        expect(overview.pathSegment).toBe('overview');
        expect(overview.hideFromNav).toBe(true);
        expect(overview.hideSideNav).toBe(true);
        expect(overview.context).toEqual({});
        expect(overview.defineEntity).toEqual({ id: 'overview' });
        expect(overview.compound).toEqual({ children: [] });
      });
    });

    it('should produce a fresh node tree on each call (no shared mutable state)', async () => {
      const a = await service.getCustomGlobalNodes();
      const b = await service.getCustomGlobalNodes();
      expect(a).not.toBe(b);
      expect(a[0]).not.toBe(b[0]);
    });

    it('should reflect a changed translationTable on subsequent calls', async () => {
      const updated = { 'common.error': 'Erreur' };
      (mockI18nService as any).translationTable = updated;

      const [errorNode] = await service.getCustomGlobalNodes();
      const child = (errorNode.children as any[])[0];
      expect(child.context.translationTable).toBe(updated);
    });
  });
});
