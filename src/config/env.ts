import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.DATABASE_URL && process.env.NODE_ENV === 'test') {
  process.env.DATABASE_URL = 'postgresql://localhost:5432/barflow_test';
}

export const envSchema = z.object({
  PORT: z
    .string()
    .default('8000')
    .transform((val) => parseInt(val, 10)),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  CORS_ORIGIN: z.string().default('*'),
  SUPABASE_JWT_SECRET: z.string().default('dev-secret-only'),
  SUPABASE_URL: z.string().optional(),
  SUPABASE_JWT_PUBLIC_KEY: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(input: Record<string, unknown> = process.env): Env {
  const result = envSchema.safeParse(input);

  if (!result.success) {
    const formatted = result.error.errors
      .map((err) => `${err.path.join('.')}: ${err.message}`)
      .join(', ');
    throw new Error(`Environment validation failed: ${formatted}`);
  }

  return result.data;
}

export const env = validateEnv(process.env);

