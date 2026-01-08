import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getGuestSessionId, hasGuestCartItems, clearGuestCartData } from "./guest-cart";
import { cartApi } from "./api";
import type { Cart, CartItem } from "./api";

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
      return await cartApi.get(isAuthenticated ? undefined : sessionId);
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
      return await cartApi.addItem(productId, quantity, isAuthenticated ? undefined : sessionId);
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
      return await cartApi.updateItem(cartItemId, quantity);
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
      return await cartApi.removeItem(cartItemId);
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
      return await cartApi.clear(isAuthenticated ? undefined : sessionId);
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
      return await cartApi.merge(guestSessionId);
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
