module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  testEnvironmentOptions: {
    customExportConditions: ['node', 'node-addons'],
  },
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.test.ts',
    '!src/**/*.d.ts',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testTimeout: 30000, // 30 seconds for network operations
  setupFilesAfterEnv: ['<rootDir>/jest.setup.cjs'],
  forceExit: true, // Force Jest to exit after tests complete
  detectOpenHandles: true, // Detect open handles that prevent Jest from exiting
};

