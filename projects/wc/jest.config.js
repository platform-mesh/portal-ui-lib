const path = require('path');

module.exports = {
  displayName: 'wc',
  roots: [__dirname],
  testMatch: ['**/*.spec.ts'],
  coverageDirectory: path.resolve(__dirname, '../../coverage/wc'),
  collectCoverageFrom: [
    '!<rootDir>/projects/wc/**/*.spec.ts',
  ],
  coveragePathIgnorePatterns: [
    '<rootDir>/projects/lib/',
    '<rootDir>/projects/wc/src/main.ts',
    '<rootDir>/projects/wc/src/app/app.config.ts',
    '<rootDir>/projects/wc/jest.config.js',
  ],
  setupFilesAfterEnv: [`${__dirname}/jest.setup.ts`],
  modulePathIgnorePatterns: ['<rootDir>/projects/wc/_mocks_/'],
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 80,
      lines: 94,
      statements: -8,
    },
  },
  moduleNameMapper: {
    '^lodash-es(.*)': 'lodash',
    '^@platform-mesh/portal-ui-lib$': '<rootDir>/projects/lib/public-api.ts',
    '^@platform-mesh/portal-ui-lib/services$': '<rootDir>/projects/lib/services/public-api.ts',
    '^@platform-mesh/portal-ui-lib/utils$': '<rootDir>/projects/lib/utils/public-api.ts',
    '^@platform-mesh/portal-ui-lib/(.*)': '<rootDir>/projects/lib/$1',
  },
};
