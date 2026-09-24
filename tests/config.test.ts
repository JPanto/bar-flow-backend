import { describe, it, expect } from 'vitest';
import { validateEnv } from '../src/config/env.js';

describe('Environment Configuration Validation', () => {
  it('should use default values when optional vars are omitted', () => {
    const raw = {
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/barflow',
    };

    const env = validateEnv(raw);
    expect(env.PORT).toBe(8000);
    expect(env.NODE_ENV).toBe('development');
    expect(env.CORS_ORIGIN).toBe('*');
    expect(env.DATABASE_URL).toBe('postgresql://user:pass@localhost:5432/barflow');
    expect(env.SUPABASE_JWT_SECRET).toBe('dev-secret-only');
  });

  it('should parse custom PORT and environment', () => {
    const raw = {
      PORT: '5000',
      NODE_ENV: 'production',
      DATABASE_URL: 'postgresql://neon.tech/barflow',
      CORS_ORIGIN: 'https://barflow.pages.dev',
      SUPABASE_JWT_SECRET: 'custom-secret-key-12345',
    };

    const env = validateEnv(raw);
    expect(env.PORT).toBe(5000);
    expect(env.NODE_ENV).toBe('production');
    expect(env.CORS_ORIGIN).toBe('https://barflow.pages.dev');
    expect(env.SUPABASE_JWT_SECRET).toBe('custom-secret-key-12345');
  });

  it('should throw when DATABASE_URL is missing', () => {
    expect(() => validateEnv({})).toThrow(/DATABASE_URL/);
  });
});
