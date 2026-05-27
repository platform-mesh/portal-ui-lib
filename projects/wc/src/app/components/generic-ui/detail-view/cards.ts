import {
  CardConfig,
  Dashboard,
  DeclarativeTableCard,
  Favorites,
  SectionConfig,
  ServiceStatusCard,
  VisitedServiceCard,
  WhatsNew,
} from '@openmfp/ngx';

Dashboard.registerAngularComponents([
  Favorites,
  VisitedServiceCard,
  ServiceStatusCard,
  WhatsNew,
  DeclarativeTableCard,
]);

export const SECTIONS: SectionConfig[] = [
  { id: 'ras', title: 'Recently accessed services', editable: true, w: 12 },
];

const RAS_CARD_TEMPLATES = [
  {
    serviceType: 'SAP HANA Cloud',
    serviceName: 'olc-hana-db',
    serviceIcon: 'database',
    serviceDescription: 'My Subaccount 1/Space dev',
    path: '/hana/olc-hana-db',
  },
  {
    serviceType: 'Cloud Identity Service',
    serviceName: 'Cloud Identity',
    serviceIcon: 'customer',
    serviceDescription: 'My Subaccount 1/Space dev',
    path: '/identity/cloud-identity',
  },
  {
    serviceType: 'SAP HANA Cloud',
    serviceName: 'olc-hana-db-test',
    serviceIcon: 'database',
    serviceDescription: 'My Subaccount 1/Space dev',
    path: '/hana/olc-hana-db-test',
  },
  {
    serviceType: 'Application Autoscaler',
    serviceName: 'applicationtest',
    serviceIcon: 'accelerated',
    serviceDescription: 'My Subaccount 2/Space prod',
    path: '/autoscaler/applicationtest',
  },
  {
    serviceType: 'Cloud Identity Service',
    serviceName: 'Cloud Identity 2',
    serviceIcon: 'customer',
    serviceDescription: 'Long text Subaccount 1/Space',
    path: '/identity/cloud-identity-2',
  },
  {
    serviceType: 'Audit Log Service',
    serviceName: 'auditlog-name',
    serviceIcon: 'log',
    serviceDescription: 'My Subaccount 4/Space dev',
    path: '/auditlog/auditlog-name',
  },
];

const TABLE_RESOURCES = [
  {
    id: 'abc-001',
    metadata: { name: 'api-server-7d9f', namespace: 'default', uid: 'abc-001' },
    status: { phase: 'Running', ready: true, restarts: 0, message: undefined },
    spec: { nodeName: 'node-1', image: 'nginx:1.25' },
    isAvailable: true,
  },
  {
    id: 'abc-002',
    metadata: { name: 'worker-5bc8', namespace: 'default', uid: 'abc-002' },
    status: {
      phase: 'Pending',
      ready: false,
      restarts: 3,
      message: 'ImagePullBackOff',
    },
    spec: { nodeName: 'node-2', image: 'myapp:latest' },
    isAvailable: false,
    accessibleName: 'Pod unavailable: ImagePullBackOff',
  },
  {
    id: 'abc-003',
    metadata: {
      name: 'cache-redis-0',
      namespace: 'kube-system',
      uid: 'abc-003',
    },
    status: { phase: 'Running', ready: true, restarts: 1, message: undefined },
    spec: { nodeName: 'node-1', image: 'redis:7' },
    isAvailable: true,
  },
  {
    id: 'abc-004',
    metadata: {
      name: 'db-postgres-0',
      namespace: 'production',
      uid: 'abc-004',
    },
    status: {
      phase: 'Failed',
      ready: false,
      restarts: 5,
      message: 'CrashLoopBackOff',
    },
    spec: { nodeName: 'node-3', image: 'postgres:16' },
    isAvailable: false,
    accessibleName: 'Pod unavailable: CrashLoopBackOff',
  },
  {
    id: 'abc-005',
    metadata: {
      name: 'ingress-ctrl-xkp',
      namespace: 'default',
      uid: 'abc-005',
    },
    status: { phase: 'Running', ready: true, restarts: 0, message: undefined },
    spec: { nodeName: 'node-2', image: 'nginx-ingress:1.9' },
    isAvailable: true,
  },
];

