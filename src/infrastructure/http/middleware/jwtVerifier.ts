import crypto from 'node:crypto';
import { env } from '../../../config/env.js';

export interface SupabaseJwtPayload {
  sub?: string;
  id?: string;
  email?: string;
  role?: string;
  tenant_id?: string;
  tenantId?: string;
  iss?: string;
  app_metadata?: {
    tenant_id?: string;
    role?: string;
    [key: string]: unknown;
  };
  user_metadata?: {
    tenant_id?: string;
    role?: string;
    [key: string]: unknown;
  };
  exp?: number;
  [key: string]: unknown;
}

interface JwkKey {
  kid?: string;
  kty: string;
  crv?: string;
  x?: string;
  y?: string;
  alg?: string;
  use?: string;
  [key: string]: unknown;
}

interface CachedJwks {
  keys: JwkKey[];
  expiresAt: number;
}

const jwksCache = new Map<string, CachedJwks>();
const publicKeyObjectCache = new Map<string, crypto.KeyObject>();

export function clearJwksCache(): void {
  jwksCache.clear();
  publicKeyObjectCache.clear();
}

/**
 * Resolves a Crypto KeyObject for verifying ES256 tokens using:
 * 1. Explicit PEM or JWK (via argument or env.SUPABASE_JWT_PUBLIC_KEY)
 * 2. Supabase JWKS from env.SUPABASE_URL
 * 3. Supabase JWKS derived from a valid payload.iss (https://*.supabase.co/auth/v1)
 */
async function resolveEs256PublicKey(
  kid?: string,
  payloadIss?: string,
  explicitKeyOrSecret?: string
): Promise<crypto.KeyObject> {
  // 1. Check explicit public key
  const explicitKey =
    explicitKeyOrSecret && explicitKeyOrSecret.includes('-----BEGIN')
      ? explicitKeyOrSecret
      : env.SUPABASE_JWT_PUBLIC_KEY;

  if (explicitKey) {
    const trimmed = explicitKey.trim();
    if (trimmed.startsWith('-----BEGIN')) {
      return crypto.createPublicKey(trimmed);
    }
    if (trimmed.startsWith('{')) {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed.keys)) {
        const found = kid ? parsed.keys.find((k: any) => k.kid === kid) : parsed.keys[0];
        if (found) return crypto.createPublicKey({ key: found, format: 'jwk' });
      } else {
        return crypto.createPublicKey({ key: parsed, format: 'jwk' });
      }
    }
  }

  // 2. Determine trusted JWKS URL
  let targetJwksUrl: string | undefined;

  if (env.SUPABASE_URL) {
    const normalizedUrl = env.SUPABASE_URL.trim().replace(/\/+$/, '');
    targetJwksUrl = `${normalizedUrl}/auth/v1/.well-known/jwks.json`;
  } else if (payloadIss && typeof payloadIss === 'string') {
    const match = payloadIss.trim().replace(/\/+$/, '').match(/^(https:\/\/[a-z0-9_-]+\.supabase\.co\/auth\/v1)$/i);
    if (match) {
      targetJwksUrl = `${match[1]}/.well-known/jwks.json`;
    }
  }

  if (!targetJwksUrl) {
    throw new Error(
      `Unable to verify ES256 token: No public key or Supabase URL configured. ` +
        `Please set SUPABASE_URL or SUPABASE_JWT_PUBLIC_KEY in your backend environment.`
    );
  }

  // 3. Check memory cache for KeyObject
  const cacheKey = `${targetJwksUrl}:${kid || 'default'}`;
  const cachedKeyObj = publicKeyObjectCache.get(cacheKey);
  if (cachedKeyObj) {
    return cachedKeyObj;
  }

  // 4. Fetch and cache JWKS with 1 hour TTL
  let jwksData = jwksCache.get(targetJwksUrl);
  if (!jwksData || jwksData.expiresAt < Date.now()) {
    try {
      const response = await fetch(targetJwksUrl, {
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }
      const json: any = await response.json();
      if (!json || !Array.isArray(json.keys)) {
        throw new Error('Invalid JWKS structure: missing keys array');
      }
      jwksData = {
        keys: json.keys,
        expiresAt: Date.now() + 3600000,
      };
      jwksCache.set(targetJwksUrl, jwksData);
    } catch (err: any) {
      throw new Error(`Failed to fetch Supabase JWKS from ${targetJwksUrl}: ${err.message}`);
    }
  }

  // 5. Match key by kid or take the first ES256/EC key
  const matchingJwk = kid
    ? jwksData.keys.find((k) => k.kid === kid)
    : jwksData.keys.find((k) => k.kty === 'EC' || k.alg === 'ES256') || jwksData.keys[0];

  if (!matchingJwk) {
    throw new Error(`No matching key found in Supabase JWKS for kid: ${kid || 'unknown'}`);
  }

  const keyObject = crypto.createPublicKey({ key: matchingJwk, format: 'jwk' });
  publicKeyObjectCache.set(cacheKey, keyObject);
  return keyObject;
}

/**
 * Verifies Supabase JWT signatures supporting both HS256 (HMAC) and ES256 (ECDSA P-256).
 */
export async function verifySupabaseJwt(
  token: string,
  secretOrPublicKey?: string
): Promise<SupabaseJwtPayload> {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Malformed token: expected 3 dot-separated parts');
  }

  const [headerB64, payloadB64, signatureB64] = parts;

  let header: { alg?: string; typ?: string; kid?: string };
  try {
    header = JSON.parse(Buffer.from(headerB64, 'base64url').toString('utf8'));
  } catch {
    throw new Error('Malformed token: invalid header JSON');
  }

  let payload: SupabaseJwtPayload;
  try {
    payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
  } catch {
    throw new Error('Malformed token: invalid payload JSON');
  }

  if (header.alg === 'HS256') {
    const secret = secretOrPublicKey || env.SUPABASE_JWT_SECRET;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${headerB64}.${payloadB64}`)
      .digest('base64url');

    const sigBuffer = Buffer.from(signatureB64, 'base64url');
    const expectedBuffer = Buffer.from(expectedSignature, 'base64url');

    if (
      sigBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(sigBuffer, expectedBuffer)
    ) {
      throw new Error('Invalid token signature');
    }
  } else if (header.alg === 'ES256') {
    const keyObject = await resolveEs256PublicKey(header.kid, payload.iss, secretOrPublicKey);

    const sigBuffer = Buffer.from(signatureB64, 'base64url');
    const verifier = crypto.createVerify('SHA256');
    verifier.update(`${headerB64}.${payloadB64}`);

    const isValid = verifier.verify(
      { key: keyObject, dsaEncoding: 'ieee-p1363' },
      sigBuffer
    );

    if (!isValid) {
      throw new Error('Invalid token signature');
    }
  } else {
    throw new Error(`Unsupported token algorithm: ${header.alg}`);
  }

  if (payload.exp && typeof payload.exp === 'number') {
    const nowInSeconds = Math.floor(Date.now() / 1000);
    if (payload.exp < nowInSeconds) {
      throw new Error('Token has expired');
    }
  }

  return payload;
}
