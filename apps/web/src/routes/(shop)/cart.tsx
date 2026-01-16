import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useCart } from "@/lib/use-cart";
import { useCurrency } from "@/lib/use-currency";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/(shop)/cart")({
  component: CartPage,
});

function CartPage() {
  const navigate = useNavigate();
  const { data: session } = authClient.useSession();
  const isAuthenticated = !!session?.user;

  const {
    cart,
    isLoading,
    error,
    updateQuantity,
    removeItem,
    clearCart,
    isUpdating,
    isRemoving,
  } = useCart(isAuthenticated);

  const { formatPrice } = useCurrency();

  const handleQuantityChange = (cartItemId: string, delta: number, currentQuantity: number, maxStock: number) => {
    const newQuantity = currentQuantity + delta;
    if (newQuantity >= 1 && newQuantity <= maxStock) {
      updateQuantity({ cartItemId, quantity: newQuantity });
    }
  };

  const handleRemoveItem = (cartItemId: string) => {
    if (confirm("Remove this item from cart?")) {
      removeItem(cartItemId);
    }
  };

  const handleClearCart = () => {
    if (confirm("Clear all items from cart?")) {
      clearCart();
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="mb-4 h-8 w-48 bg-muted" />
          <div className="h-64 bg-muted" />
        </div>
      </div>
    );
  }

  const isEmpty = !cart || cart.items.length === 0;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Shopping Cart</h1>
        {!isEmpty && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearCart}
            disabled={isUpdating || isRemoving}
          >
            Clear Cart
          </Button>
        )}
      </div>

      {isEmpty ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <ShoppingBag className="mb-4 h-16 w-16 text-muted-foreground" />
            <h2 className="mb-2 text-xl font-semibold">Your cart is empty</h2>
            <p className="mb-6 text-muted-foreground">
              Add some products to get started!
            </p>
            <Link to="/products">
              <Button>
                Browse Products
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Cart Items */}
          <div className="space-y-4 lg:col-span-2">
            {cart.items.map((item) => (
              <Card key={item.id}>
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    {/* Product Image */}
                    <Link
                      to="/products/$slug"
                      params={{ slug: item.product.slug }}
                      className="shrink-0"
                    >
                      <div className="h-24 w-24 overflow-hidden rounded-md border bg-muted">
                        {item.product.images?.[0] ? (
                          <img
                            src={item.product.images[0].url}
                            alt={item.product.images[0].alt || item.product.name}
                            className="h-full w-full object-cover"
                            loading="lazy"
                            width={96}
                            height={96}
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                            No Image
                          </div>
                        )}
                      </div>
                    </Link>

                    {/* Product Info */}
                    <div className="flex flex-1 flex-col justify-between">
                      <div>
                        <Link
                          to="/products/$slug"
                          params={{ slug: item.product.slug }}
                          className="font-semibold hover:underline"
                        >
                          {item.product.name}
                        </Link>
                        <p className="text-sm text-muted-foreground">
                          {formatPrice(item.product.price)} each
                        </p>
                        {item.priceAtAdd !== item.product.price && (
                          <p className="text-xs text-yellow-600">
                            Price changed since added
                          </p>
                        )}
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() =>
                              handleQuantityChange(
                                item.id,
                                -1,
                                item.quantity,
                                item.product.stock
                              )
                            }
                            disabled={
                              item.quantity <= 1 ||
                              isUpdating
                            }
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-12 text-center font-semibold">
                            {item.quantity}
                          </span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() =>
                              handleQuantityChange(
                                item.id,
                                1,
                                item.quantity,
                                item.product.stock
                              )
                            }
                            disabled={
                              item.quantity >= item.product.stock ||
                              isUpdating
                            }
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleRemoveItem(item.id)}
                          disabled={isRemoving}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Item Total */}
                    <div className="flex flex-col items-end justify-between">
                      <span className="font-bold">
                        {formatPrice(item.product.price * item.quantity)}
                      </span>
                      {item.product.stock <= 5 && (
                        <span className="text-xs text-yellow-600">
                          Only {item.product.stock} left
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-semibold">
                    {formatPrice(cart.subtotal || 0)}
                  </span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Shipping</span>
                  <span className="text-muted-foreground">
                    Calculated at checkout
                  </span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax (21%)</span>
                  <span className="text-muted-foreground">
                    Calculated at checkout
                  </span>
                </div>

                <Separator />

                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>{formatPrice(cart.total || 0)}</span>
                </div>

                <p className="text-xs text-muted-foreground">
                  Final amount calculated at checkout
                </p>
              </CardContent>
              <CardFooter className="flex flex-col gap-2">
                <Link to="/checkout" className="w-full">
                  <Button className="w-full" size="lg">
                    Proceed to Checkout
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/products" className="w-full">
                  <Button variant="outline" className="w-full">
                    Continue Shopping
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
