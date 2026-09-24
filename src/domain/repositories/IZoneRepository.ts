import { Zone } from '../entities/Zone.js';

export interface IZoneRepository {
  findById(id: string): Promise<Zone | null>;
  findAll(tenantId?: string): Promise<Zone[]>;
  save(zone: Zone): Promise<void>;
  update(id: string, zone: Partial<Zone>): Promise<void>;
}
