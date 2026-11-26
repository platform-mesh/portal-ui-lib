import { createElement, createIcon } from './header-bar-dom';
import { ensureHeaderBarStyles } from './header-bar-styles';
import { ALL_NAMESPACE } from '@platform-mesh/portal-ui-lib/models';
import '@ui5/webcomponents/dist/Input.js';
import '@ui5/webcomponents/dist/Popover.js';

const allNamespacesLabel = 'All namespaces';
const allNamespacesIcon = 'dimension';
const namespaceIcon = 'folder-blank';
const arrowIcon = 'slim-arrow-down';
const checkIcon = 'accept';

export interface NamespaceSelector {
  element: HTMLElement;
  setNamespaces(namespaces: string[]): void;
  select(value: string): void;
}

export const createNamespaceSelector = (
  onSelect: (value: string) => void,
): NamespaceSelector => {
  ensureHeaderBarStyles();
  let selected = ALL_NAMESPACE;
  let namespaces: string[] = [];

  const button = createElement('button', 'pm-namespace-selector__button');
  button.setAttribute('type', 'button');
  button.setAttribute('aria-haspopup', 'listbox');
  button.setAttribute('aria-expanded', 'false');
  button.setAttribute('data-testid', 'namespace-selection-combobox');

  const allOption = createOption(
    ALL_NAMESPACE,
    allNamespacesLabel,
    allNamespacesIcon,
  );
  allOption.setAttribute(
    'data-testid',
    'namespace-selection-combobox-item-all',
  );
  const header = createElement('div', 'pm-namespace-menu__header');
  const search = createElement(
    'ui5-input',
    'pm-namespace-menu__search',
  ) as HTMLInputElement;
  search.setAttribute('placeholder', 'Search namespaces');
  search.setAttribute('data-testid', 'namespace-selection-search');
  const options = createElement('div', 'pm-namespace-menu__options');

  const menu = createElement('div', 'pm-namespace-menu');
  menu.setAttribute('role', 'listbox');
  menu.setAttribute('aria-label', 'Namespaces');
  menu.append(
    allOption,
    createElement('div', 'pm-namespace-menu__divider'),
    header,
    search,
    options,
  );

  const popover = createElement(
    'ui5-popover',
    'pm-namespace-selector__popover',
  ) as any;
  popover.setAttribute('placement', 'Bottom');
  popover.setAttribute('horizontal-align', 'Stretch');
  popover.setAttribute('hide-arrow', '');
  popover.setAttribute('data-testid', 'namespace-selection-popover');
  popover.opener = button;
  popover.appendChild(menu);

  const element = createElement('div', 'pm-namespace-selector');
  element.append(button, popover);

  const renderButton = () => {
    const isAll = selected === ALL_NAMESPACE;
    const text = createElement('span', 'pm-namespace-selector__text');
    if (!isAll) {
      const label = createElement('span', 'pm-namespace-selector__label');
      label.textContent = 'Namespace: ';
      text.appendChild(label);
    }
    const value = createElement('span', 'pm-namespace-selector__value');
    value.textContent = isAll ? allNamespacesLabel : selected;
    text.appendChild(value);

    button.title = text.textContent ?? '';
    button.setAttribute('data-value', selected);
    button.replaceChildren(
      createIcon(
        isAll ? allNamespacesIcon : namespaceIcon,
        'pm-namespace-selector__icon',
      ),
      text,
      createIcon(arrowIcon, 'pm-namespace-selector__icon'),
    );
  };

  const renderOptions = () => {
    const filter = (search.value ?? '').trim().toLowerCase();
    const matches = namespaces.filter((name) =>
      name.toLowerCase().includes(filter),
    );
    header.textContent = `Namespaces (${namespaces.length})`;

    if (matches.length) {
      options.replaceChildren(
        ...matches.map((name) => createNamespaceOption(name)),
      );
    } else {
      const empty = createElement('div', 'pm-namespace-menu__empty');
      empty.textContent = namespaces.length
        ? 'No matching namespaces'
        : 'No namespaces';
      options.replaceChildren(empty);
    }

    menu.querySelectorAll<HTMLElement>('[data-value]').forEach((option) => {
      option.setAttribute(
        'aria-selected',
        String(option.dataset['value'] === selected),
      );
    });
  };

  const select = (value: string) => {
    selected = value;
    renderButton();
    renderOptions();
  };

  button.addEventListener('click', () => {
    popover.open = !popover.open;
  });
  popover.addEventListener('open', () =>
    button.setAttribute('aria-expanded', 'true'),
  );
  popover.addEventListener('close', () => {
    button.setAttribute('aria-expanded', 'false');
    search.value = '';
    renderOptions();
  });
  search.addEventListener('input', renderOptions);
  menu.addEventListener('click', (event) => {
    const option = (event.target as HTMLElement).closest<HTMLElement>(
      '[data-value]',
    );
    if (!option) {
      return;
    }
    const value = option.dataset['value'] as string;
    popover.open = false;
    select(value);
    onSelect(value);
  });

  select(selected);

  return {
    element,
    setNamespaces(names: string[]) {
      namespaces = names;
      renderOptions();
    },
    select,
  };
};

const createNamespaceOption = (name: string): HTMLElement => {
  const option = createOption(name, name, namespaceIcon);
  option.setAttribute(
    'data-testid',
    `namespace-selection-combobox-item-${name}`,
  );
  option.title = name;
  return option;
};

const createOption = (
  value: string,
  label: string,
  icon: string,
): HTMLElement => {
  const option = createElement('button', 'pm-namespace-menu__option');
  option.setAttribute('type', 'button');
  option.setAttribute('role', 'option');
  option.dataset['value'] = value;

  const name = createElement('span', 'pm-namespace-menu__name');
  name.textContent = label;
  option.append(
    createIcon(icon, 'pm-namespace-menu__icon'),
    name,
    createIcon(checkIcon, 'pm-namespace-menu__check'),
  );

  return option;
};
