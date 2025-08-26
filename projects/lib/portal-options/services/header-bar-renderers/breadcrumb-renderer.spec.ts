jest.mock('@ui5/webcomponents/dist/Breadcrumbs.js', () => ({}), { virtual: true });
jest.mock('@ui5/webcomponents/dist/BreadcrumbsItem.js', () => ({}), { virtual: true });

import { breadcrumbRenderer } from './breadcrumb-renderer';

function getChildrenByTag(el: Element, tag: string): Element[] {
  return Array.from(el.children).filter((c) => c.tagName.toLowerCase() === tag);
}

function dispatchItemClick(target: Element, detail: any) {
  const ev = new CustomEvent('item-click', { bubbles: true, cancelable: true, detail } as any);
  target.dispatchEvent(ev);
}

describe('breadcrumbRenderer', () => {
  it('should render breadcrumbs, skip hidden items, and handle click without modifiers', () => {
    const container = document.createElement('div');
    const clickSpy = jest.fn();

    const visibleItem = { label: 'Visible', node: {} } as any;
    const hiddenItem = {
      label: 'Hidden',
      node: { hideFromBreadcrumb: true },
    } as any;

    const breadcrumbs = breadcrumbRenderer(
      container,
      [hiddenItem, visibleItem],
      clickSpy,
    );

    expect(breadcrumbs).toBeTruthy();
    const bc = getChildrenByTag(container, 'ui5-breadcrumbs')[0];
    expect(bc).toBeTruthy();

    const items = getChildrenByTag(bc, 'ui5-breadcrumbs-item');
    expect(items.length).toBe(1);
    expect(items[0].textContent).toBe('Visible');

    (items[0] as any)._item = visibleItem;

    dispatchItemClick(bc, {
      item: items[0],
      ctrlKey: false,
      altKey: false,
      shiftKey: false,
      metaKey: false,
    });

    expect(clickSpy).toHaveBeenCalledWith(visibleItem);
  });

  it('should not handle click when modifier keys are pressed', () => {
    const container = document.createElement('div');
    const clickSpy = jest.fn();

    const item = { label: 'Item', node: {} } as any;

    const breadcrumbs = breadcrumbRenderer(
      container,
      [item],
      clickSpy,
    );
    expect(breadcrumbs).not.toBeNull();

    const bc = getChildrenByTag(container, 'ui5-breadcrumbs')[0];
    const items = getChildrenByTag(bc, 'ui5-breadcrumbs-item');
    (items[0] as any)._item = item;

    dispatchItemClick(bc, {
      item: items[0],
      ctrlKey: true,
      altKey: false,
      shiftKey: false,
      metaKey: false,
    });

    expect(clickSpy).not.toHaveBeenCalled();
  });
});
