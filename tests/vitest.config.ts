import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['server/**/*.test.ts'],
    pool: 'forks',
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
});
