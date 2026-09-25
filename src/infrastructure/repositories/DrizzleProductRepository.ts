import { eq, and } from 'drizzle-orm';
import { DatabaseInstance } from '../db/client.js';
import { productCategories, products } from '../db/schema.js';
import { IProductRepository } from '../../domain/repositories/IProductRepository.js';
import { ProductCategory } from '../../domain/entities/ProductCategory.js';
import { Product } from '../../domain/entities/Product.js';

export class DrizzleProductRepository implements IProductRepository {
  constructor(private db: DatabaseInstance) {}

  public async findCategoryById(id: string): Promise<ProductCategory | null> {
    const rows = await this.db
      .select()
      .from(productCategories)
      .where(eq(productCategories.id, id))
      .limit(1);

    if (rows.length === 0) return null;
    return new ProductCategory(rows[0]);
  }

  public async findAllCategories(tenantId: string = 'default'): Promise<ProductCategory[]> {
    const rows = await this.db
      .select()
      .from(productCategories)
      .where(eq(productCategories.tenantId, tenantId))
      .orderBy(productCategories.sortOrder);

    return rows.map((r) => new ProductCategory(r));
  }

  public async saveCategory(category: ProductCategory): Promise<void> {
    await this.db
      .insert(productCategories)
      .values({
        id: category.id,
        tenantId: category.tenantId ?? 'default',
        name: category.name,
        sortOrder: category.sortOrder,
        createdAt: category.createdAt,
      })
      .onConflictDoUpdate({
        target: productCategories.id,
        set: {
          tenantId: category.tenantId ?? 'default',
          name: category.name,
          sortOrder: category.sortOrder,
        },
      });
  }

  public async updateCategory(id: string, category: Partial<ProductCategory>): Promise<void> {
    await this.db
      .update(productCategories)
      .set(category)
      .where(eq(productCategories.id, id));
  }

  public async deleteCategory(id: string): Promise<void> {
    await this.db
      .delete(productCategories)
      .where(eq(productCategories.id, id));
  }

  public async findById(id: string): Promise<Product | null> {
    const rows = await this.db
      .select()
      .from(products)
      .where(eq(products.id, id))
      .limit(1);

    if (rows.length === 0) return null;
    return new Product({
      ...rows[0],
      description: rows[0].description ?? undefined,
    });
  }

  public async findAll(tenantId: string = 'default'): Promise<Product[]> {
    const rows = await this.db
      .select()
      .from(products)
      .where(eq(products.tenantId, tenantId));

    return rows.map((r) => new Product({
      ...r,
      description: r.description ?? undefined,
    }));
  }

  public async findByCategoryId(categoryId: string, tenantId: string = 'default'): Promise<Product[]> {
    const rows = await this.db
      .select()
      .from(products)
      .where(
        and(
          eq(products.categoryId, categoryId),
          eq(products.tenantId, tenantId)
        )
      );

    return rows.map((r) => new Product({
      ...r,
      description: r.description ?? undefined,
    }));
  }

  public async save(product: Product): Promise<void> {
    await this.db
      .insert(products)
      .values({
        id: product.id,
        tenantId: product.tenantId ?? 'default',
        categoryId: product.categoryId,
        name: product.name,
        description: product.description,
        price: product.price,
        stock: product.stock,
        isActive: product.isActive,
        totalOrders: product.totalOrders,
        updatedAt: product.updatedAt,
      })
      .onConflictDoUpdate({
        target: products.id,
        set: {
          tenantId: product.tenantId ?? 'default',
          categoryId: product.categoryId,
          name: product.name,
          description: product.description,
          price: product.price,
          stock: product.stock,
          isActive: product.isActive,
          totalOrders: product.totalOrders,
          updatedAt: product.updatedAt,
        },
      });
  }

  public async update(id: string, changes: Partial<Product>): Promise<void> {
    await this.db
      .update(products)
      .set({
        ...changes,
        updatedAt: changes.updatedAt ?? Date.now(),
      })
      .where(eq(products.id, id));
  }

  public async updateStock(id: string, stock: number, totalOrders?: number): Promise<void> {
    const setPayload: Record<string, unknown> = {
      stock,
      updatedAt: Date.now(),
    };
    if (totalOrders !== undefined) {
      setPayload.totalOrders = totalOrders;
    }

    await this.db
      .update(products)
      .set(setPayload)
      .where(eq(products.id, id));
  }

  public async delete(id: string): Promise<void> {
    await this.db
      .delete(products)
      .where(eq(products.id, id));
  }
}
