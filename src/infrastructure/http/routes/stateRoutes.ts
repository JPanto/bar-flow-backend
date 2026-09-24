import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { GetInitialStateUseCase } from '../../../application/use-cases/GetInitialStateUseCase.js';
import { verifyAuth } from '../middleware/authMiddleware.js';

interface StateRouteOptions extends FastifyPluginOptions {
  initialStateUseCase: GetInitialStateUseCase;
}

export async function stateRoutes(fastify: FastifyInstance, opts: StateRouteOptions) {
  const { initialStateUseCase } = opts;

  fastify.get(
    '/api/state/initial',
    { preHandler: [verifyAuth] },
    async (request, reply) => {
      const tenantId = request.user?.tenantId || 'default';
      const state = await initialStateUseCase.execute(tenantId);
      return reply.status(200).send(state);
    }
  );
}
