import { ComponentFixture, TestBed } from '@angular/core/testing';
import { I18nService, LuigiCoreService } from '@openmfp/portal-ui-lib';
import {
  ButtonComponent,
  IllustratedMessageComponent,
  TitleComponent,
} from '@ui5/webcomponents-ngx';
import { ErrorComponent } from './error.component';
import { ButtonConfig } from './models/error.model';

describe('ErrorComponent', () => {
  let component: ErrorComponent;
  let fixture: ComponentFixture<ErrorComponent>;
  let i18nServiceMock: jest.Mocked<I18nService>;
  let luigiCoreServiceMock: jest.Mocked<LuigiCoreService>;

  beforeEach(async () => {
    i18nServiceMock = {
      getTranslationAsync: jest.fn().mockResolvedValue('translated text'),
      translationTable: {},
    } as any;

    luigiCoreServiceMock = {
      navigation: jest.fn().mockReturnValue({
        navigate: jest.fn(),
      }),
      showAlert: jest.fn(),
    } as any;

    await TestBed.configureTestingModule({
      imports: [
        ErrorComponent,
        IllustratedMessageComponent,
        ButtonComponent,
        TitleComponent,
      ],
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
    it('should open URL in new tab', () => {
      const windowSpy = jest.spyOn(window, 'open').mockImplementation();
      const button: ButtonConfig = { url: 'https://test.com' };

      component.goTo(button);
      expect(windowSpy).toHaveBeenCalledWith('https://test.com', '_blank');
    });

    it('should navigate using LuigiCore when route is provided', () => {
      const button: ButtonConfig = { route: { context: 'test-route' } };
      const navigateSpy = jest.fn();
      jest
        .spyOn(luigiCoreServiceMock, 'navigation')
        .mockReturnValue({ navigate: navigateSpy });

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
