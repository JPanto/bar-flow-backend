import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { SyncOutboxBatchUseCase } from '../../../application/use-cases/SyncOutboxBatchUseCase.js';
import { syncBatchRequestSchema } from '../../../application/dtos/syncDto.js';

interface SyncRouteOptions extends FastifyPluginOptions {
  syncUseCase: SyncOutboxBatchUseCase;
}

export async function syncRoutes(fastify: FastifyInstance, opts: SyncRouteOptions) {
  const { syncUseCase } = opts;

  fastify.post('/api/sync', async (request, reply) => {
    const parseResult = syncBatchRequestSchema.safeParse(request.body);

    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Validation failed',
        details: parseResult.error.errors,
      });
    }

    const result = await syncUseCase.execute(parseResult.data.events);
    return reply.status(200).send(result);
  });
}
