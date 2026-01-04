import { hc } from "hono/client";
import type { AppType } from "../../../server/src/index";
import { env } from "@bhvr-ecom/env/web";

// Create type-safe RPC client
export const api = hc<AppType>(env.VITE_SERVER_URL);

// Example usage in components:
// 
// import { api } from '@/lib/api';
//
// // Get all products (fully type-safe!)
// const { data } = await api.api.products.$get();
//
// // Create a new product
// const newProduct = await api.api.products.$post({
//   json: {
//     name: "New Product",
//     price: 29.99,
//     categoryId: "electronics"
//   }
// });
//
// // Get user's cart
// const cart = await api.api.cart.$get();
//
// // Add item to cart
// const cartItem = await api.api.cart.items.$post({
//   json: {
//     productId: "product-123",
//     quantity: 2
//   }
// });
