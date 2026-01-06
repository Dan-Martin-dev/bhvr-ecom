import { hc } from "hono/client";
import type { AppType } from "../../../server/src/index";
import { env } from "@bhvr-ecom/env/web";

// Create type-safe RPC client
export const api = hc<AppType>(env.VITE_SERVER_URL);

// ============================================================================
// HELPER METHODS FOR COMMON API OPERATIONS
// ============================================================================
// These wrappers provide better ergonomics and type safety for common operations

/**
 * Product API helpers
 */
export const productApi = {
  /**
   * Get all products with optional filters
   */
  list: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    categoryId?: string;
    isActive?: boolean;
    isFeatured?: boolean;
    minPrice?: number;
    maxPrice?: number;
    sortBy?: "name" | "price" | "createdAt";
    sortOrder?: "asc" | "desc";
  }) => {
    const response = await api.api.products.$get({
      query: params as any,
    });
    if (!response.ok) throw new Error("Failed to fetch products");
    return response.json();
  },

  /**
   * Get a single product by ID
   */
  get: async (id: string) => {
    const response = await api.api.products[":id"].$get({
      param: { id },
    });
    if (!response.ok) throw new Error("Failed to fetch product");
    return response.json();
  },
};

/**
 * Cart API helpers
 */
export const cartApi = {
  /**
   * Get current user's cart
   */
  get: async () => {
    const response = await api.api.cart.$get();
    if (!response.ok) throw new Error("Failed to fetch cart");
    return response.json();
  },

  /**
   * Add item to cart
   */
  addItem: async (productId: string, quantity: number) => {
    const response = await api.api.cart.items.$post({
      json: { productId, quantity },
    });
    if (!response.ok) throw new Error("Failed to add item to cart");
    return response.json();
  },

  /**
   * Update cart item quantity
   */
  updateItem: async (cartItemId: string, quantity: number) => {
    const response = await api.api.cart.items[":cartItemId"].$put({
      param: { cartItemId },
      json: { quantity },
    });
    if (!response.ok) throw new Error("Failed to update cart item");
    return response.json();
  },

  /**
   * Remove item from cart
   */
  removeItem: async (cartItemId: string) => {
    const response = await api.api.cart.items[":cartItemId"].$delete({
      param: { cartItemId },
    });
    if (!response.ok) throw new Error("Failed to remove item from cart");
    return response.json();
  },

  /**
   * Clear entire cart
   */
  clear: async () => {
    const response = await api.api.cart.$delete();
    if (!response.ok) throw new Error("Failed to clear cart");
    return response.json();
  },
};

/**
 * Checkout API helpers
 */
export const checkoutApi = {
  /**
   * Create Mercado Pago payment preference
   */
  createPayment: async (data: {
    cartId: string;
    shippingAddress: any;
    billingAddress: any;
    shippingZone: "amba" | "interior" | "pickup";
    notes?: string;
    couponCode?: string;
  }) => {
    const response = await api.api.checkout.mercadopago.$post({
      json: data,
    });
    if (!response.ok) throw new Error("Failed to create payment");
    return response.json();
  },
};

/**
 * Orders API helpers
 */
export const ordersApi = {
  /**
   * Get user's order history
   */
  list: async (params?: { sortBy?: string; sortOrder?: string }) => {
    const response = await api.api.orders.$get({
      query: params as any,
    });
    if (!response.ok) throw new Error("Failed to fetch orders");
    return response.json();
  },

  /**
   * Get single order by ID
   */
  get: async (id: string) => {
    const response = await api.api.orders[":id"].$get({
      param: { id },
    });
    if (!response.ok) throw new Error("Failed to fetch order");
    return response.json();
  },
};

/**
 * Admin API helpers
 */
export const adminApi = {
  orders: {
    /**
     * Get all orders (admin)
     */
    list: async (params?: {
      page?: number;
      limit?: number;
      status?: string;
      sortBy?: string;
      sortOrder?: string;
    }) => {
      const response = await api.api.admin.orders.$get({
        query: params as any,
      });
      if (!response.ok) throw new Error("Failed to fetch orders");
      return response.json();
    },

    /**
     * Get single order (admin)
     */
    get: async (id: string) => {
      const response = await api.api.admin.orders[":id"].$get({
        param: { id },
      });
      if (!response.ok) throw new Error("Failed to fetch order");
      return response.json();
    },

    /**
     * Update order status (admin)
     */
    updateStatus: async (
      id: string,
      data: {
        status: "pending" | "paid" | "processing" | "shipped" | "delivered" | "cancelled" | "refunded";
        trackingNumber?: string;
        trackingUrl?: string;
        internalNotes?: string;
      }
    ) => {
      const response = await api.api.admin.orders[":id"].status.$patch({
        param: { id },
        json: data,
      });
      if (!response.ok) throw new Error("Failed to update order");
      return response.json();
    },
  },
};

// ============================================================================
// LEGACY EXAMPLE USAGE (for reference)
// ============================================================================
//
// import { api, productApi, cartApi } from '@/lib/api';
//
// // Using raw RPC client (fully type-safe!)
// const { data } = await api.api.products.$get();
//
// // Using helper methods (recommended for common operations)
// const products = await productApi.list({ page: 1, limit: 12 });
// const cart = await cartApi.get();
// await cartApi.addItem("product-123", 2);
//
