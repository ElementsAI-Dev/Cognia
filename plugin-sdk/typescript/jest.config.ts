import type { Config } from 'jest';

const config: Config = {
  // Transform TypeScript files
  preset: 'ts-jest',

  // Test environment
  testEnvironment: 'node',

  // Test file patterns
  testMatch: ['**/__tests__/**/*.test.ts', '**/*.test.ts'],

  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],

  // Coverage configuration
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts', '!src/**/index.ts'],

  coverageDirectory: 'coverage',

  coverageReporters: ['text', 'lcov', 'html', 'json'],

  // 保持严格的 80% 覆盖率标准
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },

  // Clear mocks between tests
  clearMocks: true,

  // Verbose output
  verbose: true,
};

export default config;
