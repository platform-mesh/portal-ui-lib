# Generic UI Components

A reusable set of Angular components for building consistent and maintainable micro frontends across the application.
This library provides generic implementations for common UI patterns like list views and detail views.

## Web Components

The generic ui consists of the following components:

- `generic-list-view`: Component for displaying and managing lists of resources, as well as creation, and deletion of the resources.
- `generic-detail-view`: Component for displaying individual resource.

## Configuration

### Generic List View

In order to use the generic list view, you need to adjust the node’s   `content-configuration` to include the following:

- node properties

    - `"url": "/assets/platform-mesh-portal-ui-wc.js#generic-list-view"`: pointing to the web component.
    - `"webcomponent": {"selfRegistered": true}`: indicating Luigi framework to register as a webcomponent.
    - `"navigationContext": "accounts"`: providing the navigation context for easy navigation between the entity and list views.

- context resource definition `"context"`

  - in the `"resourceDefinition"` the given fields need to be specified: `group, version,  plural, singular, kind, scope, namespace` describing properties of the resource.
  - Also `"resourceDefinition"` have optional field `readyCondition` that describing when resource treated as ready
    It's an object that contains two fields:
      - `jsonPathExpression`: JSONPath expression used to evaluate whether the resource is ready at runtime
      - `property`: JSON path(s) used to generate GraphQL fields to fetch the necessary data for readiness evaluation
    ```json
    {
      "readyCondition": {
      "jsonPathExpression": "status.conditions[?(@.type=='Ready' && @.status=='True')]",
      "property": ["status.conditions.status", "status.conditions.type"]
      }
    }
    ```
    - in the `"ui"` part of the `"resourceDefinition"` we can specify:
      - `"logoUrl"`: resource type logo shown in the view header
      - view definitions for the corresponding views:

#### List View Configuration

- `"listView"`: Defines how resources are displayed in table format
  - `"fields"`: Array of `FieldDefinition` objects defining table columns. Each field's `"label"` becomes the column header, and `"property"` is a JSON path to the resource property. Fields can be grouped using the `"group"` property to display related information in a single column. The `"uiSettings"` property allows customization of rendering (format, actions, styling).
  - `"actions"`: Array of `FieldDefinition` objects with `displayAs: "button"` that render as action buttons in the table toolbar or row actions. These buttons can trigger navigation or open modals based on their `buttonSettings.action` configuration.
  - `"resourceTitle"`: A `FieldDefinition` object for rendering the view title. Supports all field definition features like `uiSettings`, `value`, etc. If not provided, defaults to the plural form of the resource.
  - `"resourceDescription"`: A `FieldDefinition` object for rendering the subtitle description. Supports all field definition features. If not provided, a default description is generated.

#### Detail View Configuration

- `"detailView"`: Defines how a page view for individual resource is displayed
  - `"fields"`: Array of `FieldDefinition` objects defining which properties to display. Supports field grouping for a compact display of related data.
  - `"actions"`: Array of `FieldDefinition` objects with `displayAs: "button"` that render as action buttons in the detail view header. These buttons can trigger navigation or open modals based on their `buttonSettings.action` configuration.
  - `"showDownloadKubeconfig"`: Boolean to enable/disable download kubeconfig button (default: `false`).
  - `"resourceTitle"`: A `FieldDefinition` object for rendering the resource title. Supports all field definition properties including `property`, `jsonPathExpression`, `uiSettings`, etc. If not provided, defaults to the resource ID or display name.
  - `"resourceDescription"`: A `FieldDefinition` object for rendering the subtitle description. Supports all field definition properties. If not provided, a default description is generated.

#### Create View Configuration

- `"createView"`: Defines the form for creating/updating resources
  - `"fields"`: Array of `FieldDefinition` objects defining form fields. Supports `"required"` flag to indicate mandatory fields. Use `"values"` to provide a static list of options, or `"dynamicValuesDefinition"` to fetch options via GraphQL query (requires `"gqlQuery"`, `"operation"`, `"key"` for display value, and `"value"` for actual value).
  - for namespaced resources, when URL search param `namespace` is `-all-` (or missing), the create form automatically adds a required `metadata.namespace` field with dynamic namespace options.

#### Field Definition Properties

Each field definition supports the following properties:

