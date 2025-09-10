# Portal UI Library

This library helps you to setup FE application using `@openmfp/portal-ui-lib` by providing set of required implmentation in scope of the Platform Mesh functionalities.
<!-- CI trigger -->

![Build Status](https://github.com/platform-mesh/portal-ui-lib/actions/workflows/pipeline.yaml/badge.svg)

## Getting Started

### Build

Run `npm run build` to build the project. The build artifacts will be stored in the `dist/` directory.

### Running unit tests

Run `nom run test` to execute the unit tests via Jest.

## Generic UI Feature

There is a possibility to reuse generic ui components in form of web components, without building the micro frontend.
Please follow our [generic ui guide](./docs/readme-generic-ui.md) for this task.

### Angular Configuration

Configure the angular build process (in the `angular.json` file) to include the content of the assets
from `@platform-mesh/portal-ui-lib` library into the project assets, as shown below:

```
{
  // ... the rest of the angular.json configuration
  "assets": [
    {
      "glob": "**",
      "input": "node_modules/@platform-mesh/portal-ui-lib/assets/",
      "output": "/assets/"
    },
  ]
    // ... other configured assets
}
```
