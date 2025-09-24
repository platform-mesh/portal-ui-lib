## Overview

# Contributing to platform-mesh

We want to make contributing to this project as easy and transparent as possible.

## Our development process

We use GitHub to track issues and feature requests, as well as accept pull requests.

## Pull requests

You are welcome to contribute with your pull requests. These steps explain the contribution process:

1. Fork the repository and create your branch from `main`.
1. [Add tests](#testing) for your code.
1. If you've changed APIs, update the documentation.
1. Make sure the tests pass. Our GitHub actions pipeline is running the unit and e2e tests for your PR and will indicate any issues.
1. Sign the Developer Certificate of Origin (DCO).

### Building

Run `npm build` to build the project.
The build artifacts will be stored in the `dist/` directory.

## Testing

> **NOTE:** You should always add tests, if you are adding code to our repository.

Run `npm test` to execute the unit tests via [Jest](https://jestjs.io/) in the root directory of the repository.

## Issues

We use GitHub issues to track bugs. Please ensure your description is
clear and includes sufficient instructions to reproduce the issue.

## License

By contributing to platform-mesh, you agree that your contributions will be licensed
under its [Apache-2.0 license](LICENSES).
