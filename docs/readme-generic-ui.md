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

  - in the `"resourceDefinition"` the given fields need to be specified: `group, plural, singular, kind, scope, namespace` describing properties of the resource.
  - Also `"resourceDefinition"` have optional field `readyCondition` that describing when resource treated as ready
    It's an object that contains two fields:
      - `jsonPathExpression`: JSONPath expression used to evaluate whether the resource is ready at runtime
      - `property`: JSON path(s) used to generate GraphQL fields to fetch the necessary data for readiness evaluation
    ```json
    "readyCondition": {
      "jsonPathExpression": "status.conditions[?(@.type=='Ready' && @.status=='True')]",
      "property": ["status.conditions.status", "status.conditions.type"],
    },
    ```
    - in the `"ui"` part of the `"resourceDefinition"` we can specify `"logoUrl"` for the resource as well as the definitions of the
      corresponding views

        - `"listView"`: contains `"fields"` definitions that will be translated to the columns of the table list view, `"label"` corresponds to
          the column name, whereas `"property"` is a json path of the property of a resource to be read. Fields can be grouped together using the `"group"` property to display related information in a single column.
        `"labelDisplay"` this property allows you to customize the visual appearance of field values in both list and detail views.
        - `"detailView"`: similarly describes the fields which are to show up on the detailed view. Supports field grouping for compact display of related data.
        - `"createView`: section additionally provides possibility to add the `"required"` flag to the filed definition,
          indicating that the field needs to be provided while creating an instance of that resource, with the `"values": ["account"]`
          there is a possibility to provide a list of values to select from. Also, it's possible to specify a GraphQL query to retrieve a dynamic list of values to select from using the `"dynamicValuesDefinition"`. You need to provide `"gqlQuery"` and `"operation"`, as well as `"key"` - a JSON path to the property that will be used as the displayed value, and `"value"` — a JSON path to the actual value.

#### Field Definition Properties

Each field definition supports the following properties:

- `"label"`: Display name for the field
- `"property"`: JSON path to the resource property (string or array of strings for fallback values)
- `"jsonPathExpression"`: Alternative JSONPath expression for complex data access (takes precedence over `property`)
- `"required"`: Boolean flag indicating if the field is mandatory (for create views)
- `"values"`: Array of predefined values for selection
- `"group"`: Object for grouping related fields together:
  - `"name"`: Unique identifier for the group
  - `"label"`: Display name for the group
  - `"delimiter"`: String used to separate grouped values
  - `"multiline"`: Boolean flag for multiline display of grouped values (default: true) When true, values are displayed on separate lines
- `"labelDisplay"`: Boolean value for using the defaults or an object for customizing the visual appearance of field values:
  - `"backgroundColor"`: Background color for the value (CSS color value)
  - `"color"`: Text color for the value (CSS color value)
  - `"fontWeight"`: Font weight for the value (CSS font-weight value)
  - `"fontStyle"`: Font style for the value (CSS font-style value)
  - `"textDecoration"`: Text decoration for the value (CSS text-decoration value)
  - `"textTransform"`: Text transformation for the value (CSS text-transform value)
- `"displayAsPlainText"`: Boolean valu that give you ability to render value as it is, without any built-in transformation.
- `"dynamicValuesDefinition"`: Configuration for dynamic value loading:
  - `"operation"`: GraphQL operation name
  - `"gqlQuery"`: GraphQL query string
  - `"value"`: JSON path to the actual value in the response
  - `"key"`: JSON path to the display value in the response

#### Example Content Configuration for an Accounts Node
Below is an example content-configuration for an accounts node using the generic list view.

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
              "plural": "accounts",
              "singular": "account",
              "kind": "Account",
              "scope": "Cluster",
              "namespace": null,
              "readyCondition": {
                "jsonPathExpression": "status.conditions[?(@.type=='Ready' && @.status=='True')]",
                "property": ["status.conditions.status", "status.conditions.type"],
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
                      "label": "Display Name",
                      "property": "spec.displayName"
                    },
                    {
                      "label": "Type",
                      "property": "spec.type",
                      "labelDisplay": {
                        "backgroundColor": "#e3f2fd",
                        "color": "#1976d2",
                        "fontWeight": "bold",
                        "textTransform": "uppercase"
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
                "detailView": {
                  "fields": [
                    {
                      "label": "Description",
                      "property": "spec.description"
                    },
                    {
                      "label": "Display Name",
                      "property": "spec.displayName",
                      "labelDisplay": {
                        "color": "#2e7d32",
                        "fontWeight": "600"
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
                        "key": "data.name",
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
      "plural": "accounts",
      "singular": "account",
      "kind": "Account",
      "scope": "Cluster",
      "namespace": null,
      "ui": {
        "logoUrl": "https://www.kcp.io/icons/logo.svg",
        "detailView": {
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
