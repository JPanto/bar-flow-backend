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
    async (_request, reply) => {
      const state = await initialStateUseCase.execute();
      return reply.status(200).send(state);
    }
  );
}
