import * as wc from './wc';
import { Component, Injector, input } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NgElementConstructor } from '@angular/elements';

@Component({ selector: 'pm-first-test-element', template: '' })
class FirstTestElement {
  firstInput = input<string>();
}

@Component({ selector: 'pm-second-test-element', template: '' })
class SecondTestElement {
  secondInput = input<string>();
}

describe('Luigi WebComponents Utils', () => {
  let originalCurrentScript: any;
  let injector: Injector;
  let _registerWebcomponent: ReturnType<typeof vi.fn>;

  const setCurrentScript = (src: string | null) => {
    Object.defineProperty(document, 'currentScript', {
      value: { getAttribute: () => src },
      writable: true,
      configurable: true,
    });
  };

  const registeredElement = (url: string): NgElementConstructor<unknown> =>
    _registerWebcomponent.mock.calls.find(
      ([calledUrl]) => calledUrl === url,
    )?.[1];

  beforeEach(() => {
    originalCurrentScript = document.currentScript;
    injector = TestBed.inject(Injector);
    _registerWebcomponent = vi.fn();
    // @ts-ignore
    window.Luigi = { _registerWebcomponent };
  });

  afterEach(() => {
    Object.defineProperty(document, 'currentScript', {
      value: originalCurrentScript,
      writable: true,
      configurable: true,
    });
  });

  it('registerLuigiWebComponent', () => {
    const src = 'src-of-the-script';
    setCurrentScript(src);

    wc.registerLuigiWebComponent(FirstTestElement, injector);

    expect(_registerWebcomponent).toHaveBeenCalledTimes(1);
    expect(registeredElement(src).observedAttributes).toEqual(['first-input']);
  });

  it('registerLuigiWebComponent with explicit url', () => {
    const url = 'http://localhost:12345/main.js#explicit';

    wc.registerLuigiWebComponent(FirstTestElement, injector, url);

    expect(_registerWebcomponent).toHaveBeenCalledTimes(1);
    expect(registeredElement(url).observedAttributes).toEqual(['first-input']);
  });

  it('registerLuigiWebComponents registers every component under its own url hash', () => {
    setCurrentScript('http://localhost:12345/main.js#component1');

    wc.registerLuigiWebComponents(
      { component1: FirstTestElement, component2: SecondTestElement },
      injector,
    );

    expect(_registerWebcomponent).toHaveBeenCalledTimes(2);
    expect(
      registeredElement('http://localhost:12345/main.js#component1')
        .observedAttributes,
    ).toEqual(['first-input']);
    expect(
      registeredElement('http://localhost:12345/main.js#component2')
        .observedAttributes,
    ).toEqual(['second-input']);
  });

  it('registerLuigiWebComponents derives the base url when the current src has no hash', () => {
    setCurrentScript('http://localhost:12345/main.js');

    wc.registerLuigiWebComponents({ component1: FirstTestElement }, injector);

    expect(_registerWebcomponent).toHaveBeenCalledTimes(1);
    expect(
      registeredElement('http://localhost:12345/main.js#component1')
        .observedAttributes,
    ).toEqual(['first-input']);
  });

  describe('getSrc', () => {
    it('should return the currentScript src when present', () => {
      setCurrentScript('http://localhost:12345/main.js#component1');
      expect(wc.getSrc()).toBe('http://localhost:12345/main.js#component1');
    });

    it('should fall back to import.meta.url when currentScript has no src', () => {
      setCurrentScript(null);
      const src = wc.getSrc();
      expect(src).toBeTruthy();
      expect(typeof src).toBe('string');
    });
  });
});
