import { execFileSync } from 'node:child_process';
import { createPrismaClient } from './prisma-client';

const BASELINE = '0001_accounting';

export async function deployMigrations(databaseUrl: string): Promise<void> {
  const schema = new URL(databaseUrl).searchParams.get('schema') ?? 'public';
  const prisma = createPrismaClient(databaseUrl);
  let adoptLegacy = false;
  try {
    const tables = await prisma.$queryRaw<{ table_name: string }[]>`
      SELECT table_name FROM information_schema.tables WHERE table_schema = ${schema}`;
    const names = new Set(tables.map((row) => row.table_name));
    if (!names.has('_prisma_migrations') && names.has('app_migrations')) {
      const identifier = `"${schema.replaceAll('"', '""')}"."app_migrations"`;
      const legacy = await prisma.$queryRawUnsafe<{ version: string }[]>(
        `SELECT version FROM ${identifier} WHERE version = $1`, '001-accounting');
      adoptLegacy = legacy.length === 1 && ['contracts', 'works', 'payments'].every((name) => names.has(name));
    }
  } finally {
    await prisma.$disconnect();
  }
  const run = (args: string[]) => execFileSync(process.execPath, [require.resolve('prisma/build/index.js'), ...args], {
    stdio: 'inherit', env: { ...process.env, DATABASE_URL: databaseUrl },
  });
  if (adoptLegacy) run(['migrate', 'resolve', '--applied', BASELINE]);
  run(['migrate', 'deploy']);
}

if (require.main === module) {
  if (!process.env.DATABASE_URL) throw new Error('Для миграций задайте DATABASE_URL');
  void deployMigrations(process.env.DATABASE_URL).catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
