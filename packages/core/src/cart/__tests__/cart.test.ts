import { describe, test, expect, beforeAll } from "bun:test";
import { db } from "@bhvr-ecom/db";
import { product, category } from "@bhvr-ecom/db/schema/ecommerce";
import * as cartUseCases from "../index";
import type { AddToCartInput } from "@bhvr-ecom/validations/cart";
import { TEST_RUN_ID } from "../../__tests__/setup";

describe("Cart Use Cases", () => {
  let testProductId: string;
  let testCategoryId: string;
  const testUserId = "test-user-123";

  beforeAll(async () => {
    // Create test category
    const [testCategory] = await db
      .insert(category)
      .values({
        name: "Cart Test Category",
        slug: `cart-test-category-${TEST_RUN_ID}`,
      })
      .returning();
    testCategoryId = testCategory!.id;

    // Create test product
    const [testProduct] = await db
      .insert(product)
      .values({
        name: "Cart Test Product",
        slug: `cart-test-product-${TEST_RUN_ID}`,
        price: 2999,
        stock: 100,
        trackInventory: true,
        categoryId: testCategoryId,
        isActive: true,
      })
      .returning();
    testProductId = testProduct!.id;
  });

  describe("getOrCreateCart", () => {
    test("should create new cart for user", async () => {
      const result = await cartUseCases.getOrCreateCart("new-user-id");

      expect(result.id).toBeDefined();
      expect(result.userId).toBe("new-user-id");
      expect(result.items).toBeDefined();
      expect(result.items.length).toBe(0);
    });

    test("should return existing cart for user", async () => {
      // Get cart first time
      const firstCart = await cartUseCases.getOrCreateCart(testUserId);

      // Get cart second time
      const secondCart = await cartUseCases.getOrCreateCart(testUserId);

      expect(firstCart.id).toBe(secondCart.id);
    });

    test("should create cart with session ID", async () => {
      const result = await cartUseCases.getOrCreateCart(
        undefined,
        "guest-session-789"
      );

      expect(result.id).toBeDefined();
      expect(result.sessionId).toBe("guest-session-789");
    });

    test("should throw error when no userId or sessionId provided", async () => {
      expect(async () => {
        await cartUseCases.getOrCreateCart();
      }).toThrow("Either userId or sessionId is required");
    });
  });

  describe("addToCart", () => {
    test("should add product to cart", async () => {
      const input: AddToCartInput = {
        productId: testProductId,
        quantity: 2,
      };

      const result = await cartUseCases.addToCart(input, testUserId);

      expect(result!.id).toBeDefined();
      expect(result!.productId).toBe(testProductId);
      expect(result!.quantity).toBe(2);
      expect(result!.priceAtAdd).toBe(2999);
    });

    test("should increment quantity when adding same product again", async () => {
      const input: AddToCartInput = {
        productId: testProductId,
        quantity: 1,
      };

      // Add first time
      await cartUseCases.addToCart(input, "user-increment-test");

      // Add second time
      const result = await cartUseCases.addToCart(
        input,
        "user-increment-test"
      );

      expect(result!.quantity).toBe(2);
    });

    test("should throw error for inactive product", async () => {
      // Create inactive product
      const [inactiveProduct] = await db
        .insert(product)
        .values({
          name: "Inactive Product",
          slug: "inactive-product",
          price: 1000,
          categoryId: testCategoryId,
          isActive: false,
        })
        .returning();

      const input: AddToCartInput = {
        productId: inactiveProduct!.id,
        quantity: 1,
      };

      expect(async () => {
        await cartUseCases.addToCart(input, "test-user-inactive");
      }).toThrow("Product not found or inactive");
    });

    test("should throw error when stock insufficient", async () => {
      // Create low stock product
      const [lowStockProduct] = await db
        .insert(product)
        .values({
          name: "Low Stock Product",
          slug: "low-stock-product",
          price: 1000,
          stock: 2,
          trackInventory: true,
          allowBackorder: false,
          categoryId: testCategoryId,
          isActive: true,
        })
        .returning();

      const input: AddToCartInput = {
        productId: lowStockProduct!.id,
        quantity: 5, // More than available stock
      };

      expect(async () => {
        await cartUseCases.addToCart(input, "test-user-stock");
      }).toThrow("Only 2 items available");
    });
  });

  describe("updateCartItem", () => {
    test("should update cart item quantity", async () => {
      // First add to cart
      const addInput: AddToCartInput = {
        productId: testProductId,
        quantity: 1,
      };
      const cartItemResult = await cartUseCases.addToCart(
        addInput,
        "user-update-test"
      );

      // Then update quantity
      const result = await cartUseCases.updateCartItem({
        cartItemId: cartItemResult!.id,
        quantity: 5,
      });

      expect(result!.quantity).toBe(5);
    });

    test("should throw error when updating to quantity exceeding stock", async () => {
      // Create limited stock product
      const [limitedProduct] = await db
        .insert(product)
        .values({
          name: "Limited Product",
          slug: "limited-product",
          price: 1000,
          stock: 3,
          trackInventory: true,
          allowBackorder: false,
          categoryId: testCategoryId,
          isActive: true,
        })
        .returning();

      // Add to cart
      const addInput: AddToCartInput = {
        productId: limitedProduct!.id,
        quantity: 1,
      };
      const cartItemResult = await cartUseCases.addToCart(
        addInput,
        "user-limited-test"
      );

      // Try to update to more than available
      expect(async () => {
        await cartUseCases.updateCartItem({
          cartItemId: cartItemResult!.id,
          quantity: 10,
        });
      }).toThrow("Only 3 items available");
    });
  });

  describe("removeFromCart", () => {
    test("should remove item from cart", async () => {
      // Add item first
      const addInput: AddToCartInput = {
        productId: testProductId,
        quantity: 1,
      };
      const cartItemResult = await cartUseCases.addToCart(
        addInput,
        "user-remove-test"
      );

      // Remove it
      const result = await cartUseCases.removeFromCart(cartItemResult!.id);

      expect(result!.id).toBe(cartItemResult!.id);
    });
  });

  describe("clearCart", () => {
    test("should clear all items from cart", async () => {
      const userId = "user-clear-test";

      // Add multiple items
      await cartUseCases.addToCart(
        { productId: testProductId, quantity: 1 },
        userId
      );
      await cartUseCases.addToCart(
        { productId: testProductId, quantity: 2 },
        userId
      );

      // Get cart
      const userCart = await cartUseCases.getOrCreateCart(userId);

      // Clear cart
      const result = await cartUseCases.clearCart(userCart.id);

      expect(result.success).toBe(true);

      // Verify cart is empty
      const emptyCart = await cartUseCases.getOrCreateCart(userId);
      expect(emptyCart.items.length).toBe(0);
    });
  });

  describe("getCartWithTotals", () => {
    test("should calculate cart totals correctly", async () => {
      const userId = "user-totals-test";

      // Add items
      await cartUseCases.addToCart(
        { productId: testProductId, quantity: 2 },
        userId
      );

      // Get cart with totals
      const result = await cartUseCases.getCartWithTotals(userId);

      expect(result.subtotal).toBe(2999 * 2); // price * quantity
      expect(result.itemCount).toBe(2);
    });
  });

  describe("syncGuestCart", () => {
    test("should merge guest cart into user cart on login", async () => {
      const guestSessionId = "guest-sync-123";
      const userId = "user-sync-123";

      // Create guest cart
      await cartUseCases.addToCart(
        { productId: testProductId, quantity: 3 },
        undefined,
        guestSessionId
      );

      // Sync to user cart
      await cartUseCases.syncGuestCart(userId, guestSessionId);

      // Verify user cart has items
      const userCart = await cartUseCases.getOrCreateCart(userId);
      expect(userCart.items.length).toBeGreaterThan(0);
    });
  });
});
