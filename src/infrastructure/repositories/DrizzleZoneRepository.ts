import { eq } from 'drizzle-orm';
import { DatabaseInstance } from '../db/client.js';
import { zones } from '../db/schema.js';
import { IZoneRepository } from '../../domain/repositories/IZoneRepository.js';
import { Zone } from '../../domain/entities/Zone.js';

export class DrizzleZoneRepository implements IZoneRepository {
  constructor(private db: DatabaseInstance) {}

  public async findById(id: string): Promise<Zone | null> {
    const rows = await this.db
      .select()
      .from(zones)
      .where(eq(zones.id, id))
      .limit(1);

    if (rows.length === 0) return null;
    return new Zone(rows[0]);
  }

  public async findAll(): Promise<Zone[]> {
    const rows = await this.db.select().from(zones);
    return rows.map((r) => new Zone(r));
  }

  public async save(zone: Zone): Promise<void> {
    await this.db
      .insert(zones)
      .values({
        id: zone.id,
        name: zone.name,
        width: zone.width,
        height: zone.height,
        isDefault: zone.isDefault,
        createdAt: zone.createdAt,
      })
      .onConflictDoUpdate({
        target: zones.id,
        set: {
          name: zone.name,
          width: zone.width,
          height: zone.height,
          isDefault: zone.isDefault,
        },
      });
  }

  public async update(id: string, changes: Partial<Zone>): Promise<void> {
    await this.db.update(zones).set(changes).where(eq(zones.id, id));
  }
}
