module.exports = {
  testPathIgnorePatterns: ['/node_modules/'],
  transform: {
    '.spec.ts$': ['ts-jest', {}],
  },
  collectCoverage: true,
  testRegex: ['.spec.ts$'],
  testEnvironment: 'node',
  preset: 'ts-jest',
  collectCoverageFrom: ['src/**/*.ts'],
  watchPathIgnorePatterns: ['/node_modules/'],
};
