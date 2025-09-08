module.exports = {
  preset: 'jest-preset-angular',
  testRunner: 'jest-jasmine2',
  collectCoverage: true,
  modulePathIgnorePatterns: ['<rootDir>/dist/', '<rootDir>/dist-wc/'],
  coveragePathIgnorePatterns: ['/node_modules/', '/integration-tests/'],
  moduleNameMapper: {
    '^@luigi-project/client-support-angular$': '<rootDir>/projects/lib/_mocks_/luigi-client-support-angular.ts',
  },
};
