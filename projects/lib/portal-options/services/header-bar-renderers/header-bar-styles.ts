const styleElementId = 'pm-header-bar-styles';

const styles = `
.fd-tool-layout .lui-breadcrumb-container.lui-breadcrumb-container:has(.pm-breadcrumbs) {
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding-top: 0.5rem;
  padding-right: 1rem;
  padding-bottom: 0.5rem;
  margin-bottom: 0.5rem;
  background: var(--sapObjectHeader_Background);
  border-bottom: 1px solid var(--sapGroup_TitleBorderColor);
  box-shadow: var(--sapContent_HeaderShadow);
}

.lui-breadcrumb-container > div {
  min-width: 0;
}

.pm-breadcrumbs-container {
  display: flex;
  align-items: center;
  width: 100%;
  min-width: 0;
}

.pm-breadcrumbs {
  min-width: 0;
  font-family: var(--sapFontFamily);
  font-size: var(--sapFontSize);
}

.pm-breadcrumbs__list {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  min-width: 0;
  margin: 0;
  padding: 0 0 0 0.5rem;
  list-style: none;
}

.pm-breadcrumbs__item {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  min-width: 0;
}

.pm-breadcrumbs__separator {
  flex: none;
  font-size: 0.75rem;
  color: var(--sapContent_LabelColor);
  opacity: 0.6;
}

.pm-breadcrumbs__link,
.pm-breadcrumbs__current {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  min-width: 0;
}

.pm-breadcrumbs__link {
  border-radius: 0.25rem;
  color: var(--sapLinkColor);
  text-decoration: none;
}

.pm-breadcrumbs__link:hover .pm-breadcrumbs__label {
  text-decoration: underline;
}

.pm-breadcrumbs__link:focus-visible,
.pm-namespace-selector__button:focus-visible,
.pm-namespace-menu__option:focus-visible {
  outline: var(--sapContent_FocusWidth) var(--sapContent_FocusStyle) var(--sapContent_FocusColor);
  outline-offset: 1px;
}

.pm-breadcrumbs__current {
  color: var(--sapTextColor);
  font-weight: bold;
}

.pm-breadcrumbs__icon {
  flex: none;
  font-size: 1rem;
}

.pm-breadcrumbs__avatar {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 50%;
  background: var(--sapAccentColor6);
  color: var(--sapContent_ContrastTextColor);
  font-size: 0.6875rem;
  font-weight: bold;
}

.pm-breadcrumbs__label {
  max-width: 14rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pm-namespace-selector {
  display: flex;
  max-width: 100%;
}

.pm-namespace-selector__button {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  width: 17rem;
  max-width: 100%;
  box-sizing: border-box;
  padding: 0.375rem 0.75rem;
  border: 1px solid var(--sapButton_BorderColor);
  border-radius: 0.5rem;
  background: var(--sapButton_Background);
  color: var(--sapTextColor);
  font-family: var(--sapFontFamily);
  font-size: var(--sapFontSize);
  text-align: left;
  cursor: pointer;
}

.pm-namespace-selector__button:hover {
  background: var(--sapButton_Hover_Background);
}

.pm-namespace-selector__icon,
.pm-namespace-menu__icon {
  flex: none;
  color: var(--sapContent_IconColor);
}

.pm-namespace-selector__text,
.pm-namespace-menu__name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pm-namespace-selector__label {
  color: var(--sapContent_LabelColor);
}

.pm-namespace-selector__value {
  font-weight: bold;
}

.pm-namespace-selector__popover::part(content) {
  padding: 0.25rem;
}

.pm-namespace-menu {
  display: flex;
  flex-direction: column;
  font-family: var(--sapFontFamily);
  font-size: var(--sapFontSize);
}

.pm-namespace-menu__option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  box-sizing: border-box;
  padding: 0.5rem 0.75rem;
  border: 0;
  border-radius: 0.375rem;
  background: transparent;
  color: var(--sapTextColor);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.pm-namespace-menu__option:hover {
  background: var(--sapList_Hover_Background);
}

.pm-namespace-menu__option[aria-selected='true'] {
  background: var(--sapList_SelectionBackgroundColor);
  font-weight: bold;
}

.pm-namespace-menu__check {
  flex: none;
  color: var(--sapSelectedColor);
  visibility: hidden;
}

.pm-namespace-menu__option[aria-selected='true'] .pm-namespace-menu__check {
  visibility: visible;
}

.pm-namespace-menu__divider {
  height: 1px;
  margin: 0.375rem 0;
  background: var(--sapGroup_TitleBorderColor);
}

.pm-namespace-menu__header {
  padding: 0.25rem 0.75rem;
  color: var(--sapContent_LabelColor);
  font-size: var(--sapFontSmallSize);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.pm-namespace-menu__search {
  width: auto;
  margin: 0.25rem 0.5rem;
}

.pm-namespace-menu__options {
  max-height: 18rem;
  overflow-y: auto;
}

.pm-namespace-menu__empty {
  padding: 0.5rem 0.75rem;
  color: var(--sapContent_LabelColor);
}
`;

export const ensureHeaderBarStyles = (): void => {
  if (document.getElementById(styleElementId)) {
    return;
  }

  const style = document.createElement('style');
  style.id = styleElementId;
  style.textContent = styles;
  document.head.appendChild(style);
};
