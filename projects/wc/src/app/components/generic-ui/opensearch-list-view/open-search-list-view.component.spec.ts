import { OpenSearchListView } from './open-search-list-view.component';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

describe('OpenSearchListView', () => {
  let component: OpenSearchListView;
  let fixture: ComponentFixture<OpenSearchListView>;

  const buildContext = (overrides: Partial<any> = {}) =>
    (() => ({
      resourceDefinition: {
        entityCollection: 'clusters',
        entity: 'Cluster',
        apiGroup: 'core_k8s_io',
        version: 'v1alpha1',
        ui: {
          listView: { fields: [] },
        },
        ...(overrides.resourceDefinition ?? {}),
      },
      ...overrides,
    })) as any;

  const buildLuigiClient = () =>
    ({
      getActiveFeatureToggles: () => [],
    }) as any;

  beforeEach(() => {
    TestBed.configureTestingModule({
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).overrideComponent(OpenSearchListView, {
      set: {
        template: '',
        imports: [],
        schemas: [CUSTOM_ELEMENTS_SCHEMA],
      },
    });

    fixture = TestBed.createComponent(OpenSearchListView);
    component = fixture.componentInstance;

    component.context = buildContext();
    component.LuigiClient = (() => buildLuigiClient()) as any;

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('dashboardConfig', () => {
    it('falls back to entityCollection for the title when resourceTitle.label is missing', () => {
      expect(component.i18n().title).toBe('clusters');
    });

    it('uses resourceDefinition.ui.listView.resourceTitle.label when set', () => {
      const f = TestBed.createComponent(OpenSearchListView);
      f.componentInstance.context = buildContext({
        resourceDefinition: {
          ui: { listView: { resourceTitle: { label: 'Custom title' } } },
        },
      });
      f.componentInstance.LuigiClient = component.LuigiClient;
      f.detectChanges();
      expect(f.componentInstance.i18n().title).toBe('Custom title');
    });

    it('falls back to the default description sentence when resourceDescription.label is missing', () => {
      expect(component.i18n().description).toBe(
        'This page displays the created clusters in your environment',
      );
    });

    it('uses ui.listView.resourceDescription.label when set', () => {
      const f = TestBed.createComponent(OpenSearchListView);
      f.componentInstance.context = buildContext({
        resourceDefinition: {
          ui: {
            listView: { resourceDescription: { label: 'My description' } },
          },
        },
      });
      f.componentInstance.LuigiClient = component.LuigiClient;
      f.detectChanges();
      expect(f.componentInstance.i18n().description).toBe(
        'My description',
      );
    });

    it('uses the default background image URL when not configured', () => {
      expect(component.dashboardConfig().backgroundImageUrl).toBe(
        '/assets/pm_background.png',
      );
    });

    it('omits the background image when the neoNephosDemo toggle is active', () => {
      const f = TestBed.createComponent(OpenSearchListView);
      f.componentInstance.context = buildContext();
      f.componentInstance.LuigiClient = (() =>
        ({
          getActiveFeatureToggles: () => ['neoNephosDemo'],
        }) as any) as any;
      f.detectChanges();
      expect(f.componentInstance.dashboardConfig().backgroundImageUrl).toBe('');
    });

    it('is not editable and has no custom actions', () => {
      expect(component.dashboardConfig().editable).toBe(false);
      expect(component.customActions).toEqual([]);
    });
  });

  describe('cards', () => {
    it('declares a single open-search-resource-table-card in the accounts section', () => {
      const cards = component.cards();
      expect(cards).toHaveLength(1);
      expect(cards[0].component).toBe('pm-open-search-resource-table-card');
      expect(cards[0].sectionId).toBe('accounts');
    });

    it('forwards LuigiClient and context to the card', () => {
      // Compare by content rather than identity: the input signal is set as a
      // value via `(() => obj) as any`, so calling LuigiClient()/context()
      // re-invokes that factory and produces a structurally-equivalent but
      // non-identical reference.
      const cards = component.cards();
      expect(cards[0].componentInputs?.['LuigiClient']).toBeDefined();
      expect(cards[0].componentInputs?.['context']).toBeDefined();
      expect(cards[0].componentInputs?.['context']).toMatchObject({
        resourceDefinition: { entityCollection: 'clusters' },
      });
    });
  });
});
