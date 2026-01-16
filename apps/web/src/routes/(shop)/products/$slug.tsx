import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Minus, Plus, ShoppingCart, ArrowLeft, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";import { productApi, cartApi, type Product, type ProductImage } from "@/lib/api";
import { useCurrency } from "@/lib/use-currency";
export const Route = createFileRoute("/(shop)/products/$slug")({
  component: ProductDetailPage,
});

function ProductDetailPage() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // Fetch product details
  const { data: product, isLoading, error } = useQuery({
    queryKey: ["product", slug],
    queryFn: async () => {
      const result = await productApi.get(slug);
      if (!result) throw new Error("Product not found");
      return result as Product;
    },
  });

  // Add to cart mutation
  const addToCartMutation = useMutation({
    mutationFn: async (data: { productId: string; quantity: number }) => {
      return await cartApi.addItem(data.productId, data.quantity);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      toast.success("Added to cart successfully!");
      setQuantity(1);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to add to cart");
    },
  });

  const { formatPrice } = useCurrency();

  const handleQuantityChange = (delta: number) => {
    const newQuantity = quantity + delta;
    if (newQuantity >= 1 && (!product?.stock || newQuantity <= product.stock)) {
      setQuantity(newQuantity);
    }
  };

  const handleAddToCart = () => {
    if (!product) return;
    addToCartMutation.mutate({
      productId: product.id,
      quantity,
    });
  };

  const calculateDiscount = () => {
    if (!product?.compareAtPrice) return null;
    const discount = Math.round(
      ((product.compareAtPrice - product.price) / product.compareAtPrice) * 100
    );
    return discount > 0 ? discount : null;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="mb-4 h-8 w-32 bg-muted" />
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="h-96 bg-muted" />
            <div className="space-y-4">
              <div className="h-8 bg-muted" />
              <div className="h-4 bg-muted" />
              <div className="h-4 w-2/3 bg-muted" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Link to="/products">
          <Button variant="ghost">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Products
          </Button>
        </Link>
        <div className="mt-8 rounded-lg border border-destructive bg-destructive/10 p-8 text-center">
          <p className="text-destructive">
            {error instanceof Error && error.message === "Product not found"
              ? "Product not found. It may have been removed or the link is incorrect."
              : "Failed to load product. Please try again."}
          </p>
        </div>
      </div>
    );
  }

  const discount = calculateDiscount();
  const isOutOfStock = product.stock <= 0 && !product.allowBackorder;
  const isLowStock = product.stock > 0 && product.stock <= product.lowStockThreshold;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <div className="mb-4 flex items-center gap-2 text-sm">
        <Link to="/products" className="text-muted-foreground hover:text-foreground">
          Products
        </Link>
        <span className="text-muted-foreground">/</span>
        <span>{product.name}</span>
      </div>

      {/* Back Button */}
      <Link to="/products" className="mb-4 inline-block">
        <Button variant="ghost">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Products
        </Button>
      </Link>

      {/* Product Details Grid */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Images Section */}
        <div className="space-y-4">
          {/* Main Image */}
          <div className="relative aspect-square overflow-hidden rounded-lg border bg-muted">
            {product.images?.[selectedImageIndex] ? (
              <img
                src={product.images[selectedImageIndex].url}
                alt={product.images[selectedImageIndex].alt || product.name}
                className="h-full w-full object-cover"
                loading="lazy"
                width={800}
                height={800}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                No Image Available
              </div>
            )}

            {/* Badges */}
            <div className="absolute left-4 top-4 flex flex-col gap-2">
              {product.isFeatured && <Badge>Featured</Badge>}
              {discount && <Badge variant="secondary">-{discount}%</Badge>}
              {isOutOfStock && <Badge variant="destructive">Out of Stock</Badge>}
              {isLowStock && <Badge variant="secondary">Low Stock</Badge>}
            </div>
          </div>

          {/* Thumbnail Images */}
          {product.images && product.images.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {product.images.map((image: ProductImage, index: number) => (
                <button
                  key={image.id}
                  onClick={() => setSelectedImageIndex(index)}
                  className={`aspect-square overflow-hidden rounded-md border-2 transition-colors ${
                    index === selectedImageIndex
                      ? "border-primary"
                      : "border-transparent hover:border-muted-foreground"
                  }`}
                >
                  <img
                    src={image.url}
                    alt={image.alt || `${product.name} ${index + 1}`}
                    className="h-full w-full object-cover"
                    loading="lazy"
                    width={200}
                    height={200}
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info Section */}
        <div className="space-y-6">
          {/* Title & SKU */}
          <div>
            <h1 className="mb-2 text-3xl font-bold">{product.name}</h1>
            {product.sku && (
              <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>
            )}
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold">{formatPrice(product.price)}</span>
            {product.compareAtPrice && (
              <span className="text-xl text-muted-foreground line-through">
                {formatPrice(product.compareAtPrice)}
              </span>
            )}
          </div>

          <Separator />

          {/* Description */}
          {product.description && (
            <div>
              <h3 className="mb-2 font-semibold">Description</h3>
              <p className="text-muted-foreground">{product.description}</p>
            </div>
          )}

          {/* Stock Status */}
          <div>
            {isOutOfStock ? (
              <p className="text-destructive">Out of stock</p>
            ) : isLowStock ? (
              <p className="text-yellow-600">Only {product.stock} left in stock</p>
            ) : product.trackInventory ? (
              <p className="text-green-600">In stock ({product.stock} available)</p>
            ) : (
              <p className="text-green-600">In stock</p>
            )}
          </div>

          {/* Quantity Selector */}
          {!isOutOfStock && (
            <Card>
              <CardContent className="p-4">
                <div className="mb-4 flex items-center justify-between">
                  <label className="font-semibold">Quantity</label>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleQuantityChange(-1)}
                      disabled={quantity <= 1}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-12 text-center text-lg font-semibold">
                      {quantity}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleQuantityChange(1)}
                      disabled={
                        product.trackInventory && quantity >= product.stock
                      }
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    size="lg"
                    onClick={handleAddToCart}
                    disabled={addToCartMutation.isPending}
                  >
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    {addToCartMutation.isPending ? "Adding..." : "Add to Cart"}
                  </Button>
                  <Button variant="outline" size="lg">
                    <Heart className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Additional Info */}
          {(product.weight || product.barcode) && (
            <>
              <Separator />
              <div className="space-y-2 text-sm">
                {product.weight && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Weight</span>
                    <span>{product.weight}g</span>
                  </div>
                )}
                {product.barcode && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Barcode</span>
                    <span>{product.barcode}</span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* SEO Meta (for reference) */}
      {product.metaTitle && (
        <div className="mt-8 rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">
            SEO Title: {product.metaTitle}
          </p>
          {product.metaDescription && (
            <p className="text-sm text-muted-foreground">
              SEO Description: {product.metaDescription}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
