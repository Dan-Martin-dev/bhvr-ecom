import { hc } from "hono/client";
import type { AppType } from "../../../server/src/index";
import { env } from "@bhvr-ecom/env/web";

// Create type-safe RPC client
export const api = hc<AppType>(env.VITE_SERVER_URL);

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface Address {
  firstName: string;
  lastName: string;
  company?: string;
  address1: string;
  address2?: string;
  city: string;
  province: string;
  postalCode: string;
  country?: string;
  phone: string;
}

export interface ProductImage {
  id: string;
  url: string;
  alt?: string | null;
  sortOrder: number;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  price: number;
  compareAtPrice?: number | null;
  sku?: string | null;
  barcode?: string | null;
  weight?: number | null;
  stock: number;
  lowStockThreshold: number;
  trackInventory: boolean;
  allowBackorder: boolean;
  isFeatured: boolean;
  isActive: boolean;
  metaTitle?: string | null;
  metaDescription?: string | null;
  images?: ProductImage[];
}

export interface ProductFilters {
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
}

export interface OrderFilters {
  sortBy?: string;
  sortOrder?: string;
}

export interface AdminOrderFilters {
  page?: number;
  limit?: number;
  status?: string;
  sortBy?: string;
  sortOrder?: string;
}

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
  list: async (params?: ProductFilters) => {
    const response = await api.api.products.$get({
      query: params as Record<string, string>,
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
 * Note: For guest users, session ID must be passed via x-session-id header.
 * The RPC client doesn't easily support custom headers, so we use fetch for cart operations.
 */
export const cartApi = {
  /**
   * Get current user's cart (supports guest via session header)
   */
  get: async (sessionId?: string) => {
    const headers: HeadersInit = { credentials: "include" };
    if (sessionId) headers["x-session-id"] = sessionId;

    const response = await fetch("/api/cart", {
      credentials: "include",
      headers,
    });
    if (!response.ok) throw new Error("Failed to fetch cart");
    return response.json();
  },

  /**
   * Add item to cart
   */
  addItem: async (productId: string, quantity: number, sessionId?: string) => {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };
    if (sessionId) headers["x-session-id"] = sessionId;

    const response = await fetch("/api/cart/items", {
      method: "POST",
      credentials: "include",
      headers,
      body: JSON.stringify({ productId, quantity }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to add item to cart");
    }
    return response.json();
  },

  /**
   * Update cart item quantity
   */
  updateItem: async (cartItemId: string, quantity: number) => {
    const response = await fetch(`/api/cart/items/${cartItemId}`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to update cart item");
    }
    return response.json();
  },

  /**
   * Remove item from cart
   */
  removeItem: async (cartItemId: string) => {
    const response = await fetch(`/api/cart/items/${cartItemId}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to remove item from cart");
    }
    return response.json();
  },

  /**
   * Clear entire cart
   */
  clear: async (sessionId?: string) => {
    const headers: HeadersInit = {};
    if (sessionId) headers["x-session-id"] = sessionId;

    const response = await fetch("/api/cart", {
      method: "DELETE",
      credentials: "include",
      headers,
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to clear cart");
    }
    return response.json();
  },

  /**
   * Merge guest cart with authenticated user cart on login
   */
  merge: async (guestSessionId: string) => {
    const response = await fetch("/api/cart/merge", {
      method: "POST",
      credentials: "include",
      headers: {
        "x-session-id": guestSessionId,
      },
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to merge cart");
    }
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
    shippingAddress: Address;
    billingAddress: Address;
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
  list: async (params?: OrderFilters) => {
    const response = await api.api.orders.$get({
      query: params as Record<string, string>,
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
    list: async (params?: AdminOrderFilters) => {
      const response = await api.api.admin.orders.$get({
        query: params as Record<string, string>,
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
