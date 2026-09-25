export interface ProductCategoryProps {
  id: string;
  tenantId?: string;
  name: string;
  sortOrder?: number;
  createdAt?: number;
}

export class ProductCategory {
  public readonly id: string;
  public readonly tenantId: string;
  public readonly name: string;
  public readonly sortOrder: number;
  public readonly createdAt: number;

  constructor(props: ProductCategoryProps) {
    this.id = props.id;
    this.tenantId = props.tenantId ?? 'default';
    this.name = props.name;
    this.sortOrder = props.sortOrder ?? 0;
    this.createdAt = props.createdAt ?? Date.now();
  }
}
