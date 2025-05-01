/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },
  setupFiles: ['dotenv/config'],
  testTimeout: 10000,
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  extensionsToTreatAsEsm: ['.ts'],
} 