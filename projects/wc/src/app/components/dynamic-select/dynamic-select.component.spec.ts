import { DynamicSelect } from './dynamic-select.component';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ResourceService } from '@platform-mesh/portal-ui-lib/services';
import { of } from 'rxjs';

const mockResourceService = {
  list: vi.fn(),
};

describe('DynamicSelectComponent', () => {
  let component: DynamicSelect;
  let fixture: ComponentFixture<DynamicSelect>;

  beforeEach(async () => {
    mockResourceService.list.mockReturnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [DynamicSelect],
      providers: [{ provide: ResourceService, useValue: mockResourceService }],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
      .overrideComponent(DynamicSelect, {
        set: { template: '' },
      })
      .compileComponents();

    fixture = TestBed.createComponent(DynamicSelect);
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

  it('should generate testId with operation name', () => {
    const fieldDefinition = {
      operation: 'getData',
      gqlQuery: '{ someQuery }',
      key: 'name',
      value: 'id',
    };

    const context = { id: 'ctx' };

    fixture.componentRef.setInput('dynamicValuesDefinition', fieldDefinition);
    fixture.componentRef.setInput('context', context);

    mockResourceService.list.mockReturnValue(of([]));

    fixture.detectChanges();

    expect(component.testId()).toBe('pm-dynamic-select-getData');
  });

  it('should generate default testId without operation name', () => {
    const fieldDefinition = {
      operation: '',
      gqlQuery: '{ someQuery }',
      key: 'name',
      value: 'id',
    };

    const context = { id: 'ctx' };

    fixture.componentRef.setInput('dynamicValuesDefinition', fieldDefinition);
    fixture.componentRef.setInput('context', context);

    mockResourceService.list.mockReturnValue(of([]));

    fixture.detectChanges();

    expect(component.testId()).toBe('pm-dynamic-select');
  });

  it('should generate optionTestId with value', () => {
    const fieldDefinition = {
      operation: 'getData',
      gqlQuery: '{ someQuery }',
      key: 'name',
      value: 'id',
    };

    const context = { id: 'ctx' };

    fixture.componentRef.setInput('dynamicValuesDefinition', fieldDefinition);
    fixture.componentRef.setInput('context', context);

    mockResourceService.list.mockReturnValue(of([]));

    fixture.detectChanges();

    expect(component.optionTestId('option1')).toBe(
      'pm-dynamic-select-getData-option-option1',
    );
  });

  it('should generate optionTestId for empty value', () => {
    const fieldDefinition = {
      operation: 'getData',
      gqlQuery: '{ someQuery }',
      key: 'name',
      value: 'id',
    };

    const context = { id: 'ctx' };

    fixture.componentRef.setInput('dynamicValuesDefinition', fieldDefinition);
    fixture.componentRef.setInput('context', context);

    mockResourceService.list.mockReturnValue(of([]));

    fixture.detectChanges();

    expect(component.optionTestId('')).toBe(
      'pm-dynamic-select-getData-option-empty',
    );
  });

  it('should generate optionTestId for null value', () => {
    const fieldDefinition = {
      operation: 'getData',
      gqlQuery: '{ someQuery }',
      key: 'name',
      value: 'id',
    };

    const context = { id: 'ctx' };

    fixture.componentRef.setInput('dynamicValuesDefinition', fieldDefinition);
    fixture.componentRef.setInput('context', context);

    mockResourceService.list.mockReturnValue(of([]));

    fixture.detectChanges();

    expect(component.optionTestId(null)).toBe(
      'pm-dynamic-select-getData-option-empty',
    );
  });

  it('should generate optionTestId for undefined value', () => {
    const fieldDefinition = {
      operation: 'getData',
      gqlQuery: '{ someQuery }',
      key: 'name',
      value: 'id',
    };

    const context = { id: 'ctx' };

    fixture.componentRef.setInput('dynamicValuesDefinition', fieldDefinition);
    fixture.componentRef.setInput('context', context);

    mockResourceService.list.mockReturnValue(of([]));

    fixture.detectChanges();

    expect(component.optionTestId(undefined)).toBe(
      'pm-dynamic-select-getData-option-empty',
    );
  });
});
