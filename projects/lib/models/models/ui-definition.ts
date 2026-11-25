import {
  ButtonSettings,
  FieldFilterDefinition,
  FormFieldDefinition,
  TableFieldDefinition,
} from '@openmfp/ngx';

export type {
  ButtonSettings,
  CssRule,
  GenericResource,
  ModalSettings,
  PropertyField,
  TransformType,
  UiSettings,
  ResourceFieldButtonClickEvent,
} from '@openmfp/ngx';

export type PlatformMeshFieldDefinition = TableFieldDefinition &
  Omit<FormFieldDefinition, 'name' | 'label'> & {
    label?: string;
    dynamicValuesDefinition?: {
      operation: string;
      gqlQuery: string;
      gqlQueryVariables?: Record<string, string>;
      value: string;
      key: string;
    };
  };

export const DOWNLOAD_KUBECONFIG_FROM_SECRET_REF_ACTION =
  'download-kubeconfig-from-secret-ref';

/**
 * `ButtonSettings` plus the extra data the kubeconfig download needs. Used
 * inside `UiView.actions[].uiSettings.buttonSettings`.
 */
export interface DownloadKubeconfigFromSecretRefButtonSettings extends ButtonSettings {
  action: typeof DOWNLOAD_KUBECONFIG_FROM_SECRET_REF_ACTION;
  /** Resource property holding the referenced Secret name. */
  resourceProperty: string;
  /** Secret `data` key to download; defaults to `kubeconfig`. */
  dataKey?: string;
  /** Download filename; defaults to `kubeconfig.yaml`. */
  filename?: string;
  /**
   * Resource property holding the Secret namespace; falls back to the
   * resource's own namespace, then the node context namespace.
   */
  namespaceProperty?: string;
}

export interface UiView {
  actions?: PlatformMeshFieldDefinition[];
  fields?: PlatformMeshFieldDefinition[];
  resourceDescription?: PlatformMeshFieldDefinition;
  resourceTitle?: PlatformMeshFieldDefinition;
  backgroundImageUrl?: string;
}

export interface UIDefinition {
  logoUrl?: string;
  listView?: ListView;
  createView?: UiView;
  detailView?: DetailView;
}

export interface ListView extends UiView {
  /** Horizontal overflow behavior for list and search tables. Defaults to Scroll. */
  overflowMode?: 'Scroll' | 'Popin';
  filters?: FieldFilterDefinition[];
  baselineFilters?: FieldFilterDefinition[];
  /**
   * Absolute path a row click navigates to, with `{resource.<dot.path>}` and
   * `{context.<dot.path>}` placeholders resolved against the clicked row and the
   * current Luigi context respectively — e.g.
   * `"/workspaces/{context.org}/components/{resource.metadata.name}"`.
   * When set, overrides the default relative navigation to the row's detail
   * view, so a flat list can link into an entity-scoped path.
   */
  resourceURL?: string;
  /**
   * List accounts from the access virtual workspace of kcp (a
   * `SelfClusterAccessReview`, asked through the GraphQL gateway) instead of
   * listing the `Account` resources: the accounts directly below the current
   * workspace that the user can access, also where the user may not list all
   * of them. Only for a list of `Account` resources.
   *
   * `true` asks the gateway endpoint `single-access`; an object names another
   * one.
   *
   * If the review cannot be answered (the virtual workspace is not installed,
   * not registered with the gateway, or fails), the list falls back to the
   * list of the resources, so the option can be turned on before every
   * installation serves the review. A list from a review is not paged; it is
   * kept up to date by a subscription to the review.
   */
  accessReview?: boolean | AccessReviewOptions;
}

export interface AccessReviewOptions {
  /** Name of the GraphQL gateway endpoint of the access virtual workspace. Defaults to `single-access`. */
  gatewayCluster?: string;
}

export interface DetailView extends UiView {
  showDownloadKubeconfig?: boolean;
}
