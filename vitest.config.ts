import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    // Solo pruebas puras. Las de tests/integration/ hacen TRUNCATE y necesitan
    // el globalSetup de vitest.integration.config.ts, que las apunta a
    // medicitas_test; ejecutadas desde aquí caerían sobre la base de .env.
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
});
