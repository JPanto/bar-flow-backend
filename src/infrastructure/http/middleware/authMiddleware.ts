import { FastifyReply, FastifyRequest } from 'fastify';
import crypto from 'node:crypto';
import { env } from '../../../config/env.js';

export interface AuthUser {
  id: string;
  email: string;
  tenantId: string;
  role: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthUser;
  }
}

export interface SupabaseJwtPayload {
  sub?: string;
  id?: string;
  email?: string;
  role?: string;
  tenant_id?: string;
  tenantId?: string;
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

/**
 * Verifies HS256 JWT signature and expiration against the given secret.
 * Throws an Error if token is invalid, expired, or malformed.
 */
export function verifySupabaseJwt(
  token: string,
  secret: string = env.SUPABASE_JWT_SECRET
): SupabaseJwtPayload {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Malformed token: expected 3 dot-separated parts');
  }

  const [headerB64, payloadB64, signatureB64] = parts;

  let header: { alg?: string; typ?: string };
  try {
    header = JSON.parse(Buffer.from(headerB64, 'base64url').toString('utf8'));
  } catch {
    throw new Error('Malformed token: invalid header JSON');
  }

  if (header.alg !== 'HS256') {
    throw new Error(`Unsupported token algorithm: ${header.alg}`);
  }

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

  let payload: SupabaseJwtPayload;
  try {
    payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
  } catch {
    throw new Error('Malformed token: invalid payload JSON');
  }

  if (payload.exp && typeof payload.exp === 'number') {
    const nowInSeconds = Math.floor(Date.now() / 1000);
    if (payload.exp < nowInSeconds) {
      throw new Error('Token has expired');
    }
  }

  return payload;
}

/**
 * Extracts normalized AuthUser from decoded Supabase payload with safe fallbacks.
 */
export function extractAuthUser(payload: SupabaseJwtPayload): AuthUser {
  const id = payload.sub || payload.id;
  if (!id) {
    throw new Error('Token payload missing subject (sub/id)');
  }

  const email = payload.email || '';

  const tenantId =
    payload.tenant_id ??
    payload.tenantId ??
    payload.app_metadata?.tenant_id ??
    payload.user_metadata?.tenant_id ??
    'default';

  const role =
    payload.app_metadata?.role ??
    payload.user_metadata?.role ??
    (payload.role && payload.role !== 'authenticated' ? payload.role : undefined) ??
    'staff';

  return { id, email, tenantId, role };
}

function extractBearerToken(authHeader?: string): string | null {
  if (!authHeader) return null;
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

/**
 * Fastify preHandler hook requiring valid Bearer JWT.
 * Rejects with 401 if token is missing, invalid, or expired.
 */
export async function verifyAuth(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const token = extractBearerToken(request.headers.authorization);

  if (!token) {
    reply.status(401).send({
      error: 'Unauthorized',
      message: 'Missing or malformed Authorization Bearer header',
    });
    return;
  }

  try {
    const payload = verifySupabaseJwt(token);
    request.user = extractAuthUser(payload);
  } catch (err: any) {
    reply.status(401).send({
      error: 'Unauthorized',
      message: err.message || 'Invalid authorization token',
    });
    return;
  }
}

/**
 * Fastify preHandler hook allowing unauthenticated guests (e.g. table calls),
 * but validating Bearer JWT if one was provided in the headers.
 */
export async function verifyOptionalAuth(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const authHeader = request.headers.authorization;
  if (!authHeader) {
    return;
  }

  const token = extractBearerToken(authHeader);
  if (!token) {
    reply.status(401).send({
      error: 'Unauthorized',
      message: 'Malformed Authorization Bearer header',
    });
    return;
  }

  try {
    const payload = verifySupabaseJwt(token);
    request.user = extractAuthUser(payload);
  } catch (err: any) {
    reply.status(401).send({
      error: 'Unauthorized',
      message: err.message || 'Invalid authorization token',
    });
    return;
  }
}

/**
 * Test helper to sign a valid/custom HS256 JWT using node:crypto.
 */
export function createTestJwt(
  payload: Record<string, unknown>,
  secret: string = env.SUPABASE_JWT_SECRET,
  options?: { expiresInSeconds?: number; alg?: string }
): string {
  const alg = options?.alg ?? 'HS256';
  const header = { alg, typ: 'JWT' };
  const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');

  const fullPayload = {
    ...payload,
    ...(options?.expiresInSeconds !== undefined
      ? { exp: Math.floor(Date.now() / 1000) + options.expiresInSeconds }
      : {}),
  };
  const payloadB64 = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');

  const signatureB64 = crypto
    .createHmac('sha256', secret)
    .update(`${headerB64}.${payloadB64}`)
    .digest('base64url');

  return `${headerB64}.${payloadB64}.${signatureB64}`;
}
