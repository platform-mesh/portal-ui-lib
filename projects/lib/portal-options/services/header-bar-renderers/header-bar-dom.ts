export const createElement = (tag: string, className: string): HTMLElement => {
  const element = document.createElement(tag);
  element.className = className;
  return element;
};

export const createIcon = (name: string, className: string): HTMLElement => {
  const icon = createElement('span', `${className} sap-icon--${name}`);
  icon.setAttribute('aria-hidden', 'true');
  return icon;
};
