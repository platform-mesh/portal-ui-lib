const path = require('path');

module.exports = {
  displayName: 'lib',
  roots: [__dirname],
  testMatch: ['**/*.spec.ts'],
  coverageDirectory: path.resolve(__dirname, '../../coverage/lib'),
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 95,
      lines: 95,
      statements: -3,
    },
  },
  moduleNameMapper: {
    '^@platform-mesh/portal-ui-lib$': path.resolve(
      __dirname,
      './public-api.ts',
    ),
    '^@platform-mesh/portal-ui-lib/services$': path.resolve(
      __dirname,
      './services/public-api.ts',
    ),
    '^@platform-mesh/portal-ui-lib/utils$': path.resolve(
      __dirname,
      './utils/public-api.ts',
    ),
    '^@platform-mesh/portal-ui-lib/(.*)': path.resolve(__dirname, './$1'),
  },
};
