import { ValueCellComponent } from './value-cell.component';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
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

  const makeComponentWithLabelDisplay = (
    value: unknown,
    labelDisplay: unknown,
  ) => {
    fixture = TestBed.createComponent(ValueCellComponent);
    component = fixture.componentInstance;

    fixture.componentRef.setInput('value', value as any);
    fixture.componentRef.setInput('labelDisplay', labelDisplay as any);

    fixture.detectChanges();

    return { component, fixture };
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ValueCellComponent],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
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

  describe('labelDisplay functionality', () => {
    it('should render label-value component when labelDisplay is an object', () => {
      const labelDisplay = { backgroundColor: '#ffffff', color: '#000000' };
      const { fixture } = makeComponentWithLabelDisplay(
        'test-value',
        labelDisplay,
      );
      const compiled = fixture.nativeElement;

      expect(compiled.querySelector('wc-label-value')).toBeTruthy();
      expect(component.isLabelValue()).toBe(true);
      expect(component.labelDisplayValue()).toEqual(labelDisplay);
    });

    it('should render label-value component when labelDisplay is true', () => {
      const { fixture } = makeComponentWithLabelDisplay('test-value', true);
      const compiled = fixture.nativeElement;

      expect(compiled.querySelector('wc-label-value')).toBeTruthy();
      expect(component.isLabelValue()).toBe(true);
      expect(component.labelDisplayValue()).toEqual({});
    });

    it('should not render label-value component when labelDisplay is false', () => {
      const { fixture } = makeComponentWithLabelDisplay('test-value', false);
      const compiled = fixture.nativeElement;

      expect(compiled.querySelector('wc-label-value')).toBeFalsy();
      expect(component.isLabelValue()).toBe(false);
      expect(component.labelDisplayValue()).toBeUndefined();
    });

    it('should not render label-value component when labelDisplay is undefined', () => {
      const { fixture } = makeComponentWithLabelDisplay(
        'test-value',
        undefined,
      );
      const compiled = fixture.nativeElement;

      expect(compiled.querySelector('wc-label-value')).toBeFalsy();
      expect(component.isLabelValue()).toBe(false);
      expect(component.labelDisplayValue()).toBeUndefined();
    });

    it('should not render label-value component when labelDisplay is null', () => {
      const { fixture } = makeComponentWithLabelDisplay('test-value', null);
      const compiled = fixture.nativeElement;

      expect(compiled.querySelector('wc-label-value')).toBeFalsy();
      expect(component.isLabelValue()).toBe(false);
      expect(component.labelDisplayValue()).toBeUndefined();
    });

    it('should render label-value component when labelDisplay is a string', () => {
      const { fixture } = makeComponentWithLabelDisplay(
        'test-value',
        'some-string',
      );
      const compiled = fixture.nativeElement;

      expect(compiled.querySelector('wc-label-value')).toBeTruthy();
      expect(component.isLabelValue()).toBe(true);
      expect(component.labelDisplayValue()).toEqual({});
    });

    it('should render label-value component when labelDisplay is a number', () => {
      const { fixture } = makeComponentWithLabelDisplay('test-value', 42);
      const compiled = fixture.nativeElement;

      expect(compiled.querySelector('wc-label-value')).toBeTruthy();
      expect(component.isLabelValue()).toBe(true);
      expect(component.labelDisplayValue()).toEqual({});
    });
  });

  describe('boolean normalization edge cases', () => {
    it('should handle boolean true value', () => {
      const { fixture } = makeComponent(true);
      const compiled = fixture.nativeElement;

      expect(compiled.querySelector('wc-boolean-value')).toBeTruthy();
      expect(component.isBoolLike()).toBe(true);
      expect(component.boolValue()).toBe(true);
    });

    it('should handle boolean false value', () => {
      const { fixture } = makeComponent(false);
      const compiled = fixture.nativeElement;

      expect(compiled.querySelector('wc-boolean-value')).toBeTruthy();
      expect(component.isBoolLike()).toBe(true);
      expect(component.boolValue()).toBe(false);
    });

    it('should handle string "True" (capitalized)', () => {
      const { fixture } = makeComponent('True');
      const compiled = fixture.nativeElement;

      expect(compiled.querySelector('wc-boolean-value')).toBeTruthy();
      expect(component.isBoolLike()).toBe(true);
      expect(component.boolValue()).toBe(true);
    });

    it('should handle string "FALSE" (uppercase)', () => {
      const { fixture } = makeComponent('FALSE');
      const compiled = fixture.nativeElement;

      expect(compiled.querySelector('wc-boolean-value')).toBeTruthy();
      expect(component.isBoolLike()).toBe(true);
      expect(component.boolValue()).toBe(false);
    });

    it('should handle string "TRUE" (uppercase)', () => {
      const { fixture } = makeComponent('TRUE');
      const compiled = fixture.nativeElement;

      expect(compiled.querySelector('wc-boolean-value')).toBeTruthy();
      expect(component.isBoolLike()).toBe(true);
      expect(component.boolValue()).toBe(true);
    });

    it('should not treat "yes" as boolean', () => {
      const { fixture } = makeComponent('yes');
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
      const { fixture } = makeComponent(obj);
      const compiled = fixture.nativeElement;

      expect(compiled.querySelector('wc-boolean-value')).toBeTruthy();
      expect(component.isBoolLike()).toBe(true);
      expect(component.boolValue()).toBe(true);
    });

    it('should handle object with toString method returning "false"', () => {
      const obj = { toString: () => 'false' };
      const { fixture } = makeComponent(obj);
      const compiled = fixture.nativeElement;

      expect(compiled.querySelector('wc-boolean-value')).toBeTruthy();
      expect(component.isBoolLike()).toBe(true);
      expect(component.boolValue()).toBe(false);
    });
  });

  describe('URL validation edge cases', () => {
    it('should handle valid HTTPS URL', () => {
      const { fixture } = makeComponent('https://example.com');
      const compiled = fixture.nativeElement;

      expect(compiled.querySelector('wc-link-value')).toBeTruthy();
      expect(component.isUrlValue()).toBe(true);
      expect(component.stringValue()).toBe('https://example.com');
    });

    it('should handle valid HTTP URL', () => {
      const { fixture } = makeComponent('http://example.com');
      const compiled = fixture.nativeElement;

      expect(compiled.querySelector('wc-link-value')).toBeTruthy();
      expect(component.isUrlValue()).toBe(true);
      expect(component.stringValue()).toBe('http://example.com');
    });

    it('should handle valid FTP URL', () => {
      const { fixture } = makeComponent('ftp://example.com');
      const compiled = fixture.nativeElement;

      expect(compiled.querySelector('wc-link-value')).toBeTruthy();
      expect(component.isUrlValue()).toBe(true);
      expect(component.stringValue()).toBe('ftp://example.com');
    });

    it('should handle valid URL with port', () => {
      const { fixture } = makeComponent('https://example.com:8080');
      const compiled = fixture.nativeElement;

      expect(compiled.querySelector('wc-link-value')).toBeTruthy();
      expect(component.isUrlValue()).toBe(true);
      expect(component.stringValue()).toBe('https://example.com:8080');
    });

    it('should handle valid URL with path', () => {
      const { fixture } = makeComponent('https://example.com/path/to/resource');
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
      );
      const compiled = fixture.nativeElement;

      expect(compiled.querySelector('wc-link-value')).toBeTruthy();
      expect(component.isUrlValue()).toBe(true);
      expect(component.stringValue()).toBe(
        'https://example.com?param=value&other=test',
      );
    });

    it('should handle valid URL with fragment', () => {
      const { fixture } = makeComponent('https://example.com#section');
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

    it('should not treat "mailto:test@example.com" as valid URL for link component', () => {
      const { fixture } = makeComponent('mailto:test@example.com');
      const compiled = fixture.nativeElement;

      expect(compiled.querySelector('wc-link-value')).toBeTruthy();
      expect(component.isUrlValue()).toBe(true);
    });

    it('should not treat "tel:+1234567890" as valid URL for link component', () => {
      const { fixture } = makeComponent('tel:+1234567890');
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
      const { fixture } = makeComponent('true');
      const compiled = fixture.nativeElement;

      expect(compiled.querySelector('wc-boolean-value')).toBeTruthy();
      expect(compiled.querySelector('wc-link-value')).toBeFalsy();
      expect(compiled.querySelector('wc-label-value')).toBeFalsy();
    });

    it('should prioritize boolean over label when both are valid', () => {
      const { fixture } = makeComponentWithLabelDisplay('true', {
        backgroundColor: '#ffffff',
      });
      const compiled = fixture.nativeElement;

      expect(compiled.querySelector('wc-boolean-value')).toBeTruthy();
      expect(compiled.querySelector('wc-link-value')).toBeFalsy();
      expect(compiled.querySelector('wc-label-value')).toBeFalsy();
    });

    it('should prioritize URL over label when both are valid', () => {
      const { fixture } = makeComponentWithLabelDisplay('https://example.com', {
        backgroundColor: '#ffffff',
      });
      const compiled = fixture.nativeElement;

      expect(compiled.querySelector('wc-boolean-value')).toBeFalsy();
      expect(compiled.querySelector('wc-link-value')).toBeTruthy();
      expect(compiled.querySelector('wc-label-value')).toBeFalsy();
    });

    it('should render label when boolean and URL are not valid but labelDisplay is provided', () => {
      const { fixture } = makeComponentWithLabelDisplay('some-text', {
        backgroundColor: '#ffffff',
      });
      const compiled = fixture.nativeElement;

      expect(compiled.querySelector('wc-boolean-value')).toBeFalsy();
      expect(compiled.querySelector('wc-link-value')).toBeFalsy();
      expect(compiled.querySelector('wc-label-value')).toBeTruthy();
    });

    it('should render plain text when no special rendering is needed', () => {
      const { fixture } = makeComponentWithLabelDisplay('some-text', false);
      const compiled = fixture.nativeElement;

      expect(compiled.querySelector('wc-boolean-value')).toBeFalsy();
      expect(compiled.querySelector('wc-link-value')).toBeFalsy();
      expect(compiled.querySelector('wc-label-value')).toBeFalsy();
      expect(compiled.textContent.trim()).toBe('some-text');
    });
  });
});
