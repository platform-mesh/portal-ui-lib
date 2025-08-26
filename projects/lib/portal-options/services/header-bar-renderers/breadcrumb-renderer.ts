import '@ui5/webcomponents/dist/Breadcrumbs.js';
import '@ui5/webcomponents/dist/BreadcrumbsItem.js';

export const breadcrumbRenderer = (
  containerElement: HTMLElement,
  nodeItems: any[],
  clickHandler: (item: any) => void,
): HTMLElement => {
  containerElement.style.width = '100%';

  const ui5breadcrumbs = document.createElement('ui5-breadcrumbs');
  ui5breadcrumbs.setAttribute('separators', 'Slash');
  containerElement.appendChild(ui5breadcrumbs);

  nodeItems.forEach((item) => {
    if (item.node?.hideFromBreadcrumb) {
      return;
    }

    const itemCmp = document.createElement('ui5-breadcrumbs-item');
    itemCmp.textContent = item.label ?? '';
    (itemCmp as any)._item = item;
    ui5breadcrumbs.appendChild(itemCmp);
  });

  ui5breadcrumbs.addEventListener('item-click', (event: any) => {
    if (
      !(
        event.detail.ctrlKey ||
        event.detail.altKey ||
        event.detail.shiftKey ||
        event.detail.metaKey
      )
    ) {
      event.preventDefault();
      clickHandler(event.detail.item._item);
    }
  });

  return ui5breadcrumbs;
};
