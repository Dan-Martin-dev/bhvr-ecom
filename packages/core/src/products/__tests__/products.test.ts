import { describe, test, expect, beforeAll } from "bun:test";
import { db } from "@bhvr-ecom/db";
import { product, category } from "@bhvr-ecom/db/schema/ecommerce";
import * as productUseCases from "../index";
import type { CreateProductInput } from "@bhvr-ecom/validations/products";
import { TEST_RUN_ID } from "../../__tests__/setup";

describe("Product Use Cases", () => {
  let testCategoryId: string;
  let testProductId: string;

  beforeAll(async () => {
    // Create a test category
    const [testCategory] = await db
      .insert(category)
      .values({
        name: "Test Category",
        slug: `test-category-${TEST_RUN_ID}`,
      })
      .returning();
    testCategoryId = testCategory!.id;
  });

  describe("createProduct", () => {
    test("should create product with valid data", async () => {
      const productData: CreateProductInput = {
        name: "Test Product",
        slug: "test-product",
        description: "A test product",
        price: 2999,
        categoryId: testCategoryId,
        sku: "TEST-001",
        stock: 10,
        trackInventory: true,
        isActive: true,
      };

      const result = await productUseCases.createProduct(productData);
      testProductId = result!.id;

      expect(result!.id).toBeDefined();
      expect(result!.name).toBe("Test Product");
      expect(result!.price).toBe(2999);
      expect(result!.categoryId).toBe(testCategoryId);
    });

    test("should create product with minimal required fields", async () => {
      const productData: CreateProductInput = {
        name: "Minimal Product",
        slug: "minimal-product",
        price: 1000,
        categoryId: testCategoryId,
      };

      const result = await productUseCases.createProduct(productData);

      expect(result).toBeDefined();
      expect(result!.id).toBeDefined();
      expect(result!.name).toBe("Minimal Product");
      expect(result!.isActive).toBe(true); // Default value
    });
  });

  describe("getProducts", () => {
    test("should return paginated products", async () => {
      const result = await productUseCases.getProducts({
        page: 1,
        limit: 10,
        sortBy: "createdAt",
        sortOrder: "desc",
      });

      expect(result.products).toBeDefined();
      expect(Array.isArray(result.products)).toBe(true);
      expect(result.pagination).toBeDefined();
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(10);
    });

    test("should filter products by category", async () => {
      const result = await productUseCases.getProducts({
        page: 1,
        limit: 10,
        categoryId: testCategoryId,
        sortBy: "createdAt",
        sortOrder: "desc",
      });

      expect(result.products.length).toBeGreaterThan(0);
      result.products.forEach((p) => {
        expect(p.categoryId).toBe(testCategoryId);
      });
    });

    test("should filter products by active status", async () => {
      const result = await productUseCases.getProducts({
        page: 1,
        limit: 10,
        isActive: true,
        sortBy: "createdAt",
        sortOrder: "desc",
      });

      result.products.forEach((p) => {
        expect(p.isActive).toBe(true);
      });
    });

    test("should search products by name", async () => {
      const result = await productUseCases.getProducts({
        page: 1,
        limit: 10,
        search: "Test",
        sortBy: "createdAt",
        sortOrder: "desc",
      });

      expect(result.products.length).toBeGreaterThan(0);
    });

    test("should filter by price range", async () => {
      const result = await productUseCases.getProducts({
        page: 1,
        limit: 10,
        minPrice: 1000,
        maxPrice: 5000,
        sortBy: "price",
        sortOrder: "asc",
      });

      result.products.forEach((p) => {
        expect(p.price).toBeGreaterThanOrEqual(1000);
        expect(p.price).toBeLessThanOrEqual(5000);
      });
    });

    test("should sort products by price ascending", async () => {
      const result = await productUseCases.getProducts({
        page: 1,
        limit: 10,
        sortBy: "price",
        sortOrder: "asc",
      });

      if (result.products.length > 1) {
        for (let i = 1; i < result.products.length; i++) {
          expect(result.products[i]!.price).toBeGreaterThanOrEqual(
            result.products[i - 1]!.price
          );
        }
      }
    });
  });

  describe("getProductById", () => {
    test("should return product by id", async () => {
      const result = await productUseCases.getProductById(testProductId);

      expect(result).toBeDefined();
      expect(result?.id).toBe(testProductId);
      expect(result?.name).toBe("Test Product");
    });

    test("should return undefined for non-existent product", async () => {
      const result = await productUseCases.getProductById("non-existent-id");

      expect(result).toBeUndefined();
    });
  });

  describe("updateProduct", () => {
    test("should update product fields", async () => {
      const updateData = {
        name: "Updated Test Product",
        price: 3999,
      };

      const result = await productUseCases.updateProduct(
        testProductId,
        updateData
      );

      expect(result).toBeDefined();
      expect(result?.name).toBe("Updated Test Product");
      expect(result?.price).toBe(3999);
    });

    test("should return undefined when updating non-existent product", async () => {
      const result = await productUseCases.updateProduct("non-existent-id", {
        name: "Should Fail",
      });

      expect(result).toBeUndefined();
    });
  });

  describe("deleteProduct", () => {
    test("should soft delete product (set isActive to false)", async () => {
      // Create a product to delete
      const [productToDelete] = await db
        .insert(product)
        .values({
          name: "Product to Delete",
          slug: "product-to-delete",
          price: 1000,
          categoryId: testCategoryId,
        })
        .returning();

      expect(productToDelete).toBeDefined();
      const result = await productUseCases.deleteProduct(productToDelete!.id);

      expect(result).toBeDefined();
      expect(result?.isActive).toBe(false);
    });

    test("should return undefined when deleting non-existent product", async () => {
      const result = await productUseCases.deleteProduct("non-existent-id");

      expect(result).toBeUndefined();
    });
  });
});
