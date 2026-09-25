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

// 0. Multi-Tenancy y Usuarios de Establecimientos
export const tenants = pgTable('tenants', {
  id: varchar('id', { length: 50 }).primaryKey(), // slug o uuid
  name: varchar('name', { length: 100 }).notNull(),
  ownerEmail: varchar('owner_email', { length: 150 }).notNull(),
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
});

export const tenantUsers = pgTable(
  'tenant_users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: varchar('tenant_id', { length: 50 })
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    userId: varchar('user_id', { length: 100 }).notNull(), // Supabase auth.users ID
    email: varchar('email', { length: 150 }).notNull(),
    role: varchar('role', { length: 20 }).default('staff').notNull(), // 'manager' | 'staff'
    createdAt: bigint('created_at', { mode: 'number' }).notNull(),
  },
  (t) => [
    index('idx_tenant_users_tenant').on(t.tenantId),
    index('idx_tenant_users_user').on(t.userId),
  ]
);

// 1. Zonas
export const zones = pgTable(
  'zones',
  {
    id: varchar('id', { length: 100 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 50 }).default('default').notNull(),
    name: varchar('name', { length: 100 }).notNull(),
    width: integer('width').notNull(),
    height: integer('height').notNull(),
    isDefault: boolean('is_default').default(false).notNull(),
    createdAt: bigint('created_at', { mode: 'number' }).notNull(),
  },
  (t) => [
    index('idx_zones_tenant').on(t.tenantId),
  ]
);

// 2. Mesas del Croquis
export const restaurantTables = pgTable(
  'restaurant_tables',
  {
    id: varchar('id', { length: 100 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 50 }).default('default').notNull(),
    zoneId: varchar('zone_id', { length: 100 })
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
    index('idx_tables_tenant').on(t.tenantId),
    index('idx_tables_zone').on(t.zoneId),
    index('idx_tables_status').on(t.status),
  ]
);

// 3. Sesiones y Códigos Dinámicos
export const tableSessions = pgTable(
  'table_sessions',
  {
    id: varchar('id', { length: 100 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 50 }).default('default').notNull(),
    tableId: varchar('table_id', { length: 100 })
      .references(() => restaurantTables.id, { onDelete: 'cascade' })
      .notNull(),
    sessionWord: varchar('session_word', { length: 50 }).notNull(),
    status: varchar('status', { length: 20 }).notNull(), // 'active' | 'closed'
    openedAt: bigint('opened_at', { mode: 'number' }).notNull(),
    closedAt: bigint('closed_at', { mode: 'number' }),
  },
  (t) => [
    index('idx_sessions_tenant').on(t.tenantId),
    index('idx_sessions_table_status').on(t.tableId, t.status),
  ]
);

// 4. Cola de Llamados al Mesero (FIFO)
export const waiterCalls = pgTable(
  'waiter_calls',
  {
    id: varchar('id', { length: 100 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 50 }).default('default').notNull(),
    tableId: varchar('table_id', { length: 100 })
      .references(() => restaurantTables.id, { onDelete: 'cascade' })
      .notNull(),
    sessionId: varchar('session_id', { length: 100 })
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
    index('idx_calls_tenant').on(t.tenantId),
    index('idx_calls_status_created').on(t.status, t.createdAt),
  ]
);

// 5. Reservas
export const reservations = pgTable(
  'reservations',
  {
    id: varchar('id', { length: 100 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 50 }).default('default').notNull(),
    tableId: varchar('table_id', { length: 100 }).references(() => restaurantTables.id, { onDelete: 'set null' }),
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
    index('idx_reservations_tenant').on(t.tenantId),
    index('idx_reservations_date_status').on(t.date, t.status),
  ]
);

// 6. Auditoría e Idempotencia de Sincronización Outbox
export const syncAuditLog = pgTable(
  'sync_audit_log',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: varchar('tenant_id', { length: 50 }).default('default').notNull(),
    clientEventId: varchar('client_event_id', { length: 100 }).notNull(),
    entity: varchar('entity', { length: 50 }).notNull(),
    action: varchar('action', { length: 20 }).notNull(),
    entityId: varchar('entity_id', { length: 100 }).notNull(),
    syncedAt: bigint('synced_at', { mode: 'number' }).notNull(),
  },
  (t) => [
    uniqueIndex('uq_sync_client_event').on(t.clientEventId),
    index('idx_sync_tenant').on(t.tenantId),
  ]
);

// 7. Categorías de Productos
export const productCategories = pgTable(
  'product_categories',
  {
    id: varchar('id', { length: 100 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 50 }).default('default').notNull(),
    name: varchar('name', { length: 100 }).notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
    createdAt: bigint('created_at', { mode: 'number' }).notNull(),
  },
  (t) => [
    index('idx_product_categories_tenant').on(t.tenantId),
  ]
);

// 8. Catálogo de Productos y Control de Stock
export const products = pgTable(
  'products',
  {
    id: varchar('id', { length: 100 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 50 }).default('default').notNull(),
    categoryId: varchar('category_id', { length: 100 })
      .references(() => productCategories.id, { onDelete: 'cascade' })
      .notNull(),
    name: varchar('name', { length: 100 }).notNull(),
    description: text('description'),
    price: integer('price').notNull(),
    stock: integer('stock').default(0).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    totalOrders: integer('total_orders').default(0).notNull(),
    updatedAt: bigint('updated_at', { mode: 'number' }).notNull(),
  },
  (t) => [
    index('idx_products_tenant').on(t.tenantId),
    index('idx_products_category').on(t.categoryId),
    index('idx_products_active').on(t.isActive),
    index('idx_products_total_orders').on(t.totalOrders),
  ]
);

// 9. Comandas / Pedidos de Mesa
export const productOrders = pgTable(
  'product_orders',
  {
    id: varchar('id', { length: 100 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 50 }).default('default').notNull(),
    tableId: varchar('table_id', { length: 100 })
      .references(() => restaurantTables.id, { onDelete: 'cascade' })
      .notNull(),
    sessionId: varchar('session_id', { length: 100 })
      .references(() => tableSessions.id, { onDelete: 'cascade' })
      .notNull(),
    tableName: varchar('table_name', { length: 50 }).notNull(),
    sessionWord: varchar('session_word', { length: 50 }).notNull(),
    status: varchar('status', { length: 20 }).default('pending').notNull(),
    totalAmount: integer('total_amount').notNull(),
    createdAt: bigint('created_at', { mode: 'number' }).notNull(),
    confirmedAt: bigint('confirmed_at', { mode: 'number' }),
  },
  (t) => [
    index('idx_orders_tenant').on(t.tenantId),
    index('idx_orders_table').on(t.tableId),
    index('idx_orders_session').on(t.sessionId),
    index('idx_orders_status').on(t.status),
    index('idx_orders_created').on(t.createdAt),
  ]
);

// 10. Líneas de Pedido
export const orderItems = pgTable(
  'order_items',
  {
    id: varchar('id', { length: 100 }).primaryKey(),
    orderId: varchar('order_id', { length: 100 })
      .references(() => productOrders.id, { onDelete: 'cascade' })
      .notNull(),
    productId: varchar('product_id', { length: 100 })
      .references(() => products.id, { onDelete: 'cascade' })
      .notNull(),
    productName: varchar('product_name', { length: 100 }).notNull(),
    unitPrice: integer('unit_price').notNull(),
    quantity: integer('quantity').notNull(),
    notes: text('notes'),
  },
  (t) => [
    index('idx_order_items_order').on(t.orderId),
    index('idx_order_items_product').on(t.productId),
  ]
);
