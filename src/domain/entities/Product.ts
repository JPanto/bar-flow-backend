export interface ProductProps {
  id: string;
  tenantId?: string;
  categoryId: string;
  name: string;
  description?: string;
  price: number;
  stock?: number;
  isActive?: boolean;
  totalOrders?: number;
  updatedAt?: number;
}

export class Product {
  public readonly id: string;
  public readonly tenantId: string;
  public readonly categoryId: string;
  public readonly name: string;
  public readonly description: string;
  public readonly price: number;
  public readonly stock: number;
  public readonly isActive: boolean;
  public readonly totalOrders: number;
  public readonly updatedAt: number;

  constructor(props: ProductProps) {
    this.id = props.id;
    this.tenantId = props.tenantId ?? 'default';
    this.categoryId = props.categoryId;
    this.name = props.name;
    this.description = props.description ?? '';
    this.price = props.price;
    this.stock = Math.max(0, props.stock ?? 0);
    this.isActive = props.isActive ?? true;
    this.totalOrders = props.totalOrders ?? 0;
    this.updatedAt = props.updatedAt ?? Date.now();
  }

  public decrementStock(quantity: number): Product {
    return new Product({
      ...this,
      stock: Math.max(0, this.stock - quantity),
      totalOrders: this.totalOrders + quantity,
      updatedAt: Date.now(),
    });
  }
}
