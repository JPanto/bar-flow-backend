export type OrderStatus = 'pending' | 'confirmed' | 'rejected' | 'delivered';

export interface ProductOrderProps {
  id: string;
  tenantId?: string;
  tableId: string;
  sessionId: string;
  tableName: string;
  sessionWord: string;
  status?: OrderStatus;
  totalAmount: number;
  createdAt?: number;
  confirmedAt?: number;
}

export class ProductOrder {
  public readonly id: string;
  public readonly tenantId: string;
  public readonly tableId: string;
  public readonly sessionId: string;
  public readonly tableName: string;
  public readonly sessionWord: string;
  public readonly status: OrderStatus;
  public readonly totalAmount: number;
  public readonly createdAt: number;
  public readonly confirmedAt?: number;

  constructor(props: ProductOrderProps) {
    this.id = props.id;
    this.tenantId = props.tenantId ?? 'default';
    this.tableId = props.tableId;
    this.sessionId = props.sessionId;
    this.tableName = props.tableName;
    this.sessionWord = props.sessionWord;
    this.status = props.status ?? 'pending';
    this.totalAmount = props.totalAmount;
    this.createdAt = props.createdAt ?? Date.now();
    this.confirmedAt = props.confirmedAt;
  }
}
