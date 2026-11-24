import { z } from 'zod';

const booleanString = z
  .enum(['true', 'false'])
  .default('false')
  .transform((v) => v === 'true');

const base = {
  VITE_API_BASE_URL: z.url(),
  VITE_USE_MOCKS: booleanString,
};

const envSchema = z.discriminatedUnion('VITE_AUTH_MODE', [
  z.object({
    ...base,
    VITE_AUTH_MODE: z.literal('dev'),
  }),
  z.object({
    ...base,
    VITE_AUTH_MODE: z.literal('entra'),
    VITE_ENTRA_CLIENT_ID: z.guid(),
    VITE_ENTRA_TENANT_ID: z.guid(),
    VITE_ENTRA_REDIRECT_URI: z.url(),
    VITE_ENTRA_API_SCOPE: z.string().min(1),
  }),
]);

export type Env = z.infer<typeof envSchema>;

export const envResult = envSchema.safeParse(import.meta.env);

/** Validated env. Only read this after main.tsx has confirmed `envResult.success`. */
export const env = (envResult.success ? envResult.data : {}) as Env;

/** True only in `vite dev` with VITE_USE_MOCKS=true. Always false in production builds. */
export const mocksEnabled = import.meta.env.DEV && env.VITE_USE_MOCKS;

/** True only in `vite dev` with VITE_AUTH_MODE=dev. Always false in production builds. */
export const devAuthEnabled = import.meta.env.DEV && env.VITE_AUTH_MODE === 'dev';
