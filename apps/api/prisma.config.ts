import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    // Not env('DATABASE_URL'): that throws when unset, which would break `prisma generate`
    // on a fresh clone (postinstall) before apps/api/.env exists.
    url: process.env.DATABASE_URL ?? '',
  },
});
