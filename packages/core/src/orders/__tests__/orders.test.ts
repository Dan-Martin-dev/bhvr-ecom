import { describe, test, expect, beforeAll } from "bun:test";
import { db } from "@bhvr-ecom/db";
import {
  product,
  category,
  cart,
  cartItem,
  coupon,
} from "@bhvr-ecom/db/schema/ecommerce";
import * as orderUseCases from "../index";
import type { CreateOrderInput } from "@bhvr-ecom/validations/orders";

describe("Order Use Cases", () => {
  let testProductId: string;
  let testCategoryId: string;
  let testCartId: string;
  let testCouponCode: string;
  const testUserId = "order-test-user-123";

  beforeAll(async () => {
    // Create test category
    const [testCategory] = await db
      .insert(category)
      .values({
        name: "Order Test Category",
        slug: "order-test-category",
      })
      .returning();
    testCategoryId = testCategory.id;

    // Create test product
    const [testProduct] = await db
      .insert(product)
      .values({
        name: "Order Test Product",
        slug: "order-test-product",
        price: 5000,
        stock: 100,
        trackInventory: true,
        categoryId: testCategoryId,
        isActive: true,
        weight: 500, // 500 grams
      })
      .returning();
    testProductId = testProduct.id;

    // Create test cart with items
    const [testCart] = await db
      .insert(cart)
      .values({
        userId: testUserId,
      })
      .returning();
    testCartId = testCart.id;

    await db.insert(cartItem).values({
      cartId: testCartId,
      productId: testProductId,
      quantity: 2,
      priceAtAdd: 5000,
    });

    // Create test coupon
    const [testCoupon] = await db
      .insert(coupon)
      .values({
        code: "TEST2026",
        discountType: "percentage",
        discountValue: 10, // 10% off
        isActive: true,
        validFrom: new Date("2026-01-01"),
        validUntil: new Date("2026-12-31"),
        minimumOrder: 5000,
        maxDiscount: 5000,
        usageLimit: 100,
        usedCount: 0,
      })
      .returning();
    testCouponCode = testCoupon.code;
  });

  describe("createOrder", () => {
    test("should create order with valid data", async () => {
      const orderData: CreateOrderInput = {
        cartId: testCartId,
        shippingAddress: {
          firstName: "John",
          lastName: "Doe",
          address1: "Av. Corrientes 1234",
          city: "Buenos Aires",
          province: "CABA",
          postalCode: "1043",
          country: "AR",
          phone: "+5491123456789",
        },
        shippingZone: "amba",
      };

      const result = await orderUseCases.createOrder(orderData, testUserId);

      expect(result.id).toBeDefined();
      expect(result.orderNumber).toBeDefined();
      expect(result.orderNumber).toMatch(/^ORD-\d{4}-\d{4}$/);
      expect(result.userId).toBe(testUserId);
      expect(result.status).toBe("pending");
      expect(result.subtotal).toBe(5000 * 2); // 2 items at 5000 each
      expect(result.shippingCost).toBeGreaterThan(0);
      expect(result.total).toBeGreaterThan(result.subtotal);
    });

    test("should apply coupon discount to order", async () => {
      // Create new cart for this test
      const [newCart] = await db
        .insert(cart)
        .values({ userId: "coupon-user-123" })
        .returning();

      await db.insert(cartItem).values({
        cartId: newCart.id,
        productId: testProductId,
        quantity: 3,
        priceAtAdd: 5000,
      });

      const orderData: CreateOrderInput = {
        cartId: newCart.id,
        shippingAddress: {
          firstName: "Jane",
          lastName: "Smith",
          address1: "Av. Santa Fe 2000",
          city: "Buenos Aires",
          province: "CABA",
          postalCode: "1123",
          country: "AR",
          phone: "+5491187654321",
        },
        shippingZone: "amba",
        couponCode: testCouponCode,
      };

      const result = await orderUseCases.createOrder(
        orderData,
        "coupon-user-123"
      );

      expect(result.couponCode).toBe(testCouponCode);
      expect(result.discount).toBeGreaterThan(0);
      expect(result.total).toBeLessThan(
        result.subtotal + result.shippingCost
      );
    });

    test("should calculate shipping cost based on zone", async () => {
      // Create carts for different zones
      const [ambaCart] = await db
        .insert(cart)
        .values({ userId: "amba-user" })
        .returning();

      await db.insert(cartItem).values({
        cartId: ambaCart.id,
        productId: testProductId,
        quantity: 1,
        priceAtAdd: 5000,
      });

      const [interiorCart] = await db
        .insert(cart)
        .values({ userId: "interior-user" })
        .returning();

      await db.insert(cartItem).values({
        cartId: interiorCart.id,
        productId: testProductId,
        quantity: 1,
        priceAtAdd: 5000,
      });

      // Create orders
      const ambaOrder = await orderUseCases.createOrder(
        {
          cartId: ambaCart.id,
          shippingAddress: {
            firstName: "Test",
            lastName: "User",
            address1: "Test St",
            city: "Buenos Aires",
            province: "CABA",
            postalCode: "1000",
            country: "AR",
            phone: "+5491100000000",
          },
          shippingZone: "amba",
        },
        "amba-user"
      );

      const interiorOrder = await orderUseCases.createOrder(
        {
          cartId: interiorCart.id,
          shippingAddress: {
            firstName: "Test",
            lastName: "User",
            address1: "Test St",
            city: "Córdoba",
            province: "Córdoba",
            postalCode: "5000",
            country: "AR",
            phone: "+5491100000000",
          },
          shippingZone: "interior",
        },
        "interior-user"
      );

      // Interior shipping should cost more than AMBA
      expect(interiorOrder.shippingCost).toBeGreaterThan(
        ambaOrder.shippingCost
      );
    });

    test("should throw error for empty cart", async () => {
      const [emptyCart] = await db
        .insert(cart)
        .values({ userId: "empty-cart-user" })
        .returning();

      const orderData: CreateOrderInput = {
        cartId: emptyCart.id,
        shippingAddress: {
          firstName: "Test",
          lastName: "User",
          address1: "Test St",
          city: "Test City",
          province: "Test",
          postalCode: "1000",
          country: "AR",
          phone: "+5491100000000",
        },
        shippingZone: "amba",
      };

      expect(async () => {
        await orderUseCases.createOrder(orderData, "empty-cart-user");
      }).toThrow("Cart is empty");
    });

    test("should throw error for insufficient stock", async () => {
      // Create low stock product
      const [lowStockProduct] = await db
        .insert(product)
        .values({
          name: "Low Stock Product",
          slug: "low-stock-order-test",
          price: 1000,
          stock: 1,
          trackInventory: true,
          allowBackorder: false,
          categoryId: testCategoryId,
          isActive: true,
        })
        .returning();

      // Create cart with more items than available
      const [stockCart] = await db
        .insert(cart)
        .values({ userId: "stock-test-user" })
        .returning();

      await db.insert(cartItem).values({
        cartId: stockCart.id,
        productId: lowStockProduct.id,
        quantity: 5, // More than available
        priceAtAdd: 1000,
      });

      const orderData: CreateOrderInput = {
        cartId: stockCart.id,
        shippingAddress: {
          firstName: "Test",
          lastName: "User",
          address1: "Test St",
          city: "Test City",
          province: "Test",
          postalCode: "1000",
          country: "AR",
          phone: "+5491100000000",
        },
        shippingZone: "amba",
      };

      expect(async () => {
        await orderUseCases.createOrder(orderData, "stock-test-user");
      }).toThrow(/Insufficient stock/);
    });
  });

  describe("getOrderById", () => {
    test("should return order by id", async () => {
      // Create an order first
      const [orderCart] = await db
        .insert(cart)
        .values({ userId: "get-order-user" })
        .returning();

      await db.insert(cartItem).values({
        cartId: orderCart.id,
        productId: testProductId,
        quantity: 1,
        priceAtAdd: 5000,
      });

      const order = await orderUseCases.createOrder(
        {
          cartId: orderCart.id,
          shippingAddress: {
            firstName: "Test",
            lastName: "User",
            address1: "Test St",
            city: "Test City",
            province: "Test",
            postalCode: "1000",
            country: "AR",
            phone: "+5491100000000",
          },
          shippingZone: "amba",
        },
        "get-order-user"
      );

      const result = await orderUseCases.getOrderById(order.id);

      expect(result).toBeDefined();
      expect(result?.id).toBe(order.id);
      expect(result?.orderNumber).toBe(order.orderNumber);
    });

    test("should return undefined for non-existent order", async () => {
      const result = await orderUseCases.getOrderById("non-existent-order");

      expect(result).toBeUndefined();
    });
  });

  describe("getUserOrders", () => {
    test("should return paginated user orders", async () => {
      const result = await orderUseCases.getUserOrders(testUserId, {
        page: 1,
        limit: 10,
        sortBy: "createdAt",
        sortOrder: "desc",
      });

      expect(result.orders).toBeDefined();
      expect(Array.isArray(result.orders)).toBe(true);
      expect(result.pagination).toBeDefined();
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(10);
    });

    test("should filter orders by status", async () => {
      const result = await orderUseCases.getUserOrders(testUserId, {
        page: 1,
        limit: 10,
        status: "pending",
        sortBy: "createdAt",
        sortOrder: "desc",
      });

      result.orders.forEach((order) => {
        expect(order.status).toBe("pending");
      });
    });
  });

  describe("updateOrderStatus", () => {
    test("should update order status", async () => {
      // Create an order
      const [statusCart] = await db
        .insert(cart)
        .values({ userId: "status-user" })
        .returning();

      await db.insert(cartItem).values({
        cartId: statusCart.id,
        productId: testProductId,
        quantity: 1,
        priceAtAdd: 5000,
      });

      const order = await orderUseCases.createOrder(
        {
          cartId: statusCart.id,
          shippingAddress: {
            firstName: "Test",
            lastName: "User",
            address1: "Test St",
            city: "Test City",
            province: "Test",
            postalCode: "1000",
            country: "AR",
            phone: "+5491100000000",
          },
          shippingZone: "amba",
        },
        "status-user"
      );

      // Update status
      const result = await orderUseCases.updateOrderStatus({
        orderId: order.id,
        status: "paid",
        trackingNumber: "TRACK123",
        trackingUrl: "https://tracking.example.com/TRACK123",
      });

      expect(result?.status).toBe("paid");
      expect(result?.trackingNumber).toBe("TRACK123");
    });
  });
});
