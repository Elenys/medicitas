import { defineConfig } from 'vitest/config';
import path from 'node:path';

// Pruebas contra PostgreSQL real (especificacion/08 §3). Usan la base medicitas_test,
// que el setup crea y migra; nunca tocan la base de desarrollo.
export default defineConfig({
  test: {
    include: ['tests/integration/**/*.test.ts'],
    environment: 'node',
    globalSetup: ['tests/integration/setup.ts'],
    fileParallelism: false,
    testTimeout: 30_000,
  },
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
});
