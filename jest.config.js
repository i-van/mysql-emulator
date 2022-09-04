module.exports = {
  testPathIgnorePatterns: ['/node_modules/'],
  globals: {
    'ts-jest': {
      diagnostics: false,
    },
  },
  collectCoverage: true,
  testRegex: ['.spec.ts$'],
  testEnvironment: 'node',
  preset: 'ts-jest',
  collectCoverageFrom: ['src/**/*.ts'],
  watchPathIgnorePatterns: ['/node_modules/'],
};
