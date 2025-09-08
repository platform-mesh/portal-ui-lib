module.exports = {
  preset: 'jest-preset-angular',
  testRunner: 'jest-jasmine2',
  collectCoverage: true,
  modulePathIgnorePatterns: ['<rootDir>/dist/', '<rootDir>/dist-wc/', '<rootDir>/.yalc/'],
  coveragePathIgnorePatterns: ['/node_modules/', '/integration-tests/'],
  moduleNameMapper: {
    '^@luigi-project/client-support-angular$': '<rootDir>/projects/lib/_mocks_/luigi-client-support-angular.ts',
    '^@platform-mesh/portal-ui-lib$': '<rootDir>/projects/lib/public-api.ts',
    '^@platform-mesh/portal-ui-lib/services$': '<rootDir>/projects/lib/services/public-api.ts',
    '^@platform-mesh/portal-ui-lib/utils$': '<rootDir>/projects/lib/utils/public-api.ts',
    '^@platform-mesh/portal-ui-lib/(.*)': '<rootDir>/projects/lib/$1',
  },
};
