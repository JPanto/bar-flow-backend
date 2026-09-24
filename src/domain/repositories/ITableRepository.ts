import { RestaurantTable } from '../entities/Table.js';

export interface ITableRepository {
  findById(id: string): Promise<RestaurantTable | null>;
  findAll(): Promise<RestaurantTable[]>;
  findByZoneId(zoneId: string): Promise<RestaurantTable[]>;
  save(table: RestaurantTable): Promise<void>;
  update(id: string, table: Partial<RestaurantTable>): Promise<void>;
  delete(id: string): Promise<void>;
}
