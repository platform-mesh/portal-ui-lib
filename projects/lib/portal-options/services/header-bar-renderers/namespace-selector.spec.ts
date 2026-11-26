import {
  NamespaceSelector,
  createNamespaceSelector,
} from './namespace-selector';
import { ALL_NAMESPACE } from '@platform-mesh/portal-ui-lib/models';
import { Mock } from 'vitest';

vi.mock('@ui5/webcomponents/dist/Input.js', () => ({}));
vi.mock('@ui5/webcomponents/dist/Popover.js', () => ({}));

describe('createNamespaceSelector', () => {
  let onSelect: Mock<(value: string) => void>;
  let selector: NamespaceSelector;
  let button: HTMLElement;
  let popover: any;
  let search: any;

  const option = (value: string) =>
    selector.element.querySelector<HTMLElement>(
      `.pm-namespace-menu__option[data-value="${value}"]`,
    );
  const optionValues = () =>
    Array.from(
      selector.element.querySelectorAll<HTMLElement>(
        '.pm-namespace-menu__option',
      ),
    ).map((element) => element.dataset['value']);
  const typeSearch = (text: string) => {
    search.value = text;
    search.dispatchEvent(new Event('input'));
  };

  beforeEach(() => {
    onSelect = vi.fn();
    selector = createNamespaceSelector(onSelect);
    button = selector.element.querySelector(
      '[data-testid="namespace-selection-combobox"]',
    )!;
    popover = selector.element.querySelector('ui5-popover');
    search = selector.element.querySelector('ui5-input');
  });

  it('shows all namespaces as a view, not as a namespace', () => {
    // given
    selector.setNamespaces(['team-a', 'team-b']);

    // then
    expect(button.textContent).toBe('All namespaces');
    expect(button.querySelector('.sap-icon--dimension')).not.toBeNull();
    expect(optionValues()).toEqual([ALL_NAMESPACE, 'team-a', 'team-b']);
    expect(option(ALL_NAMESPACE)!.getAttribute('aria-selected')).toBe('true');
    expect(
      selector.element.querySelector('.pm-namespace-menu__header')!.textContent,
    ).toBe('Namespaces (2)');
  });

  it('keeps the test ids that end-to-end tests of the portal look for', () => {
    // when
    selector.setNamespaces(['team-a']);

    // then
    expect(button.getAttribute('data-testid')).toBe(
      'namespace-selection-combobox',
    );
    expect(
      selector.element.querySelector(
        '[data-testid="namespace-selection-combobox-item-team-a"]',
      ),
    ).toBe(option('team-a'));
    expect(
      selector.element.querySelector(
        '[data-testid="namespace-selection-combobox-item-all"]',
      ),
    ).toBe(option(ALL_NAMESPACE));
  });

  it('shows the selected namespace with its label', () => {
    // given
    selector.setNamespaces(['team-a', 'team-b']);

    // when
    selector.select('team-b');

    // then
    expect(button.textContent).toBe('Namespace: team-b');
    expect(button.getAttribute('data-value')).toBe('team-b');
    expect(button.querySelector('.sap-icon--folder-blank')).not.toBeNull();
    expect(option('team-b')!.getAttribute('aria-selected')).toBe('true');
    expect(option(ALL_NAMESPACE)!.getAttribute('aria-selected')).toBe('false');
  });

  it('reports the chosen namespace and closes the list', () => {
    // given
    selector.setNamespaces(['team-a']);
    popover.open = true;

    // when
    option('team-a')!.click();

    // then
    expect(onSelect).toHaveBeenCalledWith('team-a');
    expect(popover.open).toBe(false);
    expect(button.textContent).toBe('Namespace: team-a');
  });

  it('ignores clicks inside the list that miss an option', () => {
    // given
    selector.setNamespaces(['team-a']);

    // when
    selector.element
      .querySelector<HTMLElement>('.pm-namespace-menu__header')!
      .click();

    // then
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('opens and closes the list from the button', () => {
    // when
    button.click();

    // then
    expect(popover.open).toBe(true);

    // when
    popover.dispatchEvent(new Event('open'));

    // then
    expect(button.getAttribute('aria-expanded')).toBe('true');

    // when
    button.click();

    // then
    expect(popover.open).toBe(false);
  });

  it('filters namespaces by the search text', () => {
    // given
    selector.setNamespaces(['team-a', 'team-b', 'billing']);

    // when
    typeSearch('TEAM');

    // then
    expect(optionValues()).toEqual([ALL_NAMESPACE, 'team-a', 'team-b']);
  });

  it('says when no namespace matches the search', () => {
    // given
    selector.setNamespaces(['team-a']);

    // when
    typeSearch('missing');

    // then
    expect(optionValues()).toEqual([ALL_NAMESPACE]);
    expect(
      selector.element.querySelector('.pm-namespace-menu__empty')!.textContent,
    ).toBe('No matching namespaces');
  });

  it('says when the account has no namespaces', () => {
    // when
    selector.setNamespaces([]);

    // then
    expect(
      selector.element.querySelector('.pm-namespace-menu__empty')!.textContent,
    ).toBe('No namespaces');
  });

  it('clears the search when the list closes', () => {
    // given
    selector.setNamespaces(['team-a', 'team-b']);
    typeSearch('team-a');

    // when
    popover.dispatchEvent(new Event('close'));

    // then
    expect(search.value).toBe('');
    expect(optionValues()).toEqual([ALL_NAMESPACE, 'team-a', 'team-b']);
    expect(button.getAttribute('aria-expanded')).toBe('false');
  });
});
