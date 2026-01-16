import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { 
  AlertTriangle,
  Package,
  TrendingDown,
  TrendingUp,
  RefreshCw,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute(
  "/(authenticated)/dashboard/admin/inventory"
)({
  component: RouteComponent,
});

interface Product {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  stock: number;
  lowStockThreshold: number;
  trackInventory: boolean;
  price: number;
  isActive: boolean;
}

type Operation = "add" | "subtract" | "set";

function RouteComponent() {
  const [search, setSearch] = useState("");
  const [showOnlyLowStock, setShowOnlyLowStock] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [quantity, setQuantity] = useState<number>(0);
  const [operation, setOperation] = useState<Operation>("set");
  const queryClient = useQueryClient();

  // Fetch all products for inventory management
  const { data: productsData, isLoading } = useQuery({
    queryKey: ["inventory-products", search],
    queryFn: async () => {
      const res = await api.api.products.$get({
        query: {
          search: search || undefined,
          limit: "1000", // Get all products for inventory
        },
      });
      if (!res.ok) throw new Error("Failed to fetch products");
      return res.json();
    },
  });

  // Fetch low stock products
  const { data: lowStockData } = useQuery({
    queryKey: ["inventory-low-stock"],
    queryFn: async () => {
      const res = await api.api.inventory["low-stock"].$get({
        query: { threshold: "10" },
      });
      if (!res.ok) throw new Error("Failed to fetch low stock products");
      return res.json();
    },
  });

  // Update inventory mutation
  const updateMutation = useMutation({
    mutationFn: async ({ productId, quantityChange, operation }: {
      productId: string;
      quantityChange: number;
      operation: Operation;
    }) => {
      const res = await api.api.inventory[":productId"].$patch({
        param: { productId },
        json: { quantityChange, operation },
      });
      if (!res.ok) throw new Error("Failed to update inventory");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-products"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-low-stock"] });
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      toast.success("Inventory updated successfully");
      setUpdateDialogOpen(false);
      setSelectedProduct(null);
      setQuantity(0);
    },
    onError: (error) => {
      toast.error(`Failed to update inventory: ${error.message}`);
    },
  });

  const handleOpenUpdateDialog = (product: Product) => {
    setSelectedProduct(product);
    setQuantity(product.stock);
    setOperation("set");
    setUpdateDialogOpen(true);
  };

  const handleUpdateInventory = () => {
    if (!selectedProduct) return;
    
    updateMutation.mutate({
      productId: selectedProduct.id,
      quantityChange: quantity,
      operation,
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 0,
    }).format(value / 100);
  };

  const products = productsData?.products || [];
  const lowStockCount = lowStockData?.data?.length || 0;
  
  // Filter products
  const filteredProducts = products.filter((p: Product) => {
    if (showOnlyLowStock && p.trackInventory) {
      return p.stock <= p.lowStockThreshold;
    }
    return true;
  });

  // Calculate inventory stats
  const totalProducts = products.length;
  const trackedProducts = products.filter((p: Product) => p.trackInventory).length;
  const totalStockValue = products.reduce((sum: number, p: Product) => 
    sum + (p.stock * p.price), 0
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Inventory Management</h1>
          <p className="text-muted-foreground">
            Monitor and adjust product stock levels
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProducts}</div>
            <p className="text-xs text-muted-foreground">
              {trackedProducts} tracked
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{lowStockCount}</div>
            <p className="text-xs text-muted-foreground">
              Products need attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Stock Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalStockValue)}</div>
            <p className="text-xs text-muted-foreground">
              Total inventory value
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {products.filter((p: Product) => p.stock === 0 && p.trackInventory).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Products unavailable
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>Stock Levels</CardTitle>
          <CardDescription>
            View and adjust inventory for all products
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search by name or SKU..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full"
              />
            </div>
            <Button
              variant={showOnlyLowStock ? "default" : "outline"}
              onClick={() => setShowOnlyLowStock(!showOnlyLowStock)}
            >
              <AlertTriangle className="mr-2 h-4 w-4" />
              Low Stock Only
            </Button>
          </div>

          {/* Products Table */}
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="py-12 text-center">
              <Package className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No products found</h3>
              <p className="text-sm text-muted-foreground">
                {showOnlyLowStock
                  ? "All products have sufficient stock"
                  : "Try adjusting your search"}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-right">Current Stock</TableHead>
                    <TableHead className="text-right">Threshold</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product: Product) => {
                    const isLowStock =
                      product.trackInventory &&
                      product.stock <= product.lowStockThreshold &&
                      product.stock > 0;
                    const isOutOfStock = product.stock === 0 && product.trackInventory;

                    return (
                      <TableRow key={product.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{product.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {product.slug}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs">{product.sku || "—"}</code>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span className="font-mono text-lg font-semibold">
                              {product.stock}
                            </span>
                            {!product.trackInventory && (
                              <span className="text-xs text-muted-foreground">
                                (untracked)
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {product.trackInventory ? product.lowStockThreshold : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(product.stock * product.price)}
                        </TableCell>
                        <TableCell>
                          {isOutOfStock ? (
                            <Badge variant="destructive">Out of Stock</Badge>
                          ) : isLowStock ? (
                            <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                              <AlertTriangle className="mr-1 h-3 w-3" />
                              Low Stock
                            </Badge>
                          ) : product.trackInventory ? (
                            <Badge variant="default" className="bg-green-100 text-green-800">
                              In Stock
                            </Badge>
                          ) : (
                            <Badge variant="outline">Not Tracked</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenUpdateDialog(product)}
                          >
                            <RefreshCw className="mr-1 h-3 w-3" />
                            Adjust
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Update Dialog */}
      <Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Inventory</DialogTitle>
            <DialogDescription>
              Update stock level for {selectedProduct?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Current Stock</Label>
              <div className="rounded-md border p-3 font-mono text-2xl font-bold text-center">
                {selectedProduct?.stock}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="operation">Operation</Label>
              <Select
                value={operation}
                onValueChange={(value) => setOperation(value as Operation)}
              >
                <SelectTrigger id="operation">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="set">Set to exact value</SelectItem>
                  <SelectItem value="add">
                    <div className="flex items-center gap-2">
                      <ChevronUp className="h-4 w-4" />
                      Add to current
                    </div>
                  </SelectItem>
                  <SelectItem value="subtract">
                    <div className="flex items-center gap-2">
                      <ChevronDown className="h-4 w-4" />
                      Subtract from current
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">
                {operation === "set" ? "New Stock Level" : "Quantity"}
              </Label>
              <Input
                id="quantity"
                type="number"
                min={0}
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
              />
            </div>

            {operation !== "set" && selectedProduct && (
              <div className="rounded-md border p-3 bg-muted">
                <p className="text-sm font-medium">New stock will be:</p>
                <p className="text-2xl font-bold">
                  {operation === "add"
                    ? selectedProduct.stock + quantity
                    : Math.max(0, selectedProduct.stock - quantity)}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setUpdateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateInventory}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? "Updating..." : "Update Stock"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
