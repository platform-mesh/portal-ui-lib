export type TransformType =
  | 'uppercase'
  | 'lowercase'
  | 'capitalize'
  | 'decode'
  | 'encode';

export interface PropertyField {
  key: string;
  transform?: TransformType[];
}

export interface UiSettings {
  labelDisplay?: boolean;
  displayAs?: 'secret' | 'boolIcon' | 'link' | 'tooltip' | 'img' | 'button';
  buttonSettings?: ButtonSettings;
  tooltipIcon?: string;
  withCopyButton?: boolean;
  cssCustomization?: Partial<CSSStyleDeclaration>;
  cssRules?: CssRule[];
}

export interface ButtonSettings {
  text?: string;
  icon?: string;
  endIcon?: string;
  design?:
    | 'Default'
    | 'Positive'
    | 'Negative'
    | 'Transparent'
    | 'Emphasized'
    | 'Attention';
  tooltip?: string;
  action: 'openInModal' | 'navigate';
  modalSettings?: ModalSettings;
}

export interface ModalSettings {
  title?: string;
  size?: 'fullscreen' | 'l' | 'm' | 's'; // ze of the modal
  width?: string; //updates the width of the modal. Allowed units are 'px', '%', 'rem', 'em', 'vh' and 'vw
  height?: string; //updates the height of the modal. Allowed units are 'px', '%', 'rem', 'em', 'vh' and 'vw
}

export type CssRuleCondition =
  | 'equals'
  | 'notEquals'
  | 'greaterThan'
  | 'greaterThanOrEqual'
  | 'lessThan'
  | 'lessThanOrEqual'
  | 'contains';

export interface CssRule {
  if: { condition: CssRuleCondition; value: string };
  styles: Partial<CSSStyleDeclaration>;
}

export interface FieldDefinition {
  label?: string;
  property?: string | string[];
  propertyField?: PropertyField;
  jsonPathExpression?: string;
  required?: boolean;
  values?: string[];
  value?: string;
  group?: {
    name: string;
    label?: string;
    delimiter?: string;
    multiline?: boolean;
  };
  uiSettings?: UiSettings;
  dynamicValuesDefinition?: {
    operation: string;
    gqlQuery: string;
    value: string;
    key: string;
  };
}

interface UiView {
  actions?: FieldDefinition[];
  fields?: FieldDefinition[];
  resourceDescription?: FieldDefinition;
  resourceTitle?: FieldDefinition;
}

export interface UIDefinition {
  logoUrl?: string;
  listView?: UiView;
  createView?: UiView;
  detailView?: DetailView;
}

export interface DetailView extends UiView {
  showDownloadKubeconfig?: boolean;
}
