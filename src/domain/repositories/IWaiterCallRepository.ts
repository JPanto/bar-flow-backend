import { WaiterCall } from '../entities/WaiterCall.js';

export interface IWaiterCallRepository {
  findById(id: string): Promise<WaiterCall | null>;
  findActiveCalls(): Promise<WaiterCall[]>;
  findByTableId(tableId: string): Promise<WaiterCall[]>;
  save(call: WaiterCall): Promise<void>;
  update(id: string, call: Partial<WaiterCall>): Promise<void>;
}
