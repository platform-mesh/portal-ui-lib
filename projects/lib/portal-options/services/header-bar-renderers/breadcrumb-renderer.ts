import { createElement, createIcon } from './header-bar-dom';
import { ensureHeaderBarStyles } from './header-bar-styles';

const homeIcon = 'home';
const separatorIcon = 'slim-arrow-right';
const iconNamePattern = /^[a-z0-9-]+$/;
const dynamicPathSegmentPrefix = ':';

export const breadcrumbRenderer = (
  containerElement: HTMLElement,
  nodeItems: any[],
  clickHandler: (item: any) => void,
): HTMLElement => {
  ensureHeaderBarStyles();
  containerElement.classList.add('pm-breadcrumbs-container');

  const items = nodeItems.filter((item) => !item.node?.hideFromBreadcrumb);
  const list = createElement('ol', 'pm-breadcrumbs__list');
  items.forEach((item, index) => {
    const listItem = createElement('li', 'pm-breadcrumbs__item');
    if (index > 0) {
      listItem.appendChild(
        createIcon(separatorIcon, 'pm-breadcrumbs__separator'),
      );
    }
    listItem.appendChild(
      index === items.length - 1
        ? createCurrent(item)
        : createLink(item, index === 0, clickHandler),
    );
    list.appendChild(listItem);
  });

  const nav = createElement('nav', 'pm-breadcrumbs');
  nav.setAttribute('aria-label', 'Breadcrumb');
  nav.appendChild(list);
  containerElement.appendChild(nav);

  return nav;
};

const createLink = (
  item: any,
  isHome: boolean,
  clickHandler: (item: any) => void,
): HTMLElement => {
  const link = createElement('a', 'pm-breadcrumbs__link');
  if (item.route) {
    link.setAttribute('href', item.route);
  }
  link.title = item.label ?? '';
  link.addEventListener('click', (event: MouseEvent) => {
    if (event.ctrlKey || event.altKey || event.shiftKey || event.metaKey) {
      return;
    }
    event.preventDefault();
    clickHandler(item);
  });

  if (isHome) {
    link.setAttribute('aria-label', item.label ?? '');
    link.appendChild(createIcon(homeIcon, 'pm-breadcrumbs__icon'));
  } else {
    link.append(...createContent(item));
  }

  return link;
};

const createCurrent = (item: any): HTMLElement => {
  const current = createElement('span', 'pm-breadcrumbs__current');
  current.setAttribute('aria-current', 'page');
  current.append(...createContent(item));
  return current;
};

const createContent = (item: any): HTMLElement[] => {
  const label = createElement('span', 'pm-breadcrumbs__label');
  label.textContent = item.label ?? '';
  label.title = item.label ?? '';

  const marker = createMarker(item);
  return marker ? [marker, label] : [label];
};

const createMarker = (item: any): HTMLElement | undefined => {
  if (isEntityInstance(item)) {
    const avatar = createElement('span', 'pm-breadcrumbs__avatar');
    avatar.setAttribute('aria-hidden', 'true');
    avatar.textContent = item.label.charAt(0).toUpperCase();
    return avatar;
  }

  const icon = item.node?.icon;
  return typeof icon === 'string' && iconNamePattern.test(icon)
    ? createIcon(icon, 'pm-breadcrumbs__icon')
    : undefined;
};

const isEntityInstance = (item: any): boolean =>
  !item.pending &&
  !!item.label &&
  !!item.node?.pathSegment?.startsWith(dynamicPathSegmentPrefix);
