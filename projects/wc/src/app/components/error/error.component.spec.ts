import { ErrorComponent } from './error.component';
import { ButtonConfig } from './models/error.model';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { I18nService, LuigiCoreService } from '@openmfp/portal-ui-lib';
import { MockedObject } from 'vitest';

describe('ErrorComponent', () => {
  let component: ErrorComponent;
  let fixture: ComponentFixture<ErrorComponent>;
  let i18nServiceMock: MockedObject<I18nService>;
  let luigiCoreServiceMock: MockedObject<LuigiCoreService>;

  beforeEach(async () => {
    i18nServiceMock = {
      getTranslationAsync: vi.fn().mockResolvedValue('translated text'),
      translationTable: {},
    } as any;

    luigiCoreServiceMock = {
      navigation: vi.fn().mockReturnValue({
        navigate: vi.fn(),
      }),
      showAlert: vi.fn(),
    } as any;

    await TestBed.configureTestingModule({
      imports: [ErrorComponent],
      providers: [
        { provide: I18nService, useValue: i18nServiceMock },
        { provide: LuigiCoreService, useValue: luigiCoreServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ErrorComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('goTo', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should open URL in new tab', () => {
      const windowSpy = vi
        .spyOn(window, 'open')
        .mockImplementation((str1, str2) => {
          return null;
        });
      const button: ButtonConfig = { url: 'https://test.com' };

      component.goTo(button);
      expect(windowSpy).toHaveBeenCalledWith('https://test.com', '_blank');
    });

    it('should navigate using LuigiCore when route is provided', () => {
      const button: ButtonConfig = { route: { context: 'test-route' } };
      const navigateSpy = vi.fn();
      vi.spyOn(luigiCoreServiceMock, 'navigation').mockReturnValue({
        navigate: navigateSpy,
      });

      component.goTo(button);
      expect(navigateSpy).toHaveBeenCalledWith('/test-route');
    });
  });

  describe('setSceneConfig', () => {
    it('should set 404 config', async () => {
      const testContext = {
        id: '404',
        translationTable: {},
      };

      fixture.componentRef.setInput('context', testContext);

      await component.ngOnInit();
      expect(component.config().scene).toBe('NoEntries');
      expect(component.config().illustratedMessageTitle).toBe(
        'translated text',
      );
      expect(component.config().illustratedMessageText).toBe('translated text');
      expect(component.config().buttons).toBeDefined();
    });

    it('should set 403 config', async () => {
      const testContext = {
        id: '403',
        translationTable: {},
      };

      fixture.componentRef.setInput('context', testContext);

      await component.ngOnInit();
      expect(component.config().scene).toBe('tnt/UnsuccessfulAuth');
      expect(component.config().illustratedMessageTitle).toBe(
        'You are not authorized to access this content.',
      );
      expect(component.config().illustratedMessageText).toBe('');
      expect(component.config().buttons).toBeDefined();
      expect(component.config().buttons?.length).toBe(0);
    });

    it('should set 422 config', async () => {
      const testContext = {
        id: '422',
        translationTable: {},
      };

      fixture.componentRef.setInput('context', testContext);

      await component.ngOnInit();
      expect(component.config().scene).toBe('tnt/NoApplications');
      expect(component.config().illustratedMessageTitle).toBe(
        'The resource is pending deletion.',
      );
      expect(component.config().illustratedMessageText).toBe('');
      expect(component.config().buttons).toBeDefined();
      expect(component.config().buttons?.length).toBe(0);
    });

    it('should set 503 config', async () => {
      const testContext = {
        id: '503',
        translationTable: {},
      };

      fixture.componentRef.setInput('context', testContext);

      await component.ngOnInit();
      expect(component.config().scene).toBe('UnableToLoad');
      expect(component.config().illustratedMessageTitle).toBe(
        'Organization is not ready yet',
      );
      expect(component.config().illustratedMessageText).toBe(
        'Please try again later.',
      );
      expect(component.config().buttons).toBeDefined();
      expect(component.config().buttons?.length).toBe(0);
    });

    it('should set default error config for unknown error code', async () => {
      const testContext = {
        id: '500',
        translationTable: {},
      };

      fixture.componentRef.setInput('context', testContext);

      await component.ngOnInit();
      expect(component.config().scene).toBe('UnableToLoad');
      expect(component.config().illustratedMessageTitle).toBe(
        'translated text',
      );
      expect(component.config().illustratedMessageText).toBe('');
      expect(component.config().buttons).toBeDefined();
    });
  });
});
