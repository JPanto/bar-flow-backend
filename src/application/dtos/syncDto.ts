import { z } from 'zod';

export const syncEventSchema = z.object({
  id: z.union([z.string(), z.number()]).transform((val) => String(val)),
  entity: z.enum([
    'zone',
    'table',
    'reservation',
    'customer',
    'table_session',
    'waiter_call',
    'category',
    'product',
    'product_order',
  ]),
  action: z.enum(['INSERT', 'UPDATE', 'DELETE']),
  entityId: z.string(),
  payload: z.record(z.any()),
  createdAt: z.number().optional(),
  timestamp: z.number().optional(),
});

export const syncBatchRequestSchema = z.object({
  events: z.array(syncEventSchema),
});

export type SyncEventDTO = z.infer<typeof syncEventSchema>;
export type SyncBatchRequestDTO = z.infer<typeof syncBatchRequestSchema>;
