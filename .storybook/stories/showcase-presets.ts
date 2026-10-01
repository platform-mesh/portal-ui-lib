/**
 * Shared ResourceNodeContext presets for Storybook stories.
 * Each preset represents a common real-world configuration variant.
 */
import {
  CANNED_CLUSTER_RESOURCE,
  MANY_CLUSTER_RESOURCES,
  makeFakeLuigiClient,
} from './showcase-mocks';
import { LuigiClient } from '@luigi-project/client/luigi-element';
import { ResourceDefinition } from '@platform-mesh/portal-ui-lib/models';
import { ResourceNodeContext } from '@platform-mesh/portal-ui-lib/services';

// ---------------------------------------------------------------------------
// Shared portal context
// ---------------------------------------------------------------------------

const PORTAL_CONTEXT: ResourceNodeContext['portalContext'] = {
  crdGatewayApiUrl: 'https://crd-gateway.example.com',
  openSearchApiUrl: 'https://opensearch.example.com',
  kcpWorkspaceUrl: 'https://kcp.example.com',
};

// ---------------------------------------------------------------------------
// Cluster-scoped resource definition
// ---------------------------------------------------------------------------

const CLUSTERS_DEFINITION: ResourceDefinition = {
  apiGroup: 'core.k8s.io',
  version: 'v1alpha1',
  entityCollection: 'clusters',
  entity: 'Cluster',
  scope: 'Cluster',
  ui: {
    listView: {
      actions: [
        {
          property: 'spec.type',
          label: 'Navigate to cluster',
          uiSettings: {
            displayAs: 'button',
            buttonSettings: {
              action: 'navigate',
              text: 'Custom Action',
              icon: 'action-settings',
              design: 'Default',
            },
          },
        },
      ],
      resourceTitle: { label: 'Clusters', property: '' },
      resourceDescription: {
        label: 'All Kubernetes clusters in your organization',
        property: '',
      },
      fields: [
        { property: 'metadata.name', label: 'Name' },
        {
          property: 'spec.version',
          label: 'Version',
          uiSettings: { columnWidth: '120px' },
        },
        { property: 'spec.region', label: 'Region' },
      ],
    },
    detailView: {
      resourceTitle: { label: 'Cluster Details', property: '' },
      resourceDescription: {
        label: 'Detailed view of the selected cluster',
        property: '',
      },
      fields: [
        { property: 'metadata.name', label: 'Name' },
        { property: 'spec.version', label: 'Version' },
        { property: 'spec.region', label: 'Region' },
        { property: 'spec.description', label: 'Description' },
      ],
    },
    createView: {
      fields: [
        { property: 'metadata.name', label: 'Name', required: true },
        { property: 'spec.displayName', label: 'Display Name' },
        {
          property: 'spec.region',
          label: 'Region',
          values: ['eu-west-1', 'us-east-1'],
        },
        { property: 'spec.description', label: 'Description' },
      ],
    },
  },
};

// ---------------------------------------------------------------------------
// With-actions definition (navigate + download-kubeconfig)
// ---------------------------------------------------------------------------

const CLUSTERS_WITH_ACTIONS_DEFINITION: ResourceDefinition = {
  ...CLUSTERS_DEFINITION,
  ui: {
    ...CLUSTERS_DEFINITION.ui,
    listView: {
      ...CLUSTERS_DEFINITION.ui?.listView,
      filters: [
        {
          label: 'Active',
          property: 'spec.status',
          value: 'active',
          default: true,
        },
        { label: 'Inactive', property: 'spec.status', value: 'inactive' },
      ],
    },
    detailView: {
      ...CLUSTERS_DEFINITION.ui?.detailView,
      showDownloadKubeconfig: true,
      actions: [
        {
          property: 'spec.type',
          label: 'Navigate to cluster',
          uiSettings: {
            displayAs: 'button',
            buttonSettings: {
              action: 'navigate',
              text: 'Open Cluster',
              icon: 'action-settings',
              design: 'Default',
            },
          },
        },
      ],
    },
  },
};

// ---------------------------------------------------------------------------
// Modal-only definition — openInModal toolbar action WITHOUT createView.fields
// so only the modal-launch button appears (no built-in Create button).
// ---------------------------------------------------------------------------

