import {
  DetailView,
  DownloadKubeconfigFromSecretRefAction,
  GenericAction,
  GenericActionButtonSettings,
  PlatformMeshFieldDefinition,
  UiAction,
} from './ui-definition';

describe('UiAction types', () => {
  it('accepts the supported generic and Secret-backed detail actions', () => {
    const navigate = {
      value: '/clusters',
      uiSettings: {
        buttonSettings: { action: 'navigate', text: 'Clusters' },
      },
    } satisfies UiAction;
    const download = {
      property: 'status.kubeconfigSecretRef.name',
      uiSettings: {
        buttonSettings: {
          action: 'downloadKubeconfigFromSecretRef',
          text: 'Download kubeconfig',
        },
      },
    } satisfies UiAction;
    const detailView: DetailView = { actions: [navigate, download] };

    expect(navigate.uiSettings.buttonSettings.action).toBe('navigate');
    expect(download.property).toBe('status.kubeconfigSecretRef.name');
    expect(detailView.actions).toHaveLength(2);
  });

  it('keeps the exported DetailView actions model backwards compatible', () => {
    const providerSpecificAction: PlatformMeshFieldDefinition = {
      value: 'provider-specific-value',
      uiSettings: {
        displayAs: 'button',
        buttonSettings: {
          action: 'providerSpecificAction',
        },
      },
    };
    const existingActions: PlatformMeshFieldDefinition[] = [
      providerSpecificAction,
    ];
    const view: DetailView = { actions: existingActions };

    expect(view.actions?.[0].uiSettings?.buttonSettings?.action).toBe(
      'providerSpecificAction',
    );
  });

  it('rejects malformed or unsupported typed detail actions', () => {
    // @ts-expect-error Secret download actions require a reference property.
    const missingProperty: DownloadKubeconfigFromSecretRefAction = {
      uiSettings: {
        buttonSettings: { action: 'downloadKubeconfigFromSecretRef' },
      },
    };
    const unsupportedButton: GenericActionButtonSettings = {
      // @ts-expect-error The detail runtime only implements these two actions.
      action: 'providerSpecificAction',
    };
    const invalidDisplay: GenericAction = {
      value: '/clusters',
      uiSettings: {
        // @ts-expect-error Header actions cannot use another display mode.
        displayAs: 'link',
        buttonSettings: { action: 'navigate' },
      },
    };
    // @ts-expect-error Generic typed actions require a navigation target.
    const missingTarget: GenericAction = {
      uiSettings: { buttonSettings: { action: 'navigate' } },
    };
    // @ts-expect-error Collection paths require a JSONPath result selector.
    const collectionWithoutJsonPath: GenericAction = {
      property: ['status.console.url'],
      uiSettings: { buttonSettings: { action: 'navigate' } },
    };
    const nestedAction: GenericAction = {
      value: '/clusters',
      // @ts-expect-error Header actions cannot contain nested field trees.
      propertyCollection: [{ property: 'status.console.url' }],
      uiSettings: { buttonSettings: { action: 'navigate' } },
    };

    expect(missingProperty.uiSettings.buttonSettings.action).toBe(
      'downloadKubeconfigFromSecretRef',
    );
    expect(unsupportedButton.action).toBe('providerSpecificAction');
    expect(invalidDisplay.uiSettings.displayAs).toBe('link');
    expect(missingTarget.uiSettings.buttonSettings.action).toBe('navigate');
    expect(collectionWithoutJsonPath.property).toEqual(['status.console.url']);
    expect(nestedAction.propertyCollection).toHaveLength(1);
  });
});
