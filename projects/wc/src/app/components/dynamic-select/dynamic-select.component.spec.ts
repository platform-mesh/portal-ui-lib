import { DynamicSelectComponent } from './dynamic-select.component';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ResourceService } from '@platform-mesh/portal-ui-lib/services';
import { of } from 'rxjs';

const mockResourceService = {
  list: jest.fn(),
};

describe('DynamicSelectComponent', () => {
  let component: DynamicSelectComponent;
  let fixture: ComponentFixture<DynamicSelectComponent>;

  beforeEach(async () => {
    mockResourceService.list.mockReturnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [DynamicSelectComponent],
      providers: [{ provide: ResourceService, useValue: mockResourceService }],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
      .overrideComponent(DynamicSelectComponent, {
        set: { template: '' },
      })
      .compileComponents();

    fixture = TestBed.createComponent(DynamicSelectComponent);
    component = fixture.componentInstance;
  });

  it('should create component', () => {
    expect(component).toBeTruthy();
  });

  it('should load dynamicValues via ResourceService', async () => {
    const mockResponse = [
      { id: '1', name: 'First' },
      { id: '2', name: 'Second' },
    ];

    const fieldDefinition = {
      operation: 'getData',
      gqlQuery: '{ someQuery }',
      key: 'name',
      value: 'id',
    };

    const context = { id: 'ctx' };

    // Set the input signals
    fixture.componentRef.setInput('dynamicValuesDefinition', fieldDefinition);
    fixture.componentRef.setInput('context', context);

    mockResourceService.list.mockReturnValue(of(mockResponse));

    fixture.detectChanges();

    // Wait for the async operation to complete
    await fixture.whenStable();

    const values = component.dynamicValues$();

    expect(values).toEqual([
      { value: '1', key: 'First' },
      { value: '2', key: 'Second' },
    ]);
  });
});
