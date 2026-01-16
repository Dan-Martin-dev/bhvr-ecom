import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo, useEffect } from "react";
import { ChevronLeft, ChevronRight, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { productApi, type Product } from "@/lib/api";
import { useDebounce } from "@/lib/use-debounce";
import { useCurrency } from "@/lib/use-currency";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ProductsSearchParams {
  page?: number;
  search?: string;
  categoryId?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export const Route = createFileRoute("/(shop)/products/")({
  component: ProductsPage,
  validateSearch: (search: Record<string, unknown>): ProductsSearchParams => {
    return {
      page: Number(search?.page ?? 1),
      search: (search?.search as string) || undefined,
      categoryId: (search?.categoryId as string) || undefined,
      sortBy: (search?.sortBy as string) || "createdAt",
      sortOrder: (search?.sortOrder as "asc" | "desc") || "desc",
    };
  },
});

function ProductsPage() {
  const navigate = useNavigate({ from: Route.fullPath });
  const searchParams = Route.useSearch();
  const [searchInput, setSearchInput] = useState(searchParams.search || "");
  
  // Debounce search input to avoid excessive API calls
  const debouncedSearch = useDebounce(searchInput, 500);

  // Auto-search when debounced value changes
  useEffect(() => {
    if (debouncedSearch !== searchParams.search) {
      navigate({
        search: { ...searchParams, search: debouncedSearch || undefined, page: 1 },
      });
    }
  }, [debouncedSearch]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["products", searchParams],
    queryFn: async () => {
      return await productApi.list({
        page: searchParams.page,
        search: searchParams.search,
        categoryId: searchParams.categoryId,
        sortBy: searchParams.sortBy as "name" | "price" | "createdAt",
        sortOrder: searchParams.sortOrder,
      });
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Form submit is now handled by debounced auto-search
  };

  const handleSortChange = (value: string) => {
    const [sortBy, sortOrder] = value.split("-");
    navigate({
      search: {
        ...searchParams,
        sortBy,
        sortOrder: sortOrder as "asc" | "desc",
        page: 1,
      },
    });
  };

  const handlePageChange = (newPage: number) => {
    navigate({ search: { ...searchParams, page: newPage } });
  };

  const { formatPrice } = useCurrency();

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-center">
          <p className="text-destructive">Error loading products. Please try again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="mb-4 text-3xl font-bold">Products</h1>

        {/* Search & Filters */}
        <div className="flex flex-col gap-4 md:flex-row">
          <form onSubmit={handleSearch} className="flex flex-1 gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search products..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button type="submit">Search</Button>
          </form>

          <Select
            value={`${searchParams.sortBy}-${searchParams.sortOrder}`}
            onValueChange={handleSortChange}
          >
            <SelectTrigger className="w-50">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="createdAt-desc">Newest First</SelectItem>
              <SelectItem value="createdAt-asc">Oldest First</SelectItem>
              <SelectItem value="price-asc">Price: Low to High</SelectItem>
              <SelectItem value="price-desc">Price: High to Low</SelectItem>
              <SelectItem value="name-asc">Name: A to Z</SelectItem>
              <SelectItem value="name-desc">Name: Z to A</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Active Filters */}
        {searchParams.search && (
          <div className="mt-4 flex items-center gap-2">
            <Badge variant="secondary" className="gap-2">
              Search: {searchParams.search}
              <button
                onClick={() =>
                  navigate({ search: { ...searchParams, search: undefined } })
                }
                className="hover:text-destructive"
              >
                ×
              </button>
            </Badge>
          </div>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-48 bg-muted" />
              </CardHeader>
              <CardContent>
                <div className="mb-2 h-4 bg-muted" />
                <div className="h-4 w-2/3 bg-muted" />
              </CardContent>
              <CardFooter>
                <div className="h-10 w-full bg-muted" />
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Products Grid */}
      {!isLoading && data?.products && (
        <>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {data.products.map((product: Product) => (
              <Card key={product.id} className="flex flex-col">
                <CardHeader className="p-0">
                  <Link
                    to="/products/$slug"
                    params={{ slug: product.slug }}
                    className="relative block aspect-square overflow-hidden rounded-t-lg bg-muted"
                  >
                    {product.images?.[0] ? (
                      <img
                        src={product.images[0].url}
                        alt={product.images[0].alt || product.name}
                        className="h-full w-full object-cover transition-transform hover:scale-105"
                        loading="lazy"
                        width={400}
                        height={400}
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-muted-foreground">
                        No Image
                      </div>
                    )}
                    {product.isFeatured && (
                      <Badge className="absolute right-2 top-2">Featured</Badge>
                    )}
                  </Link>
                </CardHeader>

                <CardContent className="flex-1 p-4">
                  <Link
                    to="/products/$slug"
                    params={{ slug: product.slug }}
                    className="hover:underline"
                  >
                    <h3 className="mb-2 font-semibold">{product.name}</h3>
                  </Link>

                  {product.description && (
                    <p className="mb-2 line-clamp-2 text-sm text-muted-foreground">
                      {product.description}
                    </p>
                  )}

                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-bold">
                      {formatPrice(product.price)}
                    </span>
                    {product.compareAtPrice && (
                      <span className="text-sm text-muted-foreground line-through">
                        {formatPrice(product.compareAtPrice)}
                      </span>
                    )}
                  </div>

                  {product.stock <= 0 && (
                    <Badge variant="destructive" className="mt-2">
                      Out of Stock
                    </Badge>
                  )}
                  {product.stock > 0 && product.stock <= product.lowStockThreshold && (
                    <Badge variant="secondary" className="mt-2">
                      Low Stock
                    </Badge>
                  )}
                </CardContent>

                <CardFooter className="p-4 pt-0">
                  <Link
                    to="/products/$slug"
                    params={{ slug: product.slug }}
                    className="w-full"
                  >
                    <Button
                      className="w-full"
                      disabled={product.stock <= 0 && !product.allowBackorder}
                    >
                      View Details
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>

          {/* Empty State */}
          {data.products.length === 0 && (
            <div className="rounded-lg border border-dashed p-12 text-center">
              <p className="text-muted-foreground">
                No products found. Try adjusting your search or filters.
              </p>
            </div>
          )}

          {/* Pagination */}
          {data.pagination.totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => handlePageChange(data.pagination.page - 1)}
                disabled={data.pagination.page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <div className="flex items-center gap-2">
                {[...Array(data.pagination.totalPages)].map((_, i) => {
                  const page = i + 1;
                  // Show first, last, current, and adjacent pages
                  if (
                    page === 1 ||
                    page === data.pagination.totalPages ||
                    Math.abs(page - data.pagination.page) <= 1
                  ) {
                    return (
                      <Button
                        key={page}
                        variant={page === data.pagination.page ? "default" : "outline"}
                        size="icon"
                        onClick={() => handlePageChange(page)}
                      >
                        {page}
                      </Button>
                    );
                  } else if (
                    page === 2 ||
                    page === data.pagination.totalPages - 1
                  ) {
                    return <span key={page}>...</span>;
                  }
                  return null;
                })}
              </div>

              <Button
                variant="outline"
                size="icon"
                onClick={() => handlePageChange(data.pagination.page + 1)}
                disabled={data.pagination.page === data.pagination.totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Results Summary */}
          <div className="mt-4 text-center text-sm text-muted-foreground">
            Showing {data.products.length} of {data.pagination.total} products
          </div>
        </>
      )}
    </div>
  );
}
