export type TableShape = 'round' | 'square' | 'rectangle' | 'counter';
export type TableStatus = 'available' | 'occupied' | 'reserved' | 'blocked';

export interface RestaurantTableProps {
  id: string;
  tenantId?: string;
  zoneId: string;
  name: string;
  shape: TableShape;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  seats: number;
  status: TableStatus;
  updatedAt: number;
}

export class RestaurantTable {
  public readonly id: string;
  public tenantId: string;
  public zoneId: string;
  public name: string;
  public shape: TableShape;
  public x: number;
  public y: number;
  public width: number;
  public height: number;
  public rotation: number;
  public seats: number;
  public status: TableStatus;
  public updatedAt: number;

  constructor(props: RestaurantTableProps) {
    this.id = props.id;
    this.tenantId = props.tenantId ?? 'default';
    this.zoneId = props.zoneId;
    this.name = props.name;
    this.shape = props.shape;
    this.x = props.x;
    this.y = props.y;
    this.width = props.width;
    this.height = props.height;
    this.rotation = props.rotation;
    this.seats = props.seats;
    this.status = props.status;
    this.updatedAt = props.updatedAt;
  }

  public isOccupied(): boolean {
    return this.status === 'occupied';
  }

  public markOccupied(): void {
    this.status = 'occupied';
    this.updatedAt = Date.now();
  }

  public markAvailable(): void {
    this.status = 'available';
    this.updatedAt = Date.now();
  }

  public markReserved(): void {
    this.status = 'reserved';
    this.updatedAt = Date.now();
  }
}
