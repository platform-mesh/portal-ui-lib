import { SecretValueComponent } from './secret-value.component';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
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
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    });
  });

  it('should create', () => {
    const { component } = makeComponent('test-secret');
    expect(component).toBeTruthy();
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

  it('should display original value in hidden span', () => {
    const { fixture } = makeComponent('secret-value');
    const compiled = fixture.nativeElement;

    const originalSpan = compiled.querySelector('.original');
    expect(originalSpan).toBeTruthy();
    expect(originalSpan?.textContent).toBe('secret-value');
  });

  it('should update masked value when input changes', () => {
    const { component, fixture } = makeComponent('initial');
    expect(component.maskedValue()).toBe('*'.repeat('initial'.length));

    fixture.componentRef.setInput('value', 'updated-secret');
    fixture.detectChanges();

    expect(component.maskedValue()).toBe('*'.repeat('updated-secret'.length));
  });
});
