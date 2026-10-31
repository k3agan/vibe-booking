/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/lib'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        // Type-checking is done by `tsc --noEmit` / `next build`; tests just transpile.
        tsconfig: {
          module: 'commonjs',
          target: 'ES2019',
          esModuleInterop: true,
          strict: true,
          skipLibCheck: true,
          resolveJsonModule: true,
          isolatedModules: true,
        },
      },
    ],
  },
};
