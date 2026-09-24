import {
  pgTable,
  uuid,
  varchar,
  integer,
  boolean,
  bigint,
  text,
  pgEnum,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

// PostgreSQL Enums
export const tableShapeEnum = pgEnum('table_shape', ['round', 'square', 'rectangle', 'counter']);
export const tableStatusEnum = pgEnum('table_status', ['available', 'occupied', 'reserved', 'blocked']);
export const callReasonEnum = pgEnum('call_reason', ['waiter', 'bill', 'help']);
export const callStatusEnum = pgEnum('call_status', ['pending', 'attending', 'resolved', 'cancelled']);
export const reservationStatusEnum = pgEnum('reservation_status', [
  'confirmed',
  'seated',
  'cancelled',
  'no_show',
  'completed',
]);

// 1. Zonas
export const zones = pgTable('zones', {
  id: uuid('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  width: integer('width').notNull(),
  height: integer('height').notNull(),
  isDefault: boolean('is_default').default(false).notNull(),
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
});

// 2. Mesas del Croquis
export const restaurantTables = pgTable(
  'restaurant_tables',
  {
    id: uuid('id').primaryKey(),
    zoneId: uuid('zone_id')
      .references(() => zones.id, { onDelete: 'cascade' })
      .notNull(),
    name: varchar('name', { length: 50 }).notNull(),
    shape: tableShapeEnum('shape').notNull(),
    x: integer('x').notNull(),
    y: integer('y').notNull(),
    width: integer('width').notNull(),
    height: integer('height').notNull(),
    rotation: integer('rotation').default(0).notNull(),
    seats: integer('seats').notNull(),
    status: tableStatusEnum('status').default('available').notNull(),
    updatedAt: bigint('updated_at', { mode: 'number' }).notNull(),
  },
  (t) => [
    index('idx_tables_zone').on(t.zoneId),
    index('idx_tables_status').on(t.status),
  ]
);

// 3. Sesiones y Códigos Dinámicos
export const tableSessions = pgTable(
  'table_sessions',
  {
    id: uuid('id').primaryKey(),
    tableId: uuid('table_id')
      .references(() => restaurantTables.id, { onDelete: 'cascade' })
      .notNull(),
    sessionWord: varchar('session_word', { length: 50 }).notNull(),
    status: varchar('status', { length: 20 }).notNull(), // 'active' | 'closed'
    openedAt: bigint('opened_at', { mode: 'number' }).notNull(),
    closedAt: bigint('closed_at', { mode: 'number' }),
  },
  (t) => [
    index('idx_sessions_table_status').on(t.tableId, t.status),
  ]
);

// 4. Cola de Llamados al Mesero (FIFO)
export const waiterCalls = pgTable(
  'waiter_calls',
  {
    id: uuid('id').primaryKey(),
    tableId: uuid('table_id')
      .references(() => restaurantTables.id, { onDelete: 'cascade' })
      .notNull(),
    sessionId: uuid('session_id')
      .references(() => tableSessions.id, { onDelete: 'cascade' })
      .notNull(),
    tableName: varchar('table_name', { length: 50 }).notNull(),
    sessionWord: varchar('session_word', { length: 50 }).notNull(),
    reason: callReasonEnum('reason').notNull(),
    status: callStatusEnum('status').default('pending').notNull(),
    createdAt: bigint('created_at', { mode: 'number' }).notNull(),
    attendingAt: bigint('attending_at', { mode: 'number' }),
    resolvedAt: bigint('resolved_at', { mode: 'number' }),
  },
  (t) => [
    index('idx_calls_status_created').on(t.status, t.createdAt),
  ]
);

// 5. Reservas
export const reservations = pgTable(
  'reservations',
  {
    id: uuid('id').primaryKey(),
    tableId: uuid('table_id').references(() => restaurantTables.id, { onDelete: 'set null' }),
    customerName: varchar('customer_name', { length: 150 }).notNull(),
    customerPhone: varchar('customer_phone', { length: 30 }).notNull(),
    customerEmail: varchar('customer_email', { length: 150 }),
    date: varchar('date', { length: 10 }).notNull(), // YYYY-MM-DD
    time: varchar('time', { length: 10 }).notNull(), // HH:mm
    pax: integer('pax').notNull(),
    notes: text('notes'),
    status: reservationStatusEnum('status').default('confirmed').notNull(),
    createdAt: bigint('created_at', { mode: 'number' }).notNull(),
  },
  (t) => [
    index('idx_reservations_date_status').on(t.date, t.status),
  ]
);

// 6. Auditoría e Idempotencia de Sincronización Outbox
export const syncAuditLog = pgTable(
  'sync_audit_log',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    clientEventId: varchar('client_event_id', { length: 100 }).notNull(),
    entity: varchar('entity', { length: 50 }).notNull(),
    action: varchar('action', { length: 20 }).notNull(),
    entityId: varchar('entity_id', { length: 100 }).notNull(),
    syncedAt: bigint('synced_at', { mode: 'number' }).notNull(),
  },
  (t) => [
    uniqueIndex('uq_sync_client_event').on(t.clientEventId),
  ]
);
