import { z } from 'zod';

export const createCallSchema = z.object({
  tableId: z.string().uuid(),
  sessionId: z.string().uuid(),
  tableName: z.string().min(1),
  sessionWord: z.string().min(1),
  reason: z.enum(['waiter', 'bill', 'help']),
});

export type CreateCallDTO = z.infer<typeof createCallSchema>;
