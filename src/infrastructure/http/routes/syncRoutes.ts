import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { SyncOutboxBatchUseCase } from '../../../application/use-cases/SyncOutboxBatchUseCase.js';
import { syncBatchRequestSchema } from '../../../application/dtos/syncDto.js';
import { verifyOptionalAuth } from '../middleware/authMiddleware.js';

interface SyncRouteOptions extends FastifyPluginOptions {
  syncUseCase: SyncOutboxBatchUseCase;
}

export async function syncRoutes(fastify: FastifyInstance, opts: SyncRouteOptions) {
  const { syncUseCase } = opts;

  fastify.post(
    '/api/sync',
    { preHandler: [verifyOptionalAuth] },
    async (request, reply) => {
      const parseResult = syncBatchRequestSchema.safeParse(request.body);

      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Validation failed',
          details: parseResult.error.errors,
        });
      }

      // Allow authenticated staff OR unauthenticated guests if all events are waiter calls
      const isStaff = Boolean(request.user);
      if (!isStaff) {
        const hasRestrictedEvents = parseResult.data.events.some(
          (event) => event.entity !== 'waiter_call'
        );
        if (hasRestrictedEvents) {
          return reply.status(401).send({
            error: 'Unauthorized',
            message: 'Unauthenticated guests are only permitted to submit waiter_call events',
          });
        }
      }

      const result = await syncUseCase.execute(parseResult.data.events);
      return reply.status(200).send(result);
    }
  );
}
