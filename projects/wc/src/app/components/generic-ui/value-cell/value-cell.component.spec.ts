import { BooleanValueComponent } from './boolean-value/boolean-value.component';
import { LinkValueComponent } from './link-value/link-value.component';
import { SecretValueComponent } from './secret-value/secret-value.component';
import { ValueCellComponent } from './value-cell.component';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LuigiClient } from '@luigi-project/client/luigi-element';
import {
  FieldDefinition,
  Resource,
} from '@platform-mesh/portal-ui-lib/models/models';

describe('ValueCellComponent', () => {
  let component: ValueCellComponent;
  let fixture: ComponentFixture<ValueCellComponent>;
  let mockLuigiClient: LuigiClient;

  const createMockLuigiClient = (showAlertSpy?: jest.Mock): LuigiClient =>
    ({
      uxManager: () => ({
        showAlert: showAlertSpy || jest.fn(),
      }),
    }) as any;

  const makeComponent = (
    value: unknown,
    fieldDefinition: Partial<FieldDefinition> = {},
    customLuigiClient?: LuigiClient,
  ) => {
    mockLuigiClient = customLuigiClient || createMockLuigiClient();
    fixture = TestBed.createComponent(ValueCellComponent);
    component = fixture.componentInstance;

    const resource: Resource = {
      metadata: { name: 'test-resource' },
      spec: { value },
    } as any;

    const field: FieldDefinition = {
      property: 'spec.value',
      ...fieldDefinition,
    };

    fixture.componentRef.setInput('resource', resource);
    fixture.componentRef.setInput('fieldDefinition', field);
    fixture.componentRef.setInput('LuigiClient', mockLuigiClient);

    fixture.detectChanges();

    return { component, fixture };
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ValueCellComponent],
    }).overrideComponent(ValueCellComponent, {
      set: {
        imports: [
          BooleanValueComponent,
          LinkValueComponent,
          SecretValueComponent,
        ],
        schemas: [CUSTOM_ELEMENTS_SCHEMA],
      },
    });
  });

  it('should create', () => {
    const { component } = makeComponent('test');
    expect(component).toBeTruthy();
  });

  it('should render boolean-value component for boolean-like values', () => {
    const { fixture } = makeComponent('true', {
      uiSettings: { displayAs: 'boolIcon' },
    });
    const compiled = fixture.nativeElement;

    expect(compiled.querySelector('wc-boolean-value')).toBeTruthy();
    expect(component.isBoolLike()).toBe(true);
    expect(component.boolValue()).toBe(true);
  });

  it('should render boolean-value component for false boolean-like values', () => {
    const { fixture } = makeComponent('false', {
      uiSettings: { displayAs: 'boolIcon' },
    });
    const compiled = fixture.nativeElement;

    expect(compiled.querySelector('wc-boolean-value')).toBeTruthy();
    expect(component.isBoolLike()).toBe(true);
    expect(component.boolValue()).toBe(false);
  });

  it('should render boolean-value component for actual boolean values', () => {
    const { fixture } = makeComponent(true, {
      uiSettings: { displayAs: 'boolIcon' },
    });
    const compiled = fixture.nativeElement;

    expect(compiled.querySelector('wc-boolean-value')).toBeTruthy();
    expect(component.isBoolLike()).toBe(true);
    expect(component.boolValue()).toBe(true);
  });

  it('should render link-value component for valid URLs', () => {
    const { fixture } = makeComponent('https://example.com', {
      uiSettings: { displayAs: 'link' },
    });
    const compiled = fixture.nativeElement;

    expect(compiled.querySelector('wc-link-value')).toBeTruthy();
    expect(component.isUrlValue()).toBe(true);
    expect(component.stringValue()).toBe('https://example.com');
  });

  it('should render link-value component for valid URLs with different protocols', () => {
    const { fixture } = makeComponent('http://test.com', {
      uiSettings: { displayAs: 'link' },
    });
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
    const { fixture } = makeComponent('not-a-url', {
      uiSettings: { displayAs: 'link' },
    });
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

  describe('labelDisplay functionality', () => {
    it('should apply label styles when labelDisplay is an object', () => {
      const labelDisplay = { backgroundColor: '#ffffff', color: '#000000' };
      const { fixture } = makeComponent('test-value', {
        uiSettings: { labelDisplay },
      });
      const compiled = fixture.nativeElement;
      const span = compiled.querySelector('span');

      expect(span.classList.contains('label-value')).toBe(true);
      expect(component.labelDisplay()).toEqual(labelDisplay);
    });

    it('should apply label-value class when labelDisplay is true', () => {
      const { fixture } = makeComponent('test-value', {
        uiSettings: { labelDisplay: true },
      });
      const compiled = fixture.nativeElement;
      const span = compiled.querySelector('span');

      expect(span.classList.contains('label-value')).toBe(true);
      expect(component.labelDisplay()).toEqual({});
    });

    it('should not apply label-value class when labelDisplay is false', () => {
      const { fixture } = makeComponent('test-value', {
        uiSettings: { labelDisplay: false },
      });
      const compiled = fixture.nativeElement;
      const span = compiled.querySelector('span');

      expect(span.classList.contains('label-value')).toBe(false);
      expect(component.labelDisplay()).toBeUndefined();
    });

    it('should not apply label-value class when labelDisplay is undefined', () => {
      const { fixture } = makeComponent('test-value', {
        uiSettings: { labelDisplay: undefined },
      });
      const compiled = fixture.nativeElement;
      const span = compiled.querySelector('span');

      expect(span.classList.contains('label-value')).toBe(false);
      expect(component.labelDisplay()).toBeUndefined();
    });
  });

  describe('displayAs secret functionality', () => {
    it('should render secret-value component when displayAs is secret', () => {
      const { fixture } = makeComponent('secret-password', {
        uiSettings: { displayAs: 'secret' },
      });
      const compiled = fixture.nativeElement;

      expect(compiled.querySelector('wc-secret-value')).toBeTruthy();
      expect(component.displayAs()).toBe('secret');
    });

    it('should not render secret-value component when displayAs is not secret', () => {
      const { fixture } = makeComponent('plain-text', {
        uiSettings: { displayAs: 'link' },
      });
      const compiled = fixture.nativeElement;

      expect(compiled.querySelector('wc-secret-value')).toBeFalsy();
      expect(component.displayAs()).toBe('link');
    });

    it('should not render secret-value component when displayAs is undefined', () => {
      const { fixture } = makeComponent('plain-text');
      const compiled = fixture.nativeElement;

      expect(compiled.querySelector('wc-secret-value')).toBeFalsy();
      expect(component.displayAs()).toBeUndefined();
    });

    it('should render toggle icon when displayAs is secret', () => {
      const { fixture } = makeComponent('secret-password', {
        uiSettings: { displayAs: 'secret' },
      });
      const compiled = fixture.nativeElement;

      const toggleIcon = compiled.querySelector('ui5-icon.toggle-icon');
      expect(toggleIcon).toBeTruthy();
    });

    it('should not render toggle icon when displayAs is not secret', () => {
      const { fixture } = makeComponent('plain-text', {
        uiSettings: { displayAs: 'link' },
      });
      const compiled = fixture.nativeElement;

      const toggleIcon = compiled.querySelector('ui5-icon.toggle-icon');
      expect(toggleIcon).toBeFalsy();
    });

    it('should initialize isVisible as false', () => {
      const { component } = makeComponent('secret-password', {
        uiSettings: { displayAs: 'secret' },
      });

      expect(component.isVisible()).toBe(false);
    });

    it('should toggle visibility when icon is clicked', () => {
      const { component, fixture } = makeComponent('secret-password', {
        uiSettings: { displayAs: 'secret' },
      });
      const compiled = fixture.nativeElement;

      expect(component.isVisible()).toBe(false);

      const icon = compiled.querySelector('ui5-icon.toggle-icon');
      icon?.click();
      fixture.detectChanges();

      expect(component.isVisible()).toBe(true);
    });

    it('should toggle back to hidden when icon is clicked again', () => {
      const { component, fixture } = makeComponent('secret-password', {
        uiSettings: { displayAs: 'secret' },
      });
      const compiled = fixture.nativeElement;

      const icon = compiled.querySelector('ui5-icon.toggle-icon');

      icon?.click();
      fixture.detectChanges();
      expect(component.isVisible()).toBe(true);

      icon?.click();
      fixture.detectChanges();
      expect(component.isVisible()).toBe(false);
    });

    it('should stop event propagation when toggle icon is clicked', () => {
      const { component, fixture } = makeComponent('secret-password', {
        uiSettings: { displayAs: 'secret' },
      });

      const event = new Event('click');
      const stopPropagationSpy = jest.spyOn(event, 'stopPropagation');

      component.toggleVisibility(event);
      fixture.detectChanges();

      expect(stopPropagationSpy).toHaveBeenCalled();
    });

    it('should pass isVisible state to secret-value component', () => {
      const { component, fixture } = makeComponent('secret-password', {
        uiSettings: { displayAs: 'secret' },
      });
      const compiled = fixture.nativeElement;

      component.isVisible.set(true);
      fixture.detectChanges();

      const secretValueComponent = compiled.querySelector('wc-secret-value');
      expect(secretValueComponent).toBeTruthy();
    });
  });

  describe('withCopyButton functionality', () => {
    it('should render copy button when withCopyButton is true', () => {
      const { fixture } = makeComponent('test-value', {
        uiSettings: { withCopyButton: true },
      });
      const compiled = fixture.nativeElement;

      expect(compiled.querySelector('ui5-icon[name="copy"]')).toBeTruthy();
      expect(component.withCopyButton()).toBe(true);
    });

    it('should not render copy button when withCopyButton is false', () => {
      const { fixture } = makeComponent('test-value', {
        uiSettings: { withCopyButton: false },
      });
      const compiled = fixture.nativeElement;

      expect(compiled.querySelector('ui5-icon[name="copy"]')).toBeFalsy();
      expect(component.withCopyButton()).toBe(false);
    });

    it('should not render copy button when withCopyButton is undefined', () => {
      const { fixture } = makeComponent('test-value');
      const compiled = fixture.nativeElement;

      expect(compiled.querySelector('ui5-icon[name="copy"]')).toBeFalsy();
      expect(component.withCopyButton()).toBeUndefined();
    });

    it('should copy value to clipboard when copy button is clicked', async () => {
      const writeTextSpy = jest.fn().mockResolvedValue(undefined);
      Object.assign(navigator, { clipboard: { writeText: writeTextSpy } });

      const showAlertSpy = jest.fn();
      const customLuigiClient = createMockLuigiClient(showAlertSpy);
      const { fixture } = makeComponent(
        'test-value',
        { uiSettings: { withCopyButton: true } },
        customLuigiClient,
      );

      const compiled = fixture.nativeElement;
      const copyButton = compiled.querySelector('ui5-icon[name="copy"]');

      const event = new Event('click');
      copyButton.dispatchEvent(event);
      fixture.detectChanges();

      expect(writeTextSpy).toHaveBeenCalledWith('test-value');
      expect(showAlertSpy).toHaveBeenCalledWith({
        text: 'Copied to clipboard',
        type: 'success',
        closeAfter: 2000,
      });
    });

    it('should stop event propagation when copy button is clicked', () => {
      const { fixture } = makeComponent('test-value', {
        uiSettings: { withCopyButton: true },
      });
      const compiled = fixture.nativeElement;
      const copyButton = compiled.querySelector('ui5-icon[name="copy"]');

      const event = new Event('click');
      const stopPropagationSpy = jest.spyOn(event, 'stopPropagation');

      component.copyValue(event);
      fixture.detectChanges();

      expect(stopPropagationSpy).toHaveBeenCalled();
    });
  });

  describe('displayAs plainText functionality', () => {
    it('should render plain text when displayAs is undefined', () => {
      const { fixture } = makeComponent('test-value', {
        uiSettings: { displayAs: undefined },
      });
      const compiled = fixture.nativeElement;

      expect(compiled.querySelector('wc-boolean-value')).toBeFalsy();
      expect(compiled.querySelector('wc-link-value')).toBeFalsy();
      expect(compiled.querySelector('wc-secret-value')).toBeFalsy();
      expect(compiled.textContent.trim()).toContain('test-value');
    });

    it('should not render plain text when displayAs is not plainText', () => {
      const { fixture } = makeComponent('https://example.com', {
        uiSettings: { displayAs: 'link' },
      });
      const compiled = fixture.nativeElement;

      expect(compiled.querySelector('wc-link-value')).toBeTruthy();
    });
  });

  describe('boolean normalization edge cases', () => {
    it('should handle boolean true value', () => {
      const { fixture } = makeComponent(true, {
        uiSettings: { displayAs: 'boolIcon' },
      });
      const compiled = fixture.nativeElement;

      expect(compiled.querySelector('wc-boolean-value')).toBeTruthy();
      expect(component.isBoolLike()).toBe(true);
      expect(component.boolValue()).toBe(true);
    });

    it('should handle boolean false value', () => {
      const { fixture } = makeComponent(false, {
        uiSettings: { displayAs: 'boolIcon' },
      });
      const compiled = fixture.nativeElement;

      expect(compiled.querySelector('wc-boolean-value')).toBeTruthy();
      expect(component.isBoolLike()).toBe(true);
      expect(component.boolValue()).toBe(false);
    });

    it('should handle string "True" (capitalized)', () => {
      const { fixture } = makeComponent('True', {
        uiSettings: { displayAs: 'boolIcon' },
      });
      const compiled = fixture.nativeElement;

      expect(compiled.querySelector('wc-boolean-value')).toBeTruthy();
      expect(component.isBoolLike()).toBe(true);
      expect(component.boolValue()).toBe(true);
    });

    it('should handle string "FALSE" (uppercase)', () => {
      const { fixture } = makeComponent('FALSE', {
        uiSettings: { displayAs: 'boolIcon' },
      });
      const compiled = fixture.nativeElement;

      expect(compiled.querySelector('wc-boolean-value')).toBeTruthy();
      expect(component.isBoolLike()).toBe(true);
      expect(component.boolValue()).toBe(false);
    });

    it('should handle string "TRUE" (uppercase)', () => {
      const { fixture } = makeComponent('TRUE', {
        uiSettings: { displayAs: 'boolIcon' },
      });
      const compiled = fixture.nativeElement;

      expect(compiled.querySelector('wc-boolean-value')).toBeTruthy();
      expect(component.isBoolLike()).toBe(true);
      expect(component.boolValue()).toBe(true);
    });

    it('should not treat "yes" as boolean', () => {
      const { fixture } = makeComponent('yes', {
        uiSettings: { displayAs: 'boolIcon' },
      });
      const compiled = fixture.nativeElement;

      expect(compiled.querySelector('wc-boolean-value')).toBeFalsy();
      expect(component.isBoolLike()).toBe(false);
      expect(component.boolValue()).toBeUndefined();
    });

    it('should not treat "no" as boolean', () => {
      const { fixture } = makeComponent('no');
      const compiled = fixture.nativeElement;

      expect(compiled.querySelector('wc-boolean-value')).toBeFalsy();
      expect(component.isBoolLike()).toBe(false);
      expect(component.boolValue()).toBeUndefined();
    });

    it('should not treat "1" as boolean', () => {
      const { fixture } = makeComponent('1');
      const compiled = fixture.nativeElement;

      expect(compiled.querySelector('wc-boolean-value')).toBeFalsy();
      expect(component.isBoolLike()).toBe(false);
      expect(component.boolValue()).toBeUndefined();
    });

    it('should not treat "0" as boolean', () => {
      const { fixture } = makeComponent('0');
      const compiled = fixture.nativeElement;

      expect(compiled.querySelector('wc-boolean-value')).toBeFalsy();
      expect(component.isBoolLike()).toBe(false);
      expect(component.boolValue()).toBeUndefined();
    });

    it('should handle object with toString method returning "true"', () => {
      const obj = { toString: () => 'true' };
      const { fixture } = makeComponent(obj, {
        uiSettings: { displayAs: 'boolIcon' },
      });
      const compiled = fixture.nativeElement;

      expect(compiled.querySelector('wc-boolean-value')).toBeTruthy();
      expect(component.isBoolLike()).toBe(true);
      expect(component.boolValue()).toBe(true);
    });

    it('should handle object with toString method returning "false"', () => {
      const obj = { toString: () => 'false' };
      const { fixture } = makeComponent(obj, {
        uiSettings: { displayAs: 'boolIcon' },
      });
      const compiled = fixture.nativeElement;

      expect(compiled.querySelector('wc-boolean-value')).toBeTruthy();
      expect(component.isBoolLike()).toBe(true);
      expect(component.boolValue()).toBe(false);
    });
  });

  describe('URL validation edge cases', () => {
    it('should handle valid HTTPS URL', () => {
      const { fixture } = makeComponent('https://example.com', {
        uiSettings: { displayAs: 'link' },
      });
      const compiled = fixture.nativeElement;

      expect(compiled.querySelector('wc-link-value')).toBeTruthy();
      expect(component.isUrlValue()).toBe(true);
      expect(component.stringValue()).toBe('https://example.com');
    });

    it('should handle valid HTTP URL', () => {
      const { fixture } = makeComponent('http://example.com', {
        uiSettings: { displayAs: 'link' },
      });
      const compiled = fixture.nativeElement;

      expect(compiled.querySelector('wc-link-value')).toBeTruthy();
      expect(component.isUrlValue()).toBe(true);
      expect(component.stringValue()).toBe('http://example.com');
    });

    it('should handle valid FTP URL', () => {
      const { fixture } = makeComponent('ftp://example.com', {
        uiSettings: { displayAs: 'link' },
      });
      const compiled = fixture.nativeElement;

      expect(compiled.querySelector('wc-link-value')).toBeTruthy();
      expect(component.isUrlValue()).toBe(true);
      expect(component.stringValue()).toBe('ftp://example.com');
    });

    it('should handle valid URL with port', () => {
      const { fixture } = makeComponent('https://example.com:8080', {
        uiSettings: { displayAs: 'link' },
      });
      const compiled = fixture.nativeElement;

      expect(compiled.querySelector('wc-link-value')).toBeTruthy();
      expect(component.isUrlValue()).toBe(true);
      expect(component.stringValue()).toBe('https://example.com:8080');
    });

    it('should handle valid URL with path', () => {
      const { fixture } = makeComponent(
        'https://example.com/path/to/resource',
        {
          uiSettings: { displayAs: 'link' },
        },
      );
      const compiled = fixture.nativeElement;

      expect(compiled.querySelector('wc-link-value')).toBeTruthy();
      expect(component.isUrlValue()).toBe(true);
      expect(component.stringValue()).toBe(
        'https://example.com/path/to/resource',
      );
    });

    it('should handle valid URL with query parameters', () => {
      const { fixture } = makeComponent(
        'https://example.com?param=value&other=test',
        {
          uiSettings: { displayAs: 'link' },
        },
      );
      const compiled = fixture.nativeElement;

      expect(compiled.querySelector('wc-link-value')).toBeTruthy();
      expect(component.isUrlValue()).toBe(true);
      expect(component.stringValue()).toBe(
        'https://example.com?param=value&other=test',
      );
    });

    it('should handle valid URL with fragment', () => {
      const { fixture } = makeComponent('https://example.com#section', {
        uiSettings: { displayAs: 'link' },
      });
      const compiled = fixture.nativeElement;

      expect(compiled.querySelector('wc-link-value')).toBeTruthy();
      expect(component.isUrlValue()).toBe(true);
      expect(component.stringValue()).toBe('https://example.com#section');
    });

    it('should not treat "example.com" as valid URL', () => {
      const { fixture } = makeComponent('example.com');
      const compiled = fixture.nativeElement;

      expect(compiled.querySelector('wc-link-value')).toBeFalsy();
      expect(component.isUrlValue()).toBe(false);
    });

    it('should not treat "www.example.com" as valid URL', () => {
      const { fixture } = makeComponent('www.example.com');
      const compiled = fixture.nativeElement;

      expect(compiled.querySelector('wc-link-value')).toBeFalsy();
      expect(component.isUrlValue()).toBe(false);
    });

    it('should treat "mailto:test@example.com" as valid URL for link component', () => {
      const { fixture } = makeComponent('mailto:test@example.com', {
        uiSettings: { displayAs: 'link' },
      });
      const compiled = fixture.nativeElement;

      expect(compiled.querySelector('wc-link-value')).toBeTruthy();
      expect(component.isUrlValue()).toBe(true);
    });

    it('should treat "tel:+1234567890" as valid URL for link component', () => {
      const { fixture } = makeComponent('tel:+1234567890', {
        uiSettings: { displayAs: 'link' },
      });
      const compiled = fixture.nativeElement;

      expect(compiled.querySelector('wc-link-value')).toBeTruthy();
      expect(component.isUrlValue()).toBe(true);
    });

    it('should handle malformed URL', () => {
      const { fixture } = makeComponent('https://');
      const compiled = fixture.nativeElement;

      expect(compiled.querySelector('wc-link-value')).toBeFalsy();
      expect(component.isUrlValue()).toBe(false);
    });

    it('should handle URL with invalid characters', () => {
      const { fixture } = makeComponent('https://example.com with spaces');
      const compiled = fixture.nativeElement;

      expect(compiled.querySelector('wc-link-value')).toBeFalsy();
      expect(component.isUrlValue()).toBe(false);
    });
  });

  describe('string normalization edge cases', () => {
    it('should handle string with only spaces', () => {
      const { fixture } = makeComponent('   ');
      const compiled = fixture.nativeElement;

      expect(compiled.querySelector('wc-boolean-value')).toBeFalsy();
      expect(compiled.querySelector('wc-link-value')).toBeFalsy();
      expect(component.stringValue()).toBeUndefined();
    });

    it('should handle string with tabs and newlines', () => {
      const { fixture } = makeComponent('\t\n\r');
      const compiled = fixture.nativeElement;

      expect(compiled.querySelector('wc-boolean-value')).toBeFalsy();
      expect(compiled.querySelector('wc-link-value')).toBeFalsy();
      expect(component.stringValue()).toBeUndefined();
    });

    it('should handle string with leading and trailing spaces', () => {
      const { fixture } = makeComponent('  test  ');
      const compiled = fixture.nativeElement;

      expect(compiled.querySelector('wc-boolean-value')).toBeFalsy();
      expect(compiled.querySelector('wc-link-value')).toBeFalsy();
      expect(component.stringValue()).toBe('  test  ');
    });

    it('should handle non-string values', () => {
      const { fixture } = makeComponent(123);
      const compiled = fixture.nativeElement;

      expect(compiled.querySelector('wc-boolean-value')).toBeFalsy();
      expect(compiled.querySelector('wc-link-value')).toBeFalsy();
      expect(component.stringValue()).toBeUndefined();
    });

    it('should handle object values', () => {
      const obj = { key: 'value' };
      const { fixture } = makeComponent(obj);
      const compiled = fixture.nativeElement;

      expect(compiled.querySelector('wc-boolean-value')).toBeFalsy();
      expect(compiled.querySelector('wc-link-value')).toBeFalsy();
      expect(component.stringValue()).toBeUndefined();
    });

    it('should handle array values', () => {
      const arr = ['item1', 'item2'];
      const { fixture } = makeComponent(arr);
      const compiled = fixture.nativeElement;

      expect(compiled.querySelector('wc-boolean-value')).toBeFalsy();
      expect(compiled.querySelector('wc-link-value')).toBeFalsy();
      expect(component.stringValue()).toBeUndefined();
    });
  });

  describe('complex scenarios', () => {
    it('should prioritize boolean over URL when both are valid', () => {
      const { fixture } = makeComponent('true', {
        uiSettings: { displayAs: 'boolIcon' },
      });
      const compiled = fixture.nativeElement;

      expect(compiled.querySelector('wc-boolean-value')).toBeTruthy();
      expect(compiled.querySelector('wc-link-value')).toBeFalsy();
    });

    it('should render plain text when no special rendering is needed', () => {
      const { fixture } = makeComponent('some-text', {
        uiSettings: { labelDisplay: false },
      });
      const compiled = fixture.nativeElement;
      const span = compiled.querySelector('span');

      expect(compiled.querySelector('wc-boolean-value')).toBeFalsy();
      expect(compiled.querySelector('wc-link-value')).toBeFalsy();
      expect(span.classList.contains('label-value')).toBe(false);
      expect(compiled.textContent.trim()).toBe('some-text');
    });
  });
});
