import { LinkValueComponent } from './link-value.component';
import { CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

describe('LinkValueComponent', () => {
  let component: LinkValueComponent;
  let fixture: ComponentFixture<LinkValueComponent>;

  const makeComponent = (urlValue: string) => {
    fixture = TestBed.createComponent(LinkValueComponent);
    component = fixture.componentInstance;

    fixture.componentRef.setInput('urlValue', urlValue);

    fixture.detectChanges();

    return { component, fixture };
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [LinkValueComponent],
      schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA],
    });
  });

  it('should create', () => {
    const { component } = makeComponent('https://example.com');
    expect(component).toBeTruthy();
  });

  it('should render ui5-link', () => {
    const { fixture } = makeComponent('https://example.com');
    const compiled = fixture.nativeElement;
    const linkElement = compiled.querySelector('ui5-link');

    expect(linkElement).toBeTruthy();
    expect(linkElement.textContent.trim()).toBe('Link');
  });

  it('should render ui5-link with different URL', () => {
    const { fixture } = makeComponent('http://test.com');
    const compiled = fixture.nativeElement;
    const linkElement = compiled.querySelector('ui5-link');

    expect(linkElement).toBeTruthy();
  });

  it('should call stopPropagation when link is clicked', () => {
    const { component, fixture } = makeComponent('https://example.com');
    const compiled = fixture.nativeElement;
    const linkElement = compiled.querySelector('ui5-link');

    const mockEvent = {
      stopPropagation: jest.fn(),
    };

    component.stopPropagation(mockEvent as any);

    expect(mockEvent.stopPropagation).toHaveBeenCalled();
  });

  it('should update when urlValue changes', () => {
    const { fixture } = makeComponent('https://example.com');
    const compiled = fixture.nativeElement;
    let linkElement = compiled.querySelector('ui5-link');

    expect(linkElement).toBeTruthy();

    fixture.componentRef.setInput('urlValue', 'https://newurl.com');
    fixture.detectChanges();

    linkElement = compiled.querySelector('ui5-link');
    expect(linkElement).toBeTruthy();
  });

  it('should have required urlValue input', () => {
    const { component } = makeComponent('https://example.com');
    expect(component.urlValue()).toBe('https://example.com');
  });

  it('should handle complex URLs with paths and parameters', () => {
    const complexUrl = 'https://example.com/path?param=value&other=123';
    const { fixture } = makeComponent(complexUrl);
    const compiled = fixture.nativeElement;
    const linkElement = compiled.querySelector('ui5-link');

    expect(linkElement).toBeTruthy();
  });

  it('should handle URLs with fragments', () => {
    const urlWithFragment = 'https://example.com/page#section';
    const { fixture } = makeComponent(urlWithFragment);
    const compiled = fixture.nativeElement;
    const linkElement = compiled.querySelector('ui5-link');

    expect(linkElement).toBeTruthy();
  });
});
