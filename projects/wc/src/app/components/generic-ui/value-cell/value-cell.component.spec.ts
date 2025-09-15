import { ValueCellComponent } from './value-cell.component';
import { ComponentFixture, TestBed } from '@angular/core/testing';

describe('ValueCellComponent', () => {
  let component: ValueCellComponent;
  let fixture: ComponentFixture<ValueCellComponent>;

  const makeComponent = (value: unknown) => {
    fixture = TestBed.createComponent(ValueCellComponent);
    component = fixture.componentInstance;

    fixture.componentRef.setInput('value', value as any);

    fixture.detectChanges();

    return { component, fixture };
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ValueCellComponent],
    });
  });

  it('should create', () => {
    const { component } = makeComponent('test');
    expect(component).toBeTruthy();
  });

  it('should render boolean-value component for boolean-like values', () => {
    const { fixture } = makeComponent('true');
    const compiled = fixture.nativeElement;

    expect(compiled.querySelector('wc-boolean-value')).toBeTruthy();
    expect(component.isBoolLike()).toBe(true);
    expect(component.boolValue()).toBe(true);
  });

  it('should render boolean-value component for false boolean-like values', () => {
    const { fixture } = makeComponent('false');
    const compiled = fixture.nativeElement;

    expect(compiled.querySelector('wc-boolean-value')).toBeTruthy();
    expect(component.isBoolLike()).toBe(true);
    expect(component.boolValue()).toBe(false);
  });

  it('should render boolean-value component for actual boolean values', () => {
    const { fixture } = makeComponent(true);
    const compiled = fixture.nativeElement;

    expect(compiled.querySelector('wc-boolean-value')).toBeTruthy();
    expect(component.isBoolLike()).toBe(true);
    expect(component.boolValue()).toBe(true);
  });

  it('should render link-value component for valid URLs', () => {
    const { fixture } = makeComponent('https://example.com');
    const compiled = fixture.nativeElement;

    expect(compiled.querySelector('wc-link-value')).toBeTruthy();
    expect(component.isUrlValue()).toBe(true);
    expect(component.stringValue()).toBe('https://example.com');
  });

  it('should render link-value component for valid URLs with different protocols', () => {
    const { fixture } = makeComponent('http://test.com');
    const compiled = fixture.nativeElement;

    expect(compiled.querySelector('wc-link-value')).toBeTruthy();
    expect(component.isUrlValue()).toBe(true);
  });

  it('should render plain text for non-boolean, non-URL values', () => {
    const { fixture } = makeComponent('cluster-a');
    const compiled = fixture.nativeElement;

    expect(compiled.querySelector('wc-boolean-value')).toBeFalsy();
    expect(compiled.querySelector('wc-link-value')).toBeFalsy();
    expect(compiled.textContent.trim()).toBe('cluster-a');
    expect(component.isBoolLike()).toBe(false);
    expect(component.isUrlValue()).toBe(false);
  });

  it('should render plain text for empty strings', () => {
    const { fixture } = makeComponent('');
    const compiled = fixture.nativeElement;

    expect(compiled.querySelector('wc-boolean-value')).toBeFalsy();
    expect(compiled.querySelector('wc-link-value')).toBeFalsy();
    expect(component.isBoolLike()).toBe(false);
    expect(component.isUrlValue()).toBe(false);
  });

  it('should render plain text for whitespace-only strings', () => {
    const { fixture } = makeComponent('   ');
    const compiled = fixture.nativeElement;

    expect(compiled.querySelector('wc-boolean-value')).toBeFalsy();
    expect(compiled.querySelector('wc-link-value')).toBeFalsy();
    expect(component.isBoolLike()).toBe(false);
    expect(component.isUrlValue()).toBe(false);
  });

  it('should render plain text for invalid URLs', () => {
    const { fixture } = makeComponent('not-a-url');
    const compiled = fixture.nativeElement;

    expect(compiled.querySelector('wc-boolean-value')).toBeFalsy();
    expect(compiled.querySelector('wc-link-value')).toBeFalsy();
    expect(compiled.textContent.trim()).toBe('not-a-url');
    expect(component.isUrlValue()).toBe(false);
  });

  it('should handle null and undefined values', () => {
    const { fixture } = makeComponent(null);
    const compiled = fixture.nativeElement;

    expect(compiled.querySelector('wc-boolean-value')).toBeFalsy();
    expect(compiled.querySelector('wc-link-value')).toBeFalsy();
    expect(component.isBoolLike()).toBe(false);
    expect(component.isUrlValue()).toBe(false);
  });

  it('should handle numeric values', () => {
    const { fixture } = makeComponent(123);
    const compiled = fixture.nativeElement;

    expect(compiled.querySelector('wc-boolean-value')).toBeFalsy();
    expect(compiled.querySelector('wc-link-value')).toBeFalsy();
    expect(compiled.textContent.trim()).toBe('123');
  });
});
