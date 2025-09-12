const path = require('path');

module.exports = {
  preset: 'jest-preset-angular',
  testRunner: 'jest-jasmine2',
  displayName: 'wc',
  roots: [__dirname],
  testMatch: ['**/*.spec.ts'],
  module: 'NodeNext',
  moduleResolution: 'NodeNext',
  target: 'ES2022',
  types: ['jest', 'node'],
  testEnvironment: 'jsdom',
  coverageDirectory: path.resolve(__dirname, '../../coverage/wc'),
  collectCoverageFrom: ['!<rootDir>/projects/wc/**/*.spec.ts'],
  coveragePathIgnorePatterns: [
    '<rootDir>/projects/lib/',
    '<rootDir>/projects/wc/src/main.ts',
    '<rootDir>/projects/wc/src/app/app.config.ts',
    '<rootDir>/projects/wc/jest.config.js',
  ],
  // Ensure mocks are applied before modules are loaded
  setupFiles: [`${__dirname}/jest.setup.ts`],
  setupFilesAfterEnv: [],
  // Do not ignore mocks; they are loaded via setupFiles
  modulePathIgnorePatterns: [],
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 95,
      lines: 95,
      statements: -5,
    },
  },
  moduleNameMapper: {
    '^lodash-es(.*)': 'lodash',
    '^@platform-mesh/portal-ui-lib$': path.resolve(
      __dirname,
      '../lib/public-api.ts',
    ),
    '^@platform-mesh/portal-ui-lib/services$': path.resolve(
      __dirname,
      '../lib/services/public-api.ts',
    ),
    '^@platform-mesh/portal-ui-lib/utils$': path.resolve(
      __dirname,
      '../lib/utils/public-api.ts',
    ),
    '^@platform-mesh/portal-ui-lib/(.*)': path.resolve(__dirname, '../lib/$1'),
  },
};