- `"label"`: Display name for the field
- `"property"`: JSON path to the resource property (string or array of strings for fallback values)
- `"propertyField"`: In case the property is a scalar value that represents an object, this property can be used to specify the field to be used for display within that object
  - `"key"`: The name of the field to be used for display
  - `"transform"`: An array of text manipulations to be applied to the value, the available are:  
    | 'uppercase'
    | 'lowercase'
    | 'capitalize'
    | 'decode'
    | 'encode'
- `"jsonPathExpression"`: Alternative JSONPath expression for complex data access (takes precedence over `property`)
- `"required"`: Boolean flag indicating if the field is mandatory (for create views)
- `"values"`: Array of predefined values for selection
- `"value"`: Static value for field
- `"group"`: Object for grouping related fields together:
  - `"name"`: Unique identifier for the group
  - `"label"`: Display name for the group
  - `"delimiter"`: String used to separate grouped values
  - `"multiline"`: Boolean flag for multiline display of grouped values (default: true) When true, values are displayed on separate lines
- `"uiSettings"`: Object for configuring UI-specific display settings:
  - `"labelDisplay"`: Boolean flag for applying the default emphasized style to the value
  - `"displayAs"`: Controls how the value is displayed (if nothing is provided the plain text is displayed):
    - `"secret"`: Render value as a secret with show/hide toggle
    - `"boolIcon"`: Render boolean-like values (true/false, True/False, TRUE/FALSE) as icon indicators
    - `"link"`: Render URL values as clickable links (supports http://, https://, ftp://, mailto:, tel: protocols)
    - `"tooltip"`: Render an icon with a tooltip; tooltip text is the field value
    - `"img"`: Render an image with the provided url read from the resource property
    - `"button"`: Render a button with the settings provided in the `buttonSettings` object
  - `"buttonSettings"`: Object for configuring button UI display settings (used when `displayAs: "button"`):
    - `"text"`: Button label text
    - `"icon"`: UI5 icon name to display at the start of the button
    - `"endIcon"`: UI5 icon name to display at the end of the button
    - `"design"`: Button design variant (options: `"Default"`, `"Positive"`, `"Negative"`, `"Transparent"`, `"Emphasized"`, `"Attention"`)
    - `"tooltip"`: Tooltip text shown on hover
    - `"action"`: Action to perform when button is clicked (options: `"openInModal"`, `"navigate"`), the url used is taken from the field specified `property` or static `value`
    - `"modalSettings"`: Configuration for modal when `action: "openInModal"`:
      - `"title"`: Modal title
      - `"size"`: Predefined modal size (options: `"fullscreen"`, `"l"`, `"m"`, `"s"`)
      - `"width"`: Custom modal width (allowed units: `"px"`, `"%"`, `"rem"`, `"em"`, `"vh"`, `"vw"`)
      - `"height"`: Custom modal height (allowed units: `"px"`, `"%"`, `"rem"`, `"em"`, `"vh"`, `"vw"`)
  - `"tooltipIcon"`: UI5 icon name to use with `displayAs: "tooltip"` (defaults to `hint`) Don't forget to import picked icon to you portal from ui5 lib
  - `"withCopyButton"`: Boolean flag to show a copy button next to the value for easy copying to clipboard
  - `"cssCustomization"`: Inline styles applied to the rendered value (partial `CSSStyleDeclaration`, e.g. `backgroundColor`, `fontWeight`)
  - `"cssRules"`: Conditional inline styles applied based on the current value (merged on top of `cssCustomization`)
    - supported conditions: `equals`, `notEquals`, `greaterThan`, `greaterThanOrEqual`, `lessThan`, `lessThanOrEqual`, `contains`
- `"dynamicValuesDefinition"`: Configuration for dynamic value loading:
  - `"operation"`: GraphQL operation name
  - `"gqlQuery"`: GraphQL query string
  - `"value"`: JSON path to the actual value in the response
  - `"key"`: JSON path to the display value in the response

#### Example Content Configuration for an Accounts Node
Below is an example content-configuration for an accounts node using the generic list view.

This example demonstrates various features including:
- **Secret fields**: The "Key" field in `listView` and "API Key" field in `detailView` use `displayAs: "secret"` to hide sensitive data with a toggle
- **Copy buttons**: Multiple fields include `withCopyButton: true` for easy copying to clipboard
- **Link display**: The "External URL" field uses `displayAs: "link"` to render URLs as clickable links
- **Boolean display**: The "Active" field uses `displayAs: "boolIcon"` to show boolean values as icons
- **Custom styling**: The "Key" and "Display Name" fields use `cssCustomization` for visual customization
- **Field grouping**: Contact information is grouped using the `group` property

```json
{
  "name": "accounts",
  "luigiConfigFragment": {
    "data": {
      "nodes": [
        {
          "pathSegment": "accounts",
          "navigationContext": "accounts",
          "label": "Accounts",
          "entityType": "main",
          "loadingIndicator": {
            "enabled": false
          },
          "keepSelectedForChildren": true,
          "url": "/assets/platform-mesh-portal-ui-wc.js#generic-list-view",
          "webcomponent": {
            "selfRegistered": true
          },
          "context": {
            "resourceDefinition": {
              "group": "core.platform-mesh.io",
              "version": "v1alpha1",
              "plural": "accounts",
              "singular": "account",
              "kind": "Account",
              "scope": "Cluster",
              "namespace": null,
              "readyCondition": {
                "jsonPathExpression": "status.conditions[?(@.type=='Ready' && @.status=='True')]",
                "property": ["status.conditions.status", "status.conditions.type"]
              },
              "ui": {
                "logoUrl": "https://www.kcp.io/icons/logo.svg",
                "resourceImageProperty": "spec.image",
                "listView": {
                  "resourceTitle": {
                    "value": "Accounts"
                  },
                  "resourceDescription": {
                    "value": "This page displays all accounts in your environment. You can create, edit, or delete accounts as needed."
                  },
                  "fields": [
                    {
                      "property": "metadata.imgUrl",
                      "uiSettings": {
                        "displayAs": "img"
                      }
                    },
                    {
                      "label": "Name",
                      "property": "metadata.name"
                    },
                    {
                      "label": "Display Name",
                      "property": "spec.displayName"
                    },
                    {
                      "label": "Key",
                      "property": "data",
                      "propertyField": {
                        "key": "OPENAI_API_KEY",
                        "transform": ["uppercase", "encode"]
                      },
                      "uiSettings": {
                        "displayAs": "secret",
                        "withCopyButton": true,
                        "cssCustomization": {
                          "backgroundColor": "#e3f2fd",
                          "color": "#1976d2",
                          "fontWeight": "bold",
                          "textTransform": "uppercase"
                        }
                      }
                    },
                    {
                      "label": "Type",
                      "property": "spec.type"
                    },
                    {
                      "label": "Contact Info",
                      "property": "spec.email",
                      "group": {
                        "name": "contact",
                        "label": "Contact Information",
                        "delimiter": " | "
                      }
                    },
                    {
                      "label": "Phone",
                      "property": "spec.phone",
                      "group": {
                        "name": "contact",
                        "label": "Contact Information",
                        "delimiter": " | "
                      }
                    },
                    {
                      "value": "/home/members",
                      "group": {
                        "label": "Actions",
                        "name": "actions",
                        "multiline": false
                      },
                      "uiSettings": {
                        "displayAs": "button",
                        "buttonSettings": {
                          "text": "Now",
                          "endIcon": "download-from-cloud",
                          "design": "Emphasized",
                          "tooltip": "It is about time!",
                          "action": "openInModal",
                          "modalSettings": {
                            "title": "Time is precious",
                            "size": "l"
                          }
                        }
                      }
                    },
                    {
                      "property": "metadata.annotations.actionURL",
                      "group": {
                        "label": "Actions",
                        "name": "actions",
                        "multiline": false
                      },
                      "uiSettings": {
                        "displayAs": "button",
                        "buttonSettings": {
                          "text": "Download",
                          "icon": "delete",
                          "design": "Default",
                          "tooltip": "Hello there!",
                          "action": "navigate"
                        }
                      }
                    }
                  ]
                },
                "detailView": {
                  "resourceTitle": {
                    "property": "spec.displayName"
                  },
                  "resourceDescription": {
                    "property": "spec.description"
                  },
                  "actions": [{
                    "value": "/accounts/namesapces",
                    "uiSettings": {
                      "displayAs": "button",
                      "buttonSettings": {
                        "text": "Now",
                        "endIcon": "download-from-cloud",
                        "design": "Emphasized",
                        "tooltip": "It is about time!",
                        "action": "openInModal",
                        "modalSettings": {
                          "title": "Time is precious",
                          "size": "m"
                        }
                      }
                    }
                  }],
                  "fields": [
                    {
                      "label": "Description",
                      "property": "spec.description"
                    },
                    {
                      "label": "Display Name",
                      "property": "spec.displayName",
                      "uiSettings": {
                        "cssCustomization": {
                          "color": "#2e7d32",
                          "fontWeight": "600"
                        },
                        "cssRules": [
                          {
                            "if": { "condition": "equals", "value": "High" },
                            "styles": { "color": "red" }
                          },
                          {
                            "if": { "condition": "equals", "value": "Medium" },
                            "styles": { "color": "orange" }
                          },
                          {
                            "if": { "condition": "equals", "value": "Low" },
                            "styles": { "color": "green" }
                          }
                        ]
                      }
                    },
                    {
                      "label": "API Key",
                      "property": "spec.credentials.apiKey",
                      "uiSettings": {
                        "displayAs": "secret",
                        "withCopyButton": true
                      }
                    },
                    {
                      "label": "Account ID",
                      "property": "metadata.uid",
                      "uiSettings": {
                        "withCopyButton": true
                      }
                    },
                    {
                      "label": "External URL",
                      "property": "spec.externalUrl",
                      "uiSettings": {
                        "displayAs": "link",
                        "withCopyButton": true
                      }
                    },
                    {
                      "label": "Active",
                      "property": "spec.active",
                      "uiSettings": {
                        "displayAs": "boolIcon"
                      }
                    },
                    {
                      "label": "Contact Info",
                      "property": "spec.email",
                      "group": {
                        "name": "contact",
                        "label": "Contact Information",
                        "delimiter": " | "
                      }
                    },
                    {
                      "label": "Phone",
                      "property": "spec.phone",
                      "group": {
                        "name": "contact",
                        "label": "Contact Information",
                        "delimiter": " | "
                      }
                    }
                  ]
                },
                "createView": {
                  "fields": [
                    {
                      "label": "Name",
                      "property": "metadata.name",
                      "required": true
                    },
                    {
                      "label": "Type",
                      "property": "spec.type",
                      "required": true,
                      "values": ["account"]
                    },
                    {
                      "label": "Display Name",
                      "property": "spec.displayName"
                    },
                    {
                      "label": "Description",
                      "property": "spec.description"
                    },
                    {
                      "label": "City",
                      "property": "spec.city",
                      "required": true,
                      "dynamicValuesDefinition": {
                        "operation": "cities",
                        "gqlQuery": "subscription { cities { data { id name } } }",
                        "value": "data.id",
                        "key": "data.name"
                      }
                    }
                  ]
                }
              }
            }
          },
          "children": [
            {
              "pathSegment": ":accountId",
              "hideFromNav": true,
              "keepSelectedForChildren": false,
              "defineEntity": {
                "id": "account",
                "contextKey": "accountId",
                "dynamicFetchId": "account"
              },
              "context": {
                "accountId": ":accountId",
                "resourceId": ":accountId"
              }
            }
          ]
        }
      ]
    }
  }
}
```

#### Example Content Configuration for an HttpBin Node with Namespaced Scope

```json
{
    "name": "httpbins",
    "creationTimestamp": "2022-05-17T11:37:17Z",
    "luigiConfigFragment": {
        "data": {
            "nodes": [
                {
                    "pathSegment": "orchestrate_platform-mesh_io_httpbins",
                    "navigationContext": "orchestrate_platform-mesh_io_httpbins",
                    "label": "Http Bins",
                    "icon": "paint-bucket",
                    "order": 800,
                    "entityType": "main.core_platform-mesh_io_account.namespace",
                    "loadingIndicator": {
                        "enabled": false
                    },
                    "keepSelectedForChildren": true,
                    "url": "/assets/platform-mesh-portal-ui-wc.js#generic-list-view",
                    "webcomponent": {
                        "selfRegistered": true
                    },
                    "context": {
                        "resourceDefinition": {
                            "group": "orchestrate.platform-mesh.io",
                            "plural": "httpBins",
                            "singular": "httpBin", 
                            "version": "v1alpha1",
                            "kind": "HttpBin",
                            "scope": "Namespaced",
                            "namespace": null,
                            "readyCondition": {
                              "jsonPathExpression": "status.ready",
                              "property": ["status.ready"]
                            },
                            "ui": {
                                "logoUrl": "https://www.kcp.io/icons/logo.svg",
                                "listView": {
                                    "fields": [
                                        {
                                            "label": "Name",
                                            "property": "metadata.name"
                                        },
                                        {
                                            "label": "Ready",
                                            "property": "status.ready",
                                            "uiSettings": {
                                              "displayAs": "boolIcon"
                                            }
                                        },
                                        {
                                            "label": "Link",
                                            "property": "status.url",
                                            "uiSettings": {
                                              "displayAs": "link"
                                            }
                                        }
                                    ]
                                },
                                "detailView": {},
                                "createView": {
                                    "fields": [
                                        {
                                            "label": "Name",
                                            "property": "metadata.name",
                                            "required": true
                                        }
                                    ]
                                }
                            }
                        }
                    },
                    "children": [
                      {
                          "pathSegment": ":httpbinId",
                          "hideFromNav": true,
                          "keepSelectedForChildren": false,
                          "defineEntity": {
                              "id": "orchestrate_platform-mesh_io_httpbin",
                              "contextKey": "httpbinId"
                          },
                          "context": {
                              "accountId": ":accountId",
                              "namespaceId": ":namespaceId",
                              "resourceId": ":httpbinId"
                          }
                      }
                    ]
                },
                {
                  "entityType": "main.core_platform-mesh_io_account.namespace.orchestrate_platform-mesh_io_httpbin",
                  "pathSegment": "dashboard",
                  "label": "Dashboard",
                  "url": "/assets/platform-mesh-portal-ui-wc.js#generic-detail-view",
                  "webcomponent": {
                    "selfRegistered": true
                  },
                  "defineEntity": {
                      "id": "dashboard"
                  },
                  "compound": {
                      "children": []
                  }
                }
            ]
        }
    }
}
```

### Generic Detail View

To use the generic detail view, update the node’s `content-configuration` to include the following:

- node properties

    - `"url": "/assets/platform-mesh-portal-ui-wc.js#generic-detail-view"`: pointing to the web component
    - `"webcomponent": {"selfRegistered": true}`: indicating Luigi framework to register as a webcomponent

- context resource definition

    - because below provided example is a child of the list view node's child indicated by `"entityType": "main.account"`, the context data is
      inherited automatically via Luigi feature

#### Example Content Configuration for an Account Resource
Below is a sample content-configuration for displaying an account resource using the generic detail view:

```json
{
  "name": "overview",
  "luigiConfigFragment": {
    "data": {
      "nodes": [
        {
          "entityType": "main.account",
          "pathSegment": "dashboard",
          "label": "Dashboard",
          "url": "/assets/platform-mesh-portal-ui-wc.js#generic-detail-view",
          "webcomponent": {
            "selfRegistered": true
          },
          "defineEntity": {
            "id": "dashboard"
          },
          "compound": {
            "children": []
          }
        }
      ]
    }
  }
}

```

In case the detail view is an independent node provide context data:

```json
 {
  "context": {
    "resourceDefinition": {
      "group": "core.platform-mesh.io",
      "version": "v1alpha1",
      "plural": "accounts",
      "singular": "account",
      "kind": "Account",
      "scope": "Cluster",
      "namespace": null,
      "ui": {
        "logoUrl": "https://www.kcp.io/icons/logo.svg",
        "detailView": {
          "resourceTitle": {
            "property": "spec.displayName"
          },
          "resourceDescription": {
            "property": "spec.description"
          },
          "showDownloadKubeconfig": true,
          "fields": [
            {
              "label": "Description",
              "property": "spec.description"
            },
            {
              "label": "Display Name",
              "property": "spec.displayName"
            }
          ]
        }
      }
    }
  }
}
```

## Defaults

In case neither `"detailView"`, nor `"listView` is provided, the default values will be used. In case no `"createView"` details are provided
there is no possibility of creating a resource.

## Support

For issues or questions, please refer to the [project documentation and community resources](https://openmfp.org/docs/community).
