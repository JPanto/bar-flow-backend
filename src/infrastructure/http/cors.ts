import { FastifyCorsOptions } from '@fastify/cors';

/**
 * Builds resilient Fastify CORS options supporting:
 * - Dynamic origin mirroring for credentials and Authorization header compatibility
 * - Comma-separated CORS_ORIGIN lists
 * - Automatic trimming of trailing slashes (e.g. https://domain.com/)
 * - Wildcard subdomain matching (e.g. *.workers.dev, *.pages.dev)
 * - Safe localhost and loopback fallbacks for local dev
 */
export function buildCorsOptions(configuredOrigin?: string): FastifyCorsOptions {
  const rawOrigin = configuredOrigin ?? '*';

  // If wildcard '*', allow any origin by mirroring the incoming origin so credentials and authorization work
  if (!rawOrigin || rawOrigin.trim() === '*' || rawOrigin.trim() === '') {
    return {
      origin: true,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
      exposedHeaders: ['*'],
      maxAge: 86400,
      strictPreflight: false,
    };
  }

  // Parse comma-separated list of origins and normalize
  const allowedList = rawOrigin
    .split(',')
    .map((o) => o.trim().replace(/\/+$/, '').toLowerCase())
    .filter(Boolean);

  if (allowedList.includes('*')) {
    return {
      origin: true,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
      exposedHeaders: ['*'],
      maxAge: 86400,
      strictPreflight: false,
    };
  }

  return {
    origin: (origin, cb) => {
      // Allow non-browser requests (no origin header, e.g. curl, native app, or server-to-server)
      if (!origin) {
        return cb(null, true);
      }

      const normalizedOrigin = origin.trim().replace(/\/+$/, '').toLowerCase();

      // 1. Direct match in allowed list
      if (allowedList.includes(normalizedOrigin)) {
        return cb(null, true);
      }

      // 2. Always allow localhost and 127.0.0.1 for development
      if (
        /^https?:\/\/localhost(:\d+)?$/.test(normalizedOrigin) ||
        /^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(normalizedOrigin)
      ) {
        return cb(null, true);
      }

      // 3. Support wildcard subdomain patterns (e.g. *.workers.dev or *.pages.dev)
      const matchesPattern = allowedList.some((allowed) => {
        if (allowed.includes('*')) {
          // If scheme is omitted in pattern (e.g. *.workers.dev), match any http/https scheme
          const patternWithScheme = allowed.startsWith('http://') || allowed.startsWith('https://')
            ? allowed
            : `https?://${allowed}`;
          const regexStr = '^' + patternWithScheme.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$';
          return new RegExp(regexStr).test(normalizedOrigin);
        }
        return false;
      });

      if (matchesPattern) {
        return cb(null, true);
      }

      // Disallow origin
      return cb(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    exposedHeaders: ['*'],
    maxAge: 86400,
    strictPreflight: false,
  };
}
