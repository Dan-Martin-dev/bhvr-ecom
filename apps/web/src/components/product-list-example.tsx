import { api } from "@/lib/api";
import { useState, useEffect } from "react";

/**
 * Example component demonstrating Hono RPC usage
 * 
 * This shows how to use the type-safe API client to:
 * - Fetch products with full TypeScript support
 * - Add items to cart
 * - Handle errors
 */

interface Product {
  id: string;
  name: string;
  price: number;
  description: string | null;
  slug: string;
  isActive: boolean;
}

export function ProductListExample() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      
      // Type-safe API call with full auto-complete
      const response = await api.api.products.$get();
      
      if (response.ok) {
        const data = await response.json();
        setProducts(data.products || []);
      } else {
        setError("Failed to fetch products");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const addToCart = async (productId: string) => {
    try {
      // Type-safe cart API call
      const response = await api.api.cart.items.$post({
        json: {
          productId,
          quantity: 1,
        },
      });

      if (response.ok) {
        alert("Added to cart!");
      } else {
        alert("Failed to add to cart");
      }
    } catch (err) {
      console.error("Cart error:", err);
    }
  };

  if (loading) return <div>Loading products...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Products (RPC Example)</h2>
      
      {products.length === 0 ? (
        <p>No products found. Run database seed to add some!</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {products.map((product) => (
            <div key={product.id} className="border p-4 rounded-lg">
              <h3 className="font-semibold">{product.name}</h3>
              <p className="text-gray-600">{product.description}</p>
              <p className="font-bold mt-2">${(product.price / 100).toFixed(2)}</p>
              
              <button
                onClick={() => addToCart(product.id)}
                className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                Add to Cart
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
