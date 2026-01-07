import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getGuestSessionId, hasGuestCartItems, clearGuestCartData } from "./guest-cart";

interface CartItem {
  id: string;
  productId: string;
  quantity: number;
  priceAtAdd: number;
  product: {
    id: string;
    name: string;
    slug: string;
    price: number;
    stock: number;
    images?: Array<{ url: string; alt?: string }>;
  };
}

interface Cart {
  id: string;
  items: CartItem[];
  subtotal: number;
  total: number;
}

/**
 * Custom hook for cart operations (supports both guest and authenticated users)
 */
export function useCart(isAuthenticated: boolean) {
  const queryClient = useQueryClient();
  const sessionId = isAuthenticated ? undefined : getGuestSessionId();

  // Fetch cart
  const { data: cart, isLoading, error } = useQuery<Cart>({
    queryKey: ["cart", isAuthenticated ? "auth" : sessionId],
    queryFn: async () => {
      const headers: HeadersInit = {
        credentials: "include",
      };

      if (!isAuthenticated && sessionId) {
        headers["x-session-id"] = sessionId;
      }

      const response = await fetch("/api/cart", {
        credentials: "include",
        headers,
      });

      if (!response.ok) throw new Error("Failed to fetch cart");
      return response.json();
    },
  });

  // Add to cart mutation
  const addToCartMutation = useMutation({
    mutationFn: async ({
      productId,
      quantity,
    }: {
      productId: string;
      quantity: number;
    }) => {
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      if (!isAuthenticated && sessionId) {
        headers["x-session-id"] = sessionId;
      }

      const response = await fetch("/api/cart/items", {
        method: "POST",
        credentials: "include",
        headers,
        body: JSON.stringify({ productId, quantity }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to add to cart");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      toast.success("Added to cart");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Update quantity mutation
  const updateQuantityMutation = useMutation({
    mutationFn: async ({
      cartItemId,
      quantity,
    }: {
      cartItemId: string;
      quantity: number;
    }) => {
      const response = await fetch(`/api/cart/items/${cartItemId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ quantity }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update quantity");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Remove item mutation
  const removeItemMutation = useMutation({
    mutationFn: async (cartItemId: string) => {
      const response = await fetch(`/api/cart/items/${cartItemId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to remove item");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      toast.success("Item removed from cart");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Clear cart mutation
  const clearCartMutation = useMutation({
    mutationFn: async () => {
      const headers: HeadersInit = {};

      if (!isAuthenticated && sessionId) {
        headers["x-session-id"] = sessionId;
      }

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      toast.success("Cart cleared");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Merge guest cart on login
  const mergeGuestCartMutation = useMutation({
    mutationFn: async () => {
      const guestSessionId = getGuestSessionId();

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
    onSuccess: () => {
      // Clear guest cart data after successful merge
      clearGuestCartData();
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      toast.success("Cart synced successfully");
    },
    onError: (error: Error) => {
      console.error("Cart merge failed:", error);
      // Don't show error toast as this happens in background
    },
  });

  // Auto-merge cart when user logs in
  const shouldMerge = isAuthenticated && hasGuestCartItems();

  if (shouldMerge && !mergeGuestCartMutation.isPending) {
    mergeGuestCartMutation.mutate();
  }

  return {
    cart,
    isLoading,
    error,
    addToCart: addToCartMutation.mutate,
    updateQuantity: updateQuantityMutation.mutate,
    removeItem: removeItemMutation.mutate,
    clearCart: clearCartMutation.mutate,
    isAddingToCart: addToCartMutation.isPending,
    isUpdating: updateQuantityMutation.isPending,
    isRemoving: removeItemMutation.isPending,
  };
}
