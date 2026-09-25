export interface OrderItemProps {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  notes?: string;
}

export class OrderItem {
  public readonly id: string;
  public readonly orderId: string;
  public readonly productId: string;
  public readonly productName: string;
  public readonly unitPrice: number;
  public readonly quantity: number;
  public readonly notes?: string;

  constructor(props: OrderItemProps) {
    this.id = props.id;
    this.orderId = props.orderId;
    this.productId = props.productId;
    this.productName = props.productName;
    this.unitPrice = props.unitPrice;
    this.quantity = props.quantity;
    this.notes = props.notes;
  }
}
