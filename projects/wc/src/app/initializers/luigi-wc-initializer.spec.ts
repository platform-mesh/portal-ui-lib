import { provideLuigiWebComponents } from './luigi-wc-initializer';
import { Injector } from '@angular/core';
import { TestBed } from '@angular/core/testing';

describe('provideLuigiWebComponents', () => {
  const originalCurrentScript = document.currentScript;

  beforeEach(() => {
    Object.defineProperty(window, 'Luigi', {
      value: {
        _registerWebcomponent: vi.fn(),
      },
      writable: true,
      configurable: true,
    });

    Object.defineProperty(document, 'currentScript', {
      value: {
        getAttribute: () => 'http://localhost:12345/main.js#generic-list-view',
      },
      writable: true,
      configurable: true,
    });

    vi.clearAllMocks();
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(document, 'currentScript', {
      value: originalCurrentScript,
      writable: true,
      configurable: true,
    });

    delete (window as any).Luigi;
    vi.restoreAllMocks();
  });

  it('registers mapped components with the TestBed injector', () => {
    TestBed.configureTestingModule({
      providers: [provideLuigiWebComponents()],
    });
    TestBed.inject(Injector);

    expect((window as any).Luigi._registerWebcomponent).toHaveBeenCalled();
  });
});