const CLUSTERS_MODAL_ONLY_DEFINITION: ResourceDefinition = {
  ...CLUSTERS_DEFINITION,
  ui: {
    ...CLUSTERS_DEFINITION.ui,
    createView: undefined,
    listView: {
      ...CLUSTERS_DEFINITION.ui?.listView,
      actions: [
        {
          property: '',
          label: 'Create (modal)',
          uiSettings: {
            displayAs: 'button',
            buttonSettings: {
              action: 'openInModal',
              text: 'Create (modal)',
              design: 'Emphasized',
              modalSettings: {
                title: 'Create Cluster',
                size: 'm',
              },
            },
          },
          value: '/create-cluster',
        },
      ],
    },
  },
};

// ---------------------------------------------------------------------------
// Context presets
// ---------------------------------------------------------------------------

/** Cluster-scoped context (no namespace). */
export const CLUSTERS_CONTEXT: ResourceNodeContext = {
  resourceDefinition: CLUSTERS_DEFINITION,
  resourceId: CANNED_CLUSTER_RESOURCE.metadata.name,
  portalContext: PORTAL_CONTEXT,
  token: 'mock-token',
};

/** Cluster-scoped context with actions + filters. */
export const WITH_ACTIONS_CONTEXT: ResourceNodeContext = {
  resourceDefinition: CLUSTERS_WITH_ACTIONS_DEFINITION,
  resourceId: CANNED_CLUSTER_RESOURCE.metadata.name,
  portalContext: PORTAL_CONTEXT,
  parentNavigationContexts: ['clusters'],
  token: 'mock-token',
};

/**
 * Modal-only context — openInModal action only; no built-in Create button.
 * Used by the CreateViaModal story so only one action button renders.
 */
export const CLUSTERS_MODAL_CONTEXT: ResourceNodeContext = {
  resourceDefinition: CLUSTERS_MODAL_ONLY_DEFINITION,
  resourceId: CANNED_CLUSTER_RESOURCE.metadata.name,
  portalContext: PORTAL_CONTEXT,
  token: 'mock-token',
};

// ---------------------------------------------------------------------------
// LuigiClient presets
// ---------------------------------------------------------------------------

/** Standard fake LuigiClient (no feature toggles). */
export const LUIGI_CLIENT: LuigiClient = makeFakeLuigiClient();

// ---------------------------------------------------------------------------
// Rich definition — demonstrates all supported displayAs column types:
//   tag, link, boolIcon, img, alert, secret, button
// Add this alongside CLUSTERS_FULL_DEFINITION so Default stays simple.
// ---------------------------------------------------------------------------

export const CLUSTERS_RICH_DEFINITION: ResourceDefinition = {
  apiGroup: 'core.k8s.io',
  version: 'v1alpha1',
  entityCollection: 'clusters',
  entity: 'Cluster',
  scope: 'Cluster',
  ui: {
    listView: {
      resourceTitle: { label: 'Clusters (Rich)', property: '' },
      resourceDescription: {
        label: 'Demonstrates all column display types + pagination',
        property: '',
      },
      fields: [
        { property: 'metadata.name', label: 'Name' },
        {
          property: 'spec.version',
          label: 'Version',
          uiSettings: { columnWidth: '120px' },
        },
        // tag — status chip with per-value color via valueRules + tagSettings
        {
          property: 'spec.status',
          label: 'Status',
          uiSettings: {
            displayAs: 'tag',
            tagSettings: { design: 'Neutral' },
            valueRules: [
              { if: { condition: 'equals', value: 'Active' }, then: 'Active' },
              {
                if: { condition: 'equals', value: 'Inactive' },
                then: 'Inactive',
              },
              {
                if: { condition: 'equals', value: 'Pending' },
                then: 'Pending',
              },
            ],
            cssRules: [
              {
                if: { condition: 'equals', value: 'Active' },
                styles: { color: 'var(--sapSuccessColor, green)' },
              },
              {
                if: { condition: 'equals', value: 'Inactive' },
                styles: { color: 'var(--sapNegativeColor, red)' },
              },
              {
                if: { condition: 'equals', value: 'Pending' },
                styles: { color: 'var(--sapCriticalColor, orange)' },
              },
            ],
          },
        },
        // boolIcon — renders a check or cross icon for true/false values.
        // Label "Ready" is ~5 chars; the cell is a single icon so cap at 80px.
        {
          property: 'spec.ready',
          label: 'Ready',
          uiSettings: { displayAs: 'boolIcon', columnWidth: '80px' },
        },
        // link — clickable href using the resource's url field
        {
          property: 'spec.url',
          label: 'Console',
          uiSettings: {
            displayAs: 'link',
            linkSettings: { text: 'Open Console' },
          },
        },
        // img — avatar/logo from a URL field; constrain column width so the
        // image doesn't blow out the row height (the <img> itself has no inline
        // style, but columnWidth caps how wide the cell gets)
        {
          property: 'spec.logoUrl',
          label: 'Logo',
          uiSettings: {
            displayAs: 'img',
            columnWidth: '48px',
            cssCustomization: { maxHeight: '28px', maxWidth: '28px' } as any,
          },
        },
        // secret — masked value with show/hide toggle and copy button.
        // Give it an explicit wide column so the masked dots + both icons fit
        // without being squeezed by neighbouring columns.
        {
          property: 'spec.token',
          label: 'Token',
          uiSettings: { displayAs: 'secret', withCopyButton: true },
        },
        // alert — displayAs:'alert' shows a Critical ui5-icon ONLY when the
        // field value is falsy (!value()). To show the icon on unhealthy rows:
        // healthy rows carry spec.alertMessage:'ok' (truthy → no icon),
        // unhealthy rows carry spec.alertMessage: null (falsy → icon shown).
        // Label "Health" is ~6 chars; the cell is a single icon so cap at 80px.
        {
          property: 'spec.alertMessage',
          label: 'Health',
          uiSettings: {
            displayAs: 'alert',
            columnWidth: '80px',
          },
        },
        // button — row action navigate
        {
          property: 'metadata.name',
          label: 'Actions',
          uiSettings: {
            displayAs: 'button',
            buttonSettings: {
              action: 'navigate',
              text: 'Open',
              icon: 'action-settings',
              design: 'Default',
            },
          },
        },
      ],
    },
    createView: {
      fields: [
        { property: 'metadata.name', label: 'Name', required: true },
        { property: 'spec.displayName', label: 'Display Name' },
        {
          property: 'spec.region',
          label: 'Region',
          values: ['eu-west-1', 'us-east-1'],
        },
        { property: 'spec.description', label: 'Description' },
      ],
    },
  },
};

