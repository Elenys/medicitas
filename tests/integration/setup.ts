import { execSync } from 'node:child_process';
import { Client } from 'pg';

const ADMIN_URL =
  process.env.TEST_ADMIN_URL ?? 'postgresql://medicitas:medicitas@localhost:5432/medicitas';
export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://medicitas:medicitas@localhost:5432/medicitas_test?schema=public';

/** Crea la base de pruebas si no existe y le aplica las migraciones. */
export default async function setup(): Promise<void> {
  const admin = new Client({ connectionString: ADMIN_URL });
  await admin.connect();
  const exists = await admin.query("SELECT 1 FROM pg_database WHERE datname = 'medicitas_test'");
  if (exists.rowCount === 0) await admin.query('CREATE DATABASE medicitas_test');
  await admin.end();
  execSync('npx prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    stdio: 'pipe',
  });
  process.env.DATABASE_URL = TEST_DATABASE_URL;
}
