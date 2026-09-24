import { FastifyInstance } from 'fastify';

export async function healthRoutes(fastify: FastifyInstance) {
  fastify.get('/health', async () => {
    return {
      status: 'ok',
      service: 'bar-flow-backend',
      timestamp: Date.now(),
      uptime: process.uptime(),
    };
  });
}
