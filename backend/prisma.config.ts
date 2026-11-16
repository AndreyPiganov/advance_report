import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  // Generating the client does not require a running database.
  datasource: { url: process.env.DATABASE_URL ?? 'postgresql://localhost/advance_report' },
});
