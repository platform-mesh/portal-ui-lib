const path = require('path');

module.exports = {
  displayName: 'lib',
  coverageDirectory: path.resolve(__dirname, '../../coverage/lib'),
  setupFilesAfterEnv: [`${__dirname}/jest.setup.ts`],
  coverageThreshold: {
    global: {
      branches: 67,
      functions: 95,
      lines: 91,
      statements: -16,
    },
  },
};
