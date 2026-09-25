import { Product } from '../entities/Product.js';
import { ProductCategory } from '../entities/ProductCategory.js';

export interface IProductRepository {
  // Categorías
  findCategoryById(id: string): Promise<ProductCategory | null>;
  findAllCategories(tenantId?: string): Promise<ProductCategory[]>;
  saveCategory(category: ProductCategory): Promise<void>;
  updateCategory(id: string, category: Partial<ProductCategory>): Promise<void>;
  deleteCategory(id: string): Promise<void>;

  // Productos
  findById(id: string): Promise<Product | null>;
  findAll(tenantId?: string): Promise<Product[]>;
  findByCategoryId(categoryId: string, tenantId?: string): Promise<Product[]>;
  save(product: Product): Promise<void>;
  update(id: string, product: Partial<Product>): Promise<void>;
  updateStock(id: string, stock: number, totalOrders?: number): Promise<void>;
  delete(id: string): Promise<void>;
}
