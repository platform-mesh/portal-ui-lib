import { breadcrumbRenderer } from './breadcrumb-renderer';
import { Mock } from 'vitest';

describe('breadcrumbRenderer', () => {
  let container: HTMLElement;
  let clickSpy: Mock<(item: any) => void>;

  const home = { label: 'Home', route: '/home', node: { icon: 'account' } };
  const accounts = {
    label: 'Accounts',
    route: '/home/accounts',
    node: { icon: 'product', pathSegment: 'accounts' },
  };
  const account = {
    label: 'account-gamma',
    route: '/home/accounts/account-gamma',
    node: { pathSegment: ':accountId' },
  };
  const page = {
    label: 'Http Bins',
    route: '/home/accounts/account-gamma/httpbins',
    node: { icon: 'paint-bucket', pathSegment: 'httpbins' },
  };

  const links = () =>
    Array.from(
      container.querySelectorAll<HTMLElement>('.pm-breadcrumbs__link'),
    );
  const current = () =>
    container.querySelector<HTMLElement>('.pm-breadcrumbs__current')!;

  beforeEach(() => {
    container = document.createElement('div');
    clickSpy = vi.fn();
  });

  it('renders home as an icon, links for the parents and the current page last', () => {
    // when
    const nav = breadcrumbRenderer(
      container,
      [home, accounts, account, page],
      clickSpy,
    );

    // then
    expect(nav.getAttribute('aria-label')).toBe('Breadcrumb');
    expect(links().map((link) => link.getAttribute('href'))).toEqual([
      '/home',
      '/home/accounts',
      '/home/accounts/account-gamma',
    ]);
    expect(links()[0].getAttribute('aria-label')).toBe('Home');
    expect(links()[0].querySelector('.sap-icon--home')).not.toBeNull();
    expect(links()[0].textContent).toBe('');
    expect(current().textContent).toBe('Http Bins');
    expect(current().getAttribute('aria-current')).toBe('page');
    expect(
      container.querySelectorAll('.pm-breadcrumbs__separator').length,
    ).toBe(3);
  });

  it('shows the navigation icon of a node and an initial for an entity', () => {
    // when
    breadcrumbRenderer(container, [home, accounts, account, page], clickSpy);

    // then
    expect(links()[1].querySelector('.sap-icon--product')).not.toBeNull();
    expect(
      links()[2].querySelector('.pm-breadcrumbs__avatar')!.textContent,
    ).toBe('A');
    expect(current().querySelector('.sap-icon--paint-bucket')).not.toBeNull();
  });

  it('shows no marker for a pending entity or an icon that is not a plain name', () => {
    // given
    const pendingAccount = { ...account, label: '...', pending: true };
    const imageIconPage = {
      ...page,
      node: { icon: 'https://example.com/icon.png' },
    };

    // when
    breadcrumbRenderer(
      container,
      [home, pendingAccount, imageIconPage],
      clickSpy,
    );

    // then
    expect(container.querySelector('.pm-breadcrumbs__avatar')).toBeNull();
    expect(current().querySelector('[class*="sap-icon--"]')).toBeNull();
  });

  it('skips items hidden from the breadcrumb', () => {
    // given
    const hidden = { label: 'Hidden', node: { hideFromBreadcrumb: true } };

    // when
    breadcrumbRenderer(container, [home, hidden, page], clickSpy);

    // then
    expect(container.textContent).not.toContain('Hidden');
    expect(links().length).toBe(1);
  });

  it('keeps the full name on hover for labels cut by the ellipsis', () => {
    // when
    breadcrumbRenderer(container, [home, account, page], clickSpy);

    // then
    expect(
      links()[1].querySelector('.pm-breadcrumbs__label')!.getAttribute('title'),
    ).toBe('account-gamma');
  });

  it('navigates through the portal on a plain click', () => {
    // given
    breadcrumbRenderer(container, [home, accounts, page], clickSpy);
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });

    // when
    links()[1].dispatchEvent(event);

    // then
    expect(clickSpy).toHaveBeenCalledWith(accounts);
    expect(event.defaultPrevented).toBe(true);
  });

  it('leaves a click with a modifier key to the browser', () => {
    // given
    breadcrumbRenderer(container, [home, accounts, page], clickSpy);
    const event = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      ctrlKey: true,
    });

    // when
    links()[1].dispatchEvent(event);

    // then
    expect(clickSpy).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });
});
