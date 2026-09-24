import { eq } from 'drizzle-orm';
import { DatabaseInstance } from '../db/client.js';
import { restaurantTables } from '../db/schema.js';
import { ITableRepository } from '../../domain/repositories/ITableRepository.js';
import { RestaurantTable } from '../../domain/entities/Table.js';

export class DrizzleTableRepository implements ITableRepository {
  constructor(private db: DatabaseInstance) {}

  public async findById(id: string): Promise<RestaurantTable | null> {
    const rows = await this.db
      .select()
      .from(restaurantTables)
      .where(eq(restaurantTables.id, id))
      .limit(1);

    if (rows.length === 0) return null;
    return new RestaurantTable(rows[0]);
  }

  public async findAll(): Promise<RestaurantTable[]> {
    const rows = await this.db.select().from(restaurantTables);
    return rows.map((r) => new RestaurantTable(r));
  }

  public async findByZoneId(zoneId: string): Promise<RestaurantTable[]> {
    const rows = await this.db
      .select()
      .from(restaurantTables)
      .where(eq(restaurantTables.zoneId, zoneId));
    return rows.map((r) => new RestaurantTable(r));
  }

  public async save(table: RestaurantTable): Promise<void> {
    await this.db
      .insert(restaurantTables)
      .values({
        id: table.id,
        zoneId: table.zoneId,
        name: table.name,
        shape: table.shape,
        x: table.x,
        y: table.y,
        width: table.width,
        height: table.height,
        rotation: table.rotation,
        seats: table.seats,
        status: table.status,
        updatedAt: table.updatedAt,
      })
      .onConflictDoUpdate({
        target: restaurantTables.id,
        set: {
          name: table.name,
          shape: table.shape,
          x: table.x,
          y: table.y,
          width: table.width,
          height: table.height,
          rotation: table.rotation,
          seats: table.seats,
          status: table.status,
          updatedAt: table.updatedAt,
        },
      });
  }

  public async update(id: string, changes: Partial<RestaurantTable>): Promise<void> {
    await this.db
      .update(restaurantTables)
      .set({
        ...changes,
        updatedAt: Date.now(),
      })
      .where(eq(restaurantTables.id, id));
  }

  public async delete(id: string): Promise<void> {
    await this.db.delete(restaurantTables).where(eq(restaurantTables.id, id));
  }
}