const PODS_TABLE_CARD_CONFIG = {
  header: 'Pods',
  headerTooltip: 'This table lists all pods running in the cluster.',
  tableConfig: {
    fields: [
      { label: 'Name', property: 'metadata.name' },
      { label: 'Namespace', property: 'metadata.namespace' },
      {
        label: 'Ready',
        property: 'status.ready',
        uiSettings: { displayAs: 'boolIcon', columnWidth: '56px' },
      },
      {
        label: 'Phase',
        property: 'status.phase',
        uiSettings: {
          cssRules: [
            {
              if: { condition: 'equals', value: 'Running' },
              styles: { color: 'green' },
            },
            {
              if: { condition: 'equals', value: 'Pending' },
              styles: { color: 'darkorange' },
            },
            {
              if: { condition: 'equals', value: 'Failed' },
              styles: { color: 'red', fontWeight: 'bold' },
            },
          ],
        },
      },
      {
        label: 'UID',
        property: 'metadata.uid',
        uiSettings: { displayAs: 'secret', withCopyButton: true },
      },
      {
        property: 'spec.image',
        uiSettings: { displayAs: 'tag' },
        group: { name: 'placement', label: 'Placement', delimiter: ' ' },
      },
      {
        property: 'spec.nodeName',
        uiSettings: { displayAs: 'tag' },
        group: { name: 'placement' },
      },
      {
        label: 'Alert',
        property: 'status.message',
        uiSettings: { displayAs: 'alert', columnWidth: '42px' },
      },
      { label: 'Message', property: 'status.message', value: '—' },
      {
        property: 'metadata.name',
        uiSettings: {
          displayAs: 'button',
          buttonSettings: {
            icon: 'inspect',
            design: 'Transparent',
            action: 'navigate',
          },
        },
        group: { name: 'actions', label: 'Actions', multiline: false },
      },
    ],
    paginationLimit: 5,
    hasMore: false,
  },
  createResourceFormConfig: {
    fields: [
      { name: 'metadata.name', label: 'Name', required: true },
      {
        name: 'metadata.namespace',
        label: 'Namespace',
        required: true,
        values: ['default', 'kube-system', 'production'],
      },
    ],
    title: 'Create Pod',
    confirmLabel: 'Create',
    cancelLabel: 'Cancel',
  },
  editResourceFormConfig: {
    fields: [
      { name: 'metadata.name', label: 'Name', required: true, disabled: true },
      {
        name: 'metadata.namespace',
        label: 'Namespace',
        required: true,
        values: ['default', 'kube-system', 'production'],
      },
    ],
    title: 'Edit Pod',
    confirmLabel: 'Save',
    cancelLabel: 'Cancel',
  },
  deleteResourceConfirmationConfig: {
    title: 'Delete Pod?',
    message:
      'This action cannot be undone. The pod will be permanently removed.',
    confirmLabel: 'Delete',
    cancelLabel: 'Cancel',
  },
};

export const AVAILABLE_CARDS: CardConfig[] = [
  {
    id: 'table-pods',
    label: 'Pods',
    w: 12,
    h: 50,
    component: 'mfp-declarative-table-card',
    type: 'angular' as const,
    componentInputs: {
      config: PODS_TABLE_CARD_CONFIG,
      resources: TABLE_RESOURCES,
    },
  },
  {
    id: 'whats-new',
    label: "What's New",
    type: 'angular',
    w: 6,
    h: 57,
    component: 'mfp-whats-new',
  },
  {
    id: 'favorites',
    label: 'Favorites',
    type: 'angular',
    w: 6,
    h: 21,
    minW: 3,
    maxW: 6,
    minH: 10,
    maxH: 40,
    component: 'mfp-favorites',
  },
  {
    id: 'service-status',
    label: 'Service Status',
    type: 'angular',
    w: 6,
    h: 30,
    component: 'mfp-service-status-card',
  },
];

export const CARDS: CardConfig[] = [
  ...RAS_CARD_TEMPLATES.map((t, i) => ({
    id: `ras-card-${i}`,
    w: 4,
    h: 10,
    sectionId: 'ras',
    type: 'angular' as const,
    component: 'mfp-visited-service-card',
    componentInputs: { ...t },
  })),
  ...AVAILABLE_CARDS,
];
