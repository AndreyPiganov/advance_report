import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

export function createPrismaClient(databaseUrl: string): PrismaClient {
  const schema = new URL(databaseUrl).searchParams.get('schema') ?? 'public';
  const adapter = new PrismaPg({ connectionString: databaseUrl, connectionTimeoutMillis: 5000 }, { schema });
  return new PrismaClient({ adapter });
}
