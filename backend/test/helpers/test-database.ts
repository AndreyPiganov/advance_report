import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { deployMigrations } from '../../src/database/migrate';

export async function withTestDatabase(run: (url: string) => Promise<void>): Promise<void> {
  const url = new URL(process.env.TEST_DATABASE_URL!);
  const admin = new Pool({ connectionString: url.toString() });
  const schema = `test_${randomUUID().replaceAll('-', '')}`;
  await admin.query(`CREATE SCHEMA ${schema}`);
  url.searchParams.set('schema', schema);
  try {
    await deployMigrations(url.toString());
    await run(url.toString());
  } finally {
    await admin.query(`DROP SCHEMA ${schema} CASCADE`);
    await admin.end();
  }
}
