import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import {
  verifySupabaseJwt,
  extractAuthUser,
  verifyAuth,
  verifyOptionalAuth,
  createTestJwt,
} from '../../src/infrastructure/http/middleware/authMiddleware.js';
import { env } from '../../src/config/env.js';

describe('Supabase Auth Middleware & JWT Verification', () => {
  const testSecret = 'super-secret-jwt-token-with-at-least-32-characters-long';

  describe('verifySupabaseJwt', () => {
    it('should successfully verify a valid HS256 JWT token', () => {
      const token = createTestJwt(
        { sub: 'usr-123', email: 'staff@barflow.com' },
        testSecret
      );

      const decoded = verifySupabaseJwt(token, testSecret);
      expect(decoded.sub).toBe('usr-123');
      expect(decoded.email).toBe('staff@barflow.com');
    });

    it('should reject a token signed with an incorrect secret', () => {
      const token = createTestJwt(
        { sub: 'usr-123' },
        'wrong-secret-key-32-characters-or-more'
      );

      expect(() => verifySupabaseJwt(token, testSecret)).toThrow(/Invalid token signature/);
    });

    it('should reject an expired token', () => {
      const token = createTestJwt(
        { sub: 'usr-123' },
        testSecret,
        { expiresInSeconds: -60 }
      );

      expect(() => verifySupabaseJwt(token, testSecret)).toThrow(/Token has expired/);
    });

    it('should accept a token with valid future expiration', () => {
      const token = createTestJwt(
        { sub: 'usr-123' },
        testSecret,
        { expiresInSeconds: 3600 }
      );

      const decoded = verifySupabaseJwt(token, testSecret);
      expect(decoded.sub).toBe('usr-123');
    });

    it('should reject malformed token strings', () => {
      expect(() => verifySupabaseJwt('malformed.token', testSecret)).toThrow(
        /expected 3 dot-separated parts/
      );
      expect(() => verifySupabaseJwt('a.b.c', testSecret)).toThrow(/invalid header JSON/);
    });

    it('should reject unsupported algorithms', () => {
      const token = createTestJwt({ sub: 'usr-123' }, testSecret, { alg: 'none' });
      expect(() => verifySupabaseJwt(token, testSecret)).toThrow(/Unsupported token algorithm/);
    });
  });

  describe('extractAuthUser', () => {
    it('should extract user info with explicit tenantId and role', () => {
      const payload = {
        sub: 'usr-456',
        email: 'manager@bar.com',
        tenant_id: 'tenant-rooftop',
        role: 'manager',
      };

      const user = extractAuthUser(payload);
      expect(user).toEqual({
        id: 'usr-456',
        email: 'manager@bar.com',
        tenantId: 'tenant-rooftop',
        role: 'manager',
      });
    });

    it('should extract user info from app_metadata and user_metadata', () => {
      const payload = {
        sub: 'usr-789',
        email: 'owner@bar.com',
        app_metadata: { tenant_id: 'tenant-beach', role: 'admin' },
      };

      const user = extractAuthUser(payload);
      expect(user.id).toBe('usr-789');
      expect(user.tenantId).toBe('tenant-beach');
      expect(user.role).toBe('admin');
    });

    it('should fallback tenantId to "default" and role to "staff"', () => {
      const payload = {
        sub: 'usr-001',
        email: 'waiter@bar.com',
        role: 'authenticated', // standard supabase default role
      };

      const user = extractAuthUser(payload);
      expect(user.tenantId).toBe('default');
      expect(user.role).toBe('staff');
    });

    it('should throw when neither sub nor id is present', () => {
      expect(() => extractAuthUser({ email: 'missing-sub@bar.com' })).toThrow(
        /missing subject/
      );
    });
  });

  describe('Fastify Hooks', () => {
    let app: FastifyInstance;

    beforeEach(async () => {
      app = Fastify();

      app.get('/protected', { preHandler: [verifyAuth] }, async (req) => {
        return { success: true, user: req.user };
      });

      app.get('/optional', { preHandler: [verifyOptionalAuth] }, async (req) => {
        return { success: true, user: req.user || null };
      });

      await app.ready();
    });

    afterEach(async () => {
      await app.close();
    });

    describe('verifyAuth preHandler', () => {
      it('should return 401 when Authorization header is missing', async () => {
        const res = await app.inject({
          method: 'GET',
          url: '/protected',
        });

        expect(res.statusCode).toBe(401);
        const body = JSON.parse(res.payload);
        expect(body.error).toBe('Unauthorized');
      });

      it('should return 401 when Authorization header does not use Bearer scheme', async () => {
        const res = await app.inject({
          method: 'GET',
          url: '/protected',
          headers: { authorization: 'Basic dXNlcjpwYXNz' },
        });

        expect(res.statusCode).toBe(401);
      });

      it('should return 401 when token signature is invalid', async () => {
        const invalidToken = createTestJwt({ sub: 'u1' }, 'wrong-secret-token-key-longer-than-32');
        const res = await app.inject({
          method: 'GET',
          url: '/protected',
          headers: { authorization: `Bearer ${invalidToken}` },
        });

        expect(res.statusCode).toBe(401);
      });

      it('should return 200 and attach user to request when token is valid', async () => {
        const validToken = createTestJwt({
          sub: 'u-valid',
          email: 'bartender@pub.com',
          tenant_id: 'tenant-pub',
          role: 'staff',
        });

        const res = await app.inject({
          method: 'GET',
          url: '/protected',
          headers: { authorization: `Bearer ${validToken}` },
        });

        expect(res.statusCode).toBe(200);
        const body = JSON.parse(res.payload);
        expect(body.user).toEqual({
          id: 'u-valid',
          email: 'bartender@pub.com',
          tenantId: 'tenant-pub',
          role: 'staff',
        });
      });
    });

    describe('verifyOptionalAuth preHandler', () => {
      it('should allow unauthenticated requests without setting user', async () => {
        const res = await app.inject({
          method: 'GET',
          url: '/optional',
        });

        expect(res.statusCode).toBe(200);
        const body = JSON.parse(res.payload);
        expect(body.user).toBeNull();
      });

      it('should return 401 when an invalid token is provided', async () => {
        const res = await app.inject({
          method: 'GET',
          url: '/optional',
          headers: { authorization: 'Bearer invalid.jwt.token' },
        });

        expect(res.statusCode).toBe(401);
      });

      it('should authenticate user when a valid token is provided', async () => {
        const validToken = createTestJwt({
          sub: 'u-opt',
          email: 'guest-staff@pub.com',
        });

        const res = await app.inject({
          method: 'GET',
          url: '/optional',
          headers: { authorization: `Bearer ${validToken}` },
        });

        expect(res.statusCode).toBe(200);
        const body = JSON.parse(res.payload);
        expect(body.user.id).toBe('u-opt');
        expect(body.user.tenantId).toBe('default');
      });
    });
  });
});
