# Portal UI Library

This library helps you to set up the front end application using `@openmfp/portal-ui-lib` by providing the set of required implmentations 
in the scope of the Platform Mesh functionalities.
<!-- CI trigger -->

![Build Status](https://github.com/platform-mesh/portal-ui-lib/actions/workflows/pipeline.yaml/badge.svg)

## Getting Started

### Build

Run `npm run build` to build the project. The build artifacts will be stored in the `dist/` directory.

### Running unit tests

Run `nom run test` to execute the unit tests via Jest.

## Generic UI Feature

There is a possibility to reuse generic ui components in the form of web components, without building the micro frontend.
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

## Requirements

The portal requires the installation of node.js and npm.
Check out the [package.json](package.json) for the required node version and dependencies.

## Contributing

Please refer to the [CONTRIBUTING.md](CONTRIBUTING.md) file in this repository for instructions on how to contribute to platform-mesh.

## Code of Conduct

Please refer to the [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) file in this repository for information on the expected Code of Conduct for contributing to platform-mesh.

## Licensing

Copyright 2025 SAP SE or an SAP affiliate company and platform-mesh contributors. Please see our [LICENSES](LICENSES)
for copyright and license information. Detailed information including third-party components and their licensing/copyright information
is available [via the REUSE tool](https://api.reuse.software/info/github.com/platform-mesh/portal-ui-lib).


