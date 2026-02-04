import { WelcomeComponent } from './welcome.component';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { I18nService, LuigiCoreService } from '@openmfp/portal-ui-lib';
import { MockedObject } from 'vitest';

describe('WelcomeComponent', () => {
  let component: WelcomeComponent;
  let i18nServiceMock: MockedObject<I18nService>;
  let luigiCoreServiceMock: MockedObject<LuigiCoreService>;
  const header = {
    title: 'Welcome',
    logo: 'logo.png',
    favicon: 'favicon.ico',
  };

  beforeEach(async () => {
    i18nServiceMock = {
      fetchTranslationFile: vi.fn(),
      translationTable: { hello: 'world' },
    } as unknown as MockedObject<I18nService>;

    luigiCoreServiceMock = {
      config: {
        settings: {
          header,
        },
      },
    } as unknown as MockedObject<LuigiCoreService>;

    await TestBed.configureTestingModule({
      imports: [WelcomeComponent],
      providers: [
        { provide: I18nService, useValue: i18nServiceMock },
        { provide: LuigiCoreService, useValue: luigiCoreServiceMock },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(WelcomeComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should set enhancedContext on init', async () => {
    component.context = signal({
      key: 'value',
    }) as any;
    i18nServiceMock.fetchTranslationFile.mockResolvedValue({ hello: 'world' });

    await component.ngOnInit();

    expect(i18nServiceMock.fetchTranslationFile).toHaveBeenCalledWith('en');
    expect(component.enhancedContext()).toEqual({
      key: 'value',
      translationTable: { hello: 'world' },
    });
    expect(component.header()).toEqual(header);
  });

  it('should handle missing header config', async () => {
    component.context = signal({
      key: 'value',
    }) as any;
    luigiCoreServiceMock.config = {};
    i18nServiceMock.fetchTranslationFile.mockResolvedValue({ hello: 'world' });

    await component.ngOnInit();

    expect(component.header()).toBeUndefined();
    expect(component.enhancedContext()).toEqual({
      key: 'value',
      translationTable: { hello: 'world' },
    });
  });
});