/** Rich context — uses CLUSTERS_RICH_DEFINITION for column type showcase. */
export const CLUSTERS_RICH_CONTEXT: ResourceNodeContext = {
  resourceDefinition: CLUSTERS_RICH_DEFINITION,
  resourceId: MANY_CLUSTER_RESOURCES[0].metadata.name,
  portalContext: {
    crdGatewayApiUrl: 'https://crd-gateway.example.com',
    openSearchApiUrl: 'https://opensearch.example.com',
    kcpWorkspaceUrl: 'https://kcp.example.com',
  },
  token: 'mock-token',
};

// ---------------------------------------------------------------------------
// Canned open-search results — 2-item variant (used by Default/Empty/Error)
// ---------------------------------------------------------------------------

export const CANNED_OPEN_SEARCH_RESULTS = {
  results: [
    {
      id: 'cluster/my-cluster',
      score: 1.0,
      kind: 'Cluster',
      name: 'my-cluster',
      namespace: '',
      apiGroup: 'core.k8s.io',
      apiVersion: 'v1alpha1',
      workspacePath: 'root:org:workspace',
      clusterName: 'my-cluster',
      organizationId: 'org-1',
      organizationName: 'My Org',
      accountId: 'acc-1',
      accountName: 'My Account',
      metadata: {
        name: 'my-cluster',
        resourceVersion: '1',
      },
      spec: {
        version: 'v1.30',
        region: 'eu-west-1',
        displayName: 'My Cluster',
      },
      source: {
        default_fields: {},
        filterable_fields: {},
        semantic_fields: {},
      },
    },
    {
      id: 'cluster/another-cluster',
      score: 0.9,
      kind: 'Cluster',
      name: 'another-cluster',
      namespace: '',
      apiGroup: 'core.k8s.io',
      apiVersion: 'v1alpha1',
      workspacePath: 'root:org:workspace',
      clusterName: 'another-cluster',
      organizationId: 'org-1',
      organizationName: 'My Org',
      accountId: 'acc-1',
      accountName: 'My Account',
      metadata: {
        name: 'another-cluster',
        resourceVersion: '2',
      },
      spec: {
        version: 'v1.29',
        region: 'us-east-1',
        displayName: 'Another Cluster',
      },
      source: {
        default_fields: {},
        filterable_fields: {},
        semantic_fields: {},
      },
    },
  ],
  source: 'mock',
  nextCursor: '',
  totalCount: 2,
};

