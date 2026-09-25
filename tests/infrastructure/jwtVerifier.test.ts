import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import crypto from 'node:crypto';
import {
  verifySupabaseJwt,
  clearJwksCache,
} from '../../src/infrastructure/http/middleware/jwtVerifier.js';
import {
  createTestEs256Jwt,
} from '../../src/infrastructure/http/middleware/authMiddleware.js';
import { env } from '../../src/config/env.js';

describe('JWT Verifier - ES256 & JWKS Support', () => {
  let ecKeyPair: { publicKey: crypto.KeyObject; privateKey: crypto.KeyObject };
  let jwk: any;

  beforeEach(() => {
    clearJwksCache();
    ecKeyPair = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
    jwk = ecKeyPair.publicKey.export({ format: 'jwk' });
    jwk.kid = 'supabase-key-1';
    jwk.alg = 'ES256';
    jwk.use = 'sig';
  });

  afterEach(() => {
    clearJwksCache();
    vi.restoreAllMocks();
  });

  it('should verify ES256 token by fetching JWKS from configured SUPABASE_URL', async () => {
    const originalUrl = env.SUPABASE_URL;
    (env as any).SUPABASE_URL = 'https://mock-project.supabase.co';

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ keys: [jwk] }),
    } as any);

    try {
      const token = createTestEs256Jwt(
        { sub: 'usr-es256-live', email: 'waiter@bar.com', role: 'staff' },
        ecKeyPair.privateKey,
        { kid: 'supabase-key-1' }
      );

      const payload = await verifySupabaseJwt(token);
      expect(payload.sub).toBe('usr-es256-live');
      expect(payload.email).toBe('waiter@bar.com');
      expect(payload.role).toBe('staff');
      expect(fetchSpy).toHaveBeenCalledWith(
        'https://mock-project.supabase.co/auth/v1/.well-known/jwks.json',
        expect.any(Object)
      );
    } finally {
      (env as any).SUPABASE_URL = originalUrl;
    }
  });

  it('should verify ES256 token using explicit SUPABASE_JWT_PUBLIC_KEY in environment', async () => {
    const pem = ecKeyPair.publicKey.export({ format: 'pem', type: 'spki' }) as string;
    const originalKey = env.SUPABASE_JWT_PUBLIC_KEY;
    (env as any).SUPABASE_JWT_PUBLIC_KEY = pem;

    try {
      const token = createTestEs256Jwt(
        { sub: 'usr-pem-configured', email: 'admin@bar.com' },
        ecKeyPair.privateKey
      );

      const payload = await verifySupabaseJwt(token);
      expect(payload.sub).toBe('usr-pem-configured');
      expect(payload.email).toBe('admin@bar.com');
    } finally {
      (env as any).SUPABASE_JWT_PUBLIC_KEY = originalKey;
    }
  });

  it('should reuse cached JWKS on subsequent verifications without refetching', async () => {
    const originalUrl = env.SUPABASE_URL;
    (env as any).SUPABASE_URL = 'https://mock-cached.supabase.co';

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ keys: [jwk] }),
    } as any);

    try {
      const token1 = createTestEs256Jwt({ sub: 'user-1' }, ecKeyPair.privateKey, {
        kid: 'supabase-key-1',
      });
      const token2 = createTestEs256Jwt({ sub: 'user-2' }, ecKeyPair.privateKey, {
        kid: 'supabase-key-1',
      });

      await verifySupabaseJwt(token1);
      await verifySupabaseJwt(token2);

      expect(fetchSpy).toHaveBeenCalledTimes(1);
    } finally {
      (env as any).SUPABASE_URL = originalUrl;
    }
  });

  it('should verify ES256 token by resolving trusted payload.iss when SUPABASE_URL is omitted', async () => {
    const originalUrl = env.SUPABASE_URL;
    (env as any).SUPABASE_URL = undefined;

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ keys: [jwk] }),
    } as any);

    try {
      const token = createTestEs256Jwt(
        {
          sub: 'user-auto-iss',
          iss: 'https://test-auto-ref.supabase.co/auth/v1',
        },
        ecKeyPair.privateKey,
        { kid: 'supabase-key-1' }
      );

      const payload = await verifySupabaseJwt(token);
      expect(payload.sub).toBe('user-auto-iss');
      expect(fetchSpy).toHaveBeenCalledWith(
        'https://test-auto-ref.supabase.co/auth/v1/.well-known/jwks.json',
        expect.any(Object)
      );
    } finally {
      (env as any).SUPABASE_URL = originalUrl;
    }
  });
});
