import { WelcomeComponent } from './welcome.component';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { I18nService } from '@openmfp/portal-ui-lib';

describe('WelcomeComponent', () => {
  let component: WelcomeComponent;
  let i18nService: jest.Mocked<I18nService>;

  beforeEach(async () => {
    i18nService = {
      fetchTranslationFile: jest.fn(),
      translationTable: { hello: 'world' },
    } as unknown as jest.Mocked<I18nService>;

    await TestBed.configureTestingModule({
      imports: [WelcomeComponent],
      providers: [{ provide: I18nService, useValue: i18nService }],
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
    i18nService.fetchTranslationFile.mockResolvedValue({ hello: 'world' });

    await component.ngOnInit();

    expect(i18nService.fetchTranslationFile).toHaveBeenCalledWith('en');
    expect(component.enhancedContext()).toEqual({
      key: 'value',
      translationTable: { hello: 'world' },
    });
  });
});
