import { SecretValueComponent } from './secret-value.component';
import { ComponentFixture, TestBed } from '@angular/core/testing';

describe('SecretValueComponent', () => {
  let component: SecretValueComponent;
  let fixture: ComponentFixture<SecretValueComponent>;

  const makeComponent = (value: string) => {
    fixture = TestBed.createComponent(SecretValueComponent);
    component = fixture.componentInstance;

    fixture.componentRef.setInput('value', value);

    fixture.detectChanges();

    return { component, fixture };
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [SecretValueComponent],
      schemas: [],
    });
  });

  it('should create', () => {
    const { component } = makeComponent('test-secret');
    expect(component).toBeTruthy();
  });

  it('should initialize with isVisible as false', () => {
    const { component } = makeComponent('test-secret');
    expect(component.isVisible()).toBe(false);
  });

  it('should mask value with asterisks', () => {
    const { component, fixture } = makeComponent('my-secret-password');
    const compiled = fixture.nativeElement;

    expect(component.maskedValue()).toBe(
      '*'.repeat('my-secret-password'.length),
    );
    expect(compiled.querySelector('.masked')?.textContent).toBe(
      '*'.repeat('my-secret-password'.length),
    );
  });

  it('should mask empty string with default 8 asterisks', () => {
    const { component, fixture } = makeComponent('');
    const compiled = fixture.nativeElement;

    expect(component.maskedValue()).toBe('*'.repeat(8));
    expect(compiled.querySelector('.masked')?.textContent).toBe('*'.repeat(8));
  });

  it('should mask short value correctly', () => {
    const { component, fixture } = makeComponent('abc');
    const compiled = fixture.nativeElement;

    expect(component.maskedValue()).toBe('***');
    expect(compiled.querySelector('.masked')?.textContent).toBe('***');
  });

  it('should mask long value correctly', () => {
    const longValue = 'a'.repeat(100);
    const { component, fixture } = makeComponent(longValue);
    const compiled = fixture.nativeElement;

    expect(component.maskedValue()).toBe('*'.repeat(100));
    expect(compiled.querySelector('.masked')?.textContent).toBe(
      '*'.repeat(100),
    );
  });

  it('should display masked value by default', () => {
    const { fixture } = makeComponent('secret-value');
    const compiled = fixture.nativeElement;

    const maskedSpan = compiled.querySelector('.masked');
    const originalSpan = compiled.querySelector('.original');

    expect(maskedSpan).toBeTruthy();
    expect(originalSpan).toBeFalsy();
  });

  it('should display original value when isVisible is true', () => {
    const { component, fixture } = makeComponent('secret-value');

    fixture.componentRef.setInput('isVisible', true);
    fixture.detectChanges();

    const compiled = fixture.nativeElement;
    const originalSpan = compiled.querySelector('.original');
    const maskedSpan = compiled.querySelector('.masked');

    expect(originalSpan).toBeTruthy();
    expect(originalSpan?.textContent).toBe('secret-value');
    expect(maskedSpan).toBeFalsy();
  });

  it('should switch from masked to original when isVisible changes', () => {
    const { component, fixture } = makeComponent('secret-value');
    const compiled = fixture.nativeElement;

    expect(component.isVisible()).toBe(false);
    expect(compiled.querySelector('.masked')).toBeTruthy();
    expect(compiled.querySelector('.original')).toBeFalsy();

    fixture.componentRef.setInput('isVisible', true);
    fixture.detectChanges();

    expect(component.isVisible()).toBe(true);
    expect(compiled.querySelector('.original')).toBeTruthy();
    expect(compiled.querySelector('.masked')).toBeFalsy();
  });

  it('should switch back to masked when isVisible changes to false', () => {
    const { component, fixture } = makeComponent('secret-value');

    fixture.componentRef.setInput('isVisible', true);
    fixture.detectChanges();
    expect(component.isVisible()).toBe(true);

    fixture.componentRef.setInput('isVisible', false);
    fixture.detectChanges();

    const compiled = fixture.nativeElement;
    const maskedSpan = compiled.querySelector('.masked');
    const originalSpan = compiled.querySelector('.original');

    expect(component.isVisible()).toBe(false);
    expect(maskedSpan).toBeTruthy();
    expect(originalSpan).toBeFalsy();
  });

  it('should update masked value when input changes', () => {
    const { component, fixture } = makeComponent('initial');
    expect(component.maskedValue()).toBe('*'.repeat('initial'.length));

    fixture.componentRef.setInput('value', 'updated-secret');
    fixture.detectChanges();

    expect(component.maskedValue()).toBe('*'.repeat('updated-secret'.length));
  });

  it('should maintain visibility state when input changes', () => {
    const { component, fixture } = makeComponent('initial');

    fixture.componentRef.setInput('isVisible', true);
    fixture.detectChanges();

    expect(component.isVisible()).toBe(true);

    fixture.componentRef.setInput('value', 'updated-secret');
    fixture.detectChanges();

    expect(component.isVisible()).toBe(true);
    const compiled = fixture.nativeElement;
    const originalSpan = compiled.querySelector('.original');
    expect(originalSpan?.textContent).toBe('updated-secret');
  });
});