// ---------------------------------------------------------------------------
// Extended open-search results — 30 items for pagination + rich column demo.
// search-list default paginationLimit=20, so 30 items → 2 pages.
// ---------------------------------------------------------------------------

const REGIONS_OS = [
  'eu-west-1',
  'us-east-1',
  'ap-southeast-1',
  'us-west-2',
  'eu-central-1',
];
const VERSIONS_OS = ['v1.28', 'v1.29', 'v1.30', 'v1.31'];
const STATUSES_OS = ['Active', 'Inactive', 'Pending'];
// 28×28 inline SVG data-URIs so the <img> renders at intrinsic size without
// needing CSS that can't cross the shadow-DOM boundary.
const LOGO_URLS_OS = [
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='28'%3E%3Ccircle cx='14' cy='14' r='14' fill='%230068b5'/%3E%3C/svg%3E",
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='28'%3E%3Ccircle cx='14' cy='14' r='14' fill='%2300d2ac'/%3E%3C/svg%3E",
];

export const CANNED_OPEN_SEARCH_RESULTS_RICH = {
  results: Array.from({ length: 10 }, (_, i) => {
    const num = String(i + 1).padStart(2, '0');
    const isReady = i % 3 !== 2;
    return {
      id: `cluster/cluster-${num}`,
      score: 1 - i * 0.01,
      kind: 'Cluster',
      name: `cluster-${num}`,
      namespace: '',
      apiGroup: 'core.k8s.io',
      apiVersion: 'v1alpha1',
      workspacePath: 'root:org:workspace',
      clusterName: `cluster-${num}`,
      organizationId: 'org-1',
      organizationName: 'My Org',
      accountId: 'acc-1',
      accountName: 'My Account',
      // isAvailable mirrors the real ResourceService.list() mapping:
      // ready rows → true, not-ready rows → false → DeclarativeTable dims them.
      isAvailable: isReady,
      metadata: {
        name: `cluster-${num}`,
        resourceVersion: String(100 + i),
      },
      spec: {
        version: VERSIONS_OS[i % VERSIONS_OS.length],
        region: REGIONS_OS[i % REGIONS_OS.length],
        displayName: `Cluster ${num}`,
        status: STATUSES_OS[i % STATUSES_OS.length],
        ready: isReady,
        // alertMessage is empty for healthy rows (alert icon hidden),
        // truthy for unhealthy (alert icon shown).
        // alertMessage:'ok' for ready → truthy → !value() false → no icon.
        // alertMessage: null for not-ready → falsy → !value() true → icon shown.
        alertMessage: isReady ? 'ok' : null,
        logoUrl: LOGO_URLS_OS[i % LOGO_URLS_OS.length],
        url: `https://console.example.com/clusters/cluster-${num}`,
        token: `sk-demo-${num}-a1b2c3d4`,
      },
      source: {
        default_fields: {},
        filterable_fields: {},
        semantic_fields: {},
      },
    };
  }),
  source: 'mock',
  nextCursor: '',
  totalCount: 10,
};

// ---------------------------------------------------------------------------
// Paginated open-search results — 30 simple items (plain fields only).
// search-list paginationLimit defaults to 20 → first page shows items 1-20,
// second page shows 21-30. Used by the Paginated story via
// makePagedOpenSearchServiceStub so page/limit are honoured.
// ---------------------------------------------------------------------------

export const CANNED_OPEN_SEARCH_RESULTS_PAGINATED = {
  results: Array.from({ length: 30 }, (_, i) => {
    const num = String(i + 1).padStart(2, '0');
    return {
      id: `cluster/cluster-${num}`,
      score: 1 - i * 0.01,
      kind: 'Cluster',
      name: `cluster-${num}`,
      namespace: '',
      apiGroup: 'core.k8s.io',
      apiVersion: 'v1alpha1',
      workspacePath: 'root:org:workspace',
      clusterName: `cluster-${num}`,
      organizationId: 'org-1',
      organizationName: 'My Org',
      accountId: 'acc-1',
      accountName: 'My Account',
      metadata: {
        name: `cluster-${num}`,
        resourceVersion: String(100 + i),
      },
      spec: {
        version: VERSIONS_OS[i % VERSIONS_OS.length],
        region: REGIONS_OS[i % REGIONS_OS.length],
        displayName: `Cluster ${num}`,
      },
      source: {
        default_fields: {},
        filterable_fields: {},
        semantic_fields: {},
      },
    };
  }),
  source: 'mock',
  nextCursor: '',
  totalCount: 30,
};
