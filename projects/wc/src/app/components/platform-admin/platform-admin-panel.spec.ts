import { NO_ERRORS_SCHEMA } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LuigiCoreService } from '@openmfp/portal-ui-lib';
import {
  ApiExportEntry,
  OrgEntry,
  PolicyEntry,
} from '../../services/platform-admin-panel.service';
import { PlatformAdminComponent } from './platform-admin-panel';

const BASE = '/api/v1/admin';

function tick(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

interface LoadData {
  apiExports: ApiExportEntry[];
  orgs: OrgEntry[];
  policies: PolicyEntry[];
}

describe('PlatformAdminComponent', () => {
  let fixture: ComponentFixture<PlatformAdminComponent>;
  let component: PlatformAdminComponent;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [PlatformAdminComponent],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: LuigiCoreService,
          useValue: { getAuthData: () => ({ idToken: 'test-token' }) },
        },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  function flushLoad(data: LoadData): void {
    httpMock.expectOne(`${BASE}/apiexports`).flush(data.apiExports);
    httpMock.expectOne(`${BASE}/orgs`).flush(data.orgs);
    httpMock.expectOne(`${BASE}/apiexport-policies`).flush(data.policies);
  }

  async function init(data: LoadData): Promise<void> {
    fixture = TestBed.createComponent(PlatformAdminComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    flushLoad(data);
    await tick();
    fixture.detectChanges();
  }

  const exportA: ApiExportEntry = { name: 'exp-a', clusterPath: 'root:providers:p1' };
  const exportB: ApiExportEntry = { name: 'exp-b', clusterPath: 'root:providers:p2' };
  const policyA: PolicyEntry = {
    name: 'exp-a',
    apiExportRef: { name: 'exp-a', clusterPath: 'root:providers:p1' },
    allowPathExpressions: [':root:orgs:default'],
  };

  it('derives enabled status and allowedOrgs per row', async () => {
    await init({
      apiExports: [exportA, exportB],
      orgs: [{ name: 'default' }, { name: 'foo' }],
      policies: [policyA],
    });

    const first = component.rows()[0];
    expect(first.enabled).toBe(true);
    expect(first.allowedOrgs).toEqual(['default']);

    const second = component.rows()[1];
    expect(second.enabled).toBe(false);
    expect(second.allowedOrgs).toEqual([]);
  });

  it('shows empty state when there are no apiexports', async () => {
    await init({ apiExports: [], orgs: [], policies: [] });
    // ShadowDom encapsulation: query inside shadow root
    const root: Element =
      (fixture.nativeElement.shadowRoot as Element | null) ??
      fixture.nativeElement;
    expect(root.querySelector('[data-testid="state-empty"]')).toBeTruthy();
  });

  it('sets error signal when loading fails', async () => {
    fixture = TestBed.createComponent(PlatformAdminComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    httpMock
      .expectOne(`${BASE}/apiexports`)
      .flush(null, { status: 500, statusText: 'Server Error' });
    httpMock.expectOne(`${BASE}/orgs`).flush([]);
    httpMock.expectOne(`${BASE}/apiexport-policies`).flush([]);
    await tick();
    fixture.detectChanges();

    expect(component.error()).toBeTruthy();
  });

  it('POSTs a create when a row without a policy gains orgs', async () => {
    await init({
      apiExports: [exportB],
      orgs: [{ name: 'default' }, { name: 'foo' }],
      policies: [],
    });

    const row = component.rows()[0];
    component.startEdit(row);
    component.toggleOrg('foo', true);

    const savePromise = component.save(row);

    const req = httpMock.expectOne(`${BASE}/apiexport-policies`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      name: 'exp-b',
      apiExportName: 'exp-b',
      clusterPath: 'root:providers:p2',
      allowPathExpressions: [':root:orgs:foo'],
    });
    req.flush(null);

    await tick();
    flushLoad({ apiExports: [exportB], orgs: [{ name: 'foo' }], policies: [] });
    await savePromise;
  });

  it('PUTs an update when an existing policy set changes', async () => {
    await init({
      apiExports: [exportA],
      orgs: [{ name: 'default' }, { name: 'foo' }],
      policies: [policyA],
    });

    const row = component.rows()[0];
    component.startEdit(row);
    component.toggleOrg('foo', true);

    const savePromise = component.save(row);

    const req = httpMock.expectOne(`${BASE}/apiexport-policies/exp-a`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({
      allowPathExpressions: [':root:orgs:default', ':root:orgs:foo'],
    });
    req.flush(null);

    await tick();
    flushLoad({ apiExports: [exportA], orgs: [], policies: [] });
    await savePromise;
  });

  it('DELETEs the policy when all orgs are removed', async () => {
    await init({
      apiExports: [exportA],
      orgs: [{ name: 'default' }],
      policies: [policyA],
    });

    const row = component.rows()[0];
    component.startEdit(row);
    component.toggleOrg('default', false);

    const savePromise = component.save(row);

    const req = httpMock.expectOne(`${BASE}/apiexport-policies/exp-a`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);

    await tick();
    flushLoad({ apiExports: [exportA], orgs: [], policies: [] });
    await savePromise;
  });

  it('makes no request when an existing set is unchanged', async () => {
    await init({
      apiExports: [exportA],
      orgs: [{ name: 'default' }],
      policies: [policyA],
    });

    const row = component.rows()[0];
    component.startEdit(row);

    const savePromise = component.save(row);
    await tick();
    flushLoad({
      apiExports: [exportA],
      orgs: [{ name: 'default' }],
      policies: [policyA],
    });
    await savePromise;

    httpMock.verify();
    expect(component.editingKey()).toBeNull();
  });

  it('cancelEdit() resets editingKey', async () => {
    await init({ apiExports: [exportA], orgs: [], policies: [] });
    const row = component.rows()[0];
    component.startEdit(row);
    expect(component.isEditing(row)).toBe(true);
    component.cancelEdit();
    expect(component.isEditing(row)).toBe(false);
  });

  it('reload() clears actionError and reloads data', async () => {
    await init({ apiExports: [exportA], orgs: [], policies: [] });
    component.actionError.set('some error');

    component.reload();

    expect(component.actionError()).toBeNull();
    flushLoad({ apiExports: [exportA], orgs: [], policies: [] });
  });

  it('onOrgChange() toggles an org via the event target', async () => {
    await init({
      apiExports: [exportB],
      orgs: [{ name: 'default' }],
      policies: [],
    });

    const row = component.rows()[0];
    component.startEdit(row);

    const fakeEvent = { target: { checked: true } } as unknown as Event;
    component.onOrgChange('default', fakeEvent);
    expect(component.isOrgSelected('default')).toBe(true);

    const fakeEventOff = { target: { checked: false } } as unknown as Event;
    component.onOrgChange('default', fakeEventOff);
    expect(component.isOrgSelected('default')).toBe(false);
  });

  it('save() sets actionError when the HTTP request fails', async () => {
    await init({
      apiExports: [exportB],
      orgs: [{ name: 'default' }],
      policies: [],
    });

    const row = component.rows()[0];
    component.startEdit(row);
    component.toggleOrg('default', true);

    const savePromise = component.save(row);

    httpMock
      .expectOne(`${BASE}/apiexport-policies`)
      .flush(null, { status: 500, statusText: 'Server Error' });

    await savePromise;

    expect(component.actionError()).toBeTruthy();
    expect(component.saving()).toBe(false);
  });

  it('save() makes no request and closes edit when no policy exists and no orgs selected', async () => {
    await init({
      apiExports: [exportB],
      orgs: [{ name: 'default' }],
      policies: [],
    });

    const row = component.rows()[0];
    component.startEdit(row);

    const savePromise = component.save(row);
    await tick();
    flushLoad({ apiExports: [exportB], orgs: [{ name: 'default' }], policies: [] });
    await savePromise;

    httpMock.verify();
    expect(component.editingKey()).toBeNull();
  });

  it('startEdit() clears a previous actionError', async () => {
    await init({ apiExports: [exportA], orgs: [], policies: [] });
    component.actionError.set('previous error');

    const row = component.rows()[0];
    component.startEdit(row);

    expect(component.actionError()).toBeNull();
  });

  it('saving() is true while the HTTP request is in flight', async () => {
    await init({
      apiExports: [exportB],
      orgs: [{ name: 'default' }],
      policies: [],
    });

    const row = component.rows()[0];
    component.startEdit(row);
    component.toggleOrg('default', true);

    const savePromise = component.save(row);

    expect(component.saving()).toBe(true);

    httpMock.expectOne(`${BASE}/apiexport-policies`).flush(null);
    await tick();
    flushLoad({ apiExports: [exportB], orgs: [{ name: 'default' }], policies: [] });
    await savePromise;

    expect(component.saving()).toBe(false);
  });

  it('shows error state in template when loading fails', async () => {
    fixture = TestBed.createComponent(PlatformAdminComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    httpMock
      .expectOne(`${BASE}/apiexports`)
      .flush(null, { status: 500, statusText: 'Server Error' });
    httpMock.expectOne(`${BASE}/orgs`).flush([]);
    httpMock.expectOne(`${BASE}/apiexport-policies`).flush([]);
    await tick();
    fixture.detectChanges();

    const root: Element =
      (fixture.nativeElement.shadowRoot as Element | null) ??
      fixture.nativeElement;
    expect(root.querySelector('[data-testid="state-error"]')).toBeTruthy();
  });

  it('wildcard * org selection toggles and maps to allowPathExpressions correctly', async () => {
    await init({
      apiExports: [exportB],
      orgs: [{ name: 'default' }],
      policies: [],
    });

    const row = component.rows()[0];
    component.startEdit(row);
    component.toggleOrg('*', true);

    expect(component.isOrgSelected('*')).toBe(true);

    const savePromise = component.save(row);

    const req = httpMock.expectOne(`${BASE}/apiexport-policies`);
    expect(req.request.body.allowPathExpressions).toContain(':root:orgs:*');
    req.flush(null);

    await tick();
    flushLoad({ apiExports: [exportB], orgs: [{ name: 'default' }], policies: [] });
    await savePromise;
  });

  it('rows() preserves a policy expression that lacks the org path prefix as-is', async () => {
    const policyWithRawExpr: PolicyEntry = {
      name: 'exp-a',
      apiExportRef: { name: 'exp-a', clusterPath: 'root:providers:p1' },
      allowPathExpressions: ['custom-expr'],
    };

    await init({
      apiExports: [exportA],
      orgs: [],
      policies: [policyWithRawExpr],
    });

    const row = component.rows()[0];
    expect(row.allowedOrgs).toEqual(['custom-expr']);
  });
});
