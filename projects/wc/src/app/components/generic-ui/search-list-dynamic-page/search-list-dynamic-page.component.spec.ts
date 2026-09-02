import { SearchListDynamicPage } from './search-list-dynamic-page.component';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

describe('SearchListDynamicPage', () => {
  let component: SearchListDynamicPage;
  let fixture: ComponentFixture<SearchListDynamicPage>;

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

  const buildLuigiClient = () => ({}) as any;

  beforeEach(() => {
    TestBed.configureTestingModule({
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).overrideComponent(SearchListDynamicPage, {
      set: {
        template: '',
        imports: [],
        schemas: [CUSTOM_ELEMENTS_SCHEMA],
      },
    });

    fixture = TestBed.createComponent(SearchListDynamicPage);
    component = fixture.componentInstance;

    component.context = buildContext();
    component.LuigiClient = (() => buildLuigiClient()) as any;

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('resourceTitleDefinition', () => {
    it('falls back to entityCollection when resourceTitle.label is missing', () => {
      expect(component.resourceTitleDefinition()).toBe('clusters');
    });

    it('uses resourceDefinition.ui.listView.resourceTitle.label when set', () => {
      const f = TestBed.createComponent(SearchListDynamicPage);
      f.componentInstance.context = buildContext({
        resourceDefinition: {
          ui: { listView: { resourceTitle: { label: 'Custom title' } } },
        },
      });
      f.componentInstance.LuigiClient = component.LuigiClient;
      f.detectChanges();
      expect(f.componentInstance.resourceTitleDefinition()).toBe('Custom title');
    });
  });

  describe('resourceDescriptionDefinition', () => {
    it('returns custom label when resourceDescription.label is set', () => {
      const f = TestBed.createComponent(SearchListDynamicPage);
      f.componentInstance.context = buildContext({
        resourceDefinition: {
          ui: {
            listView: { resourceDescription: { label: 'My description' } },
          },
        },
      });
      f.componentInstance.LuigiClient = component.LuigiClient;
      f.detectChanges();
      expect(f.componentInstance.resourceDescriptionDefinition()).toBe(
        'My description',
      );
    });

    it('returns fallback sentence when resourceDescription.label is missing', () => {
      expect(component.resourceDescriptionDefinition()).toBe(
        'This page displays the created clusters in your environment',
      );
    });
  });
});
