const path = require('path');

module.exports = {
  displayName: 'lib',
  roots: [__dirname],
  testMatch: ['**/*.spec.ts'],
  coverageDirectory: path.resolve(__dirname, '../../coverage/lib'),
  coverageThreshold: {
    global: {
      branches: 67,
      functions: 95,
      lines: 91,
      statements: -16,
    },
  },
  moduleNameMapper: {
    '^@platform-mesh/portal-ui-lib$': '<rootDir>/projects/lib/public-api.ts',
    '^@platform-mesh/portal-ui-lib/services$': '<rootDir>/projects/lib/services/public-api.ts',
    '^@platform-mesh/portal-ui-lib/utils$': '<rootDir>/projects/lib/utils/public-api.ts',
    '^@platform-mesh/portal-ui-lib/(.*)': '<rootDir>/projects/lib/$1',
  },
};
