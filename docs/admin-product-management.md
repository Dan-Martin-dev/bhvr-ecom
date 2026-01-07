# Admin Product Management Implementation

## Overview

The Admin Product Management feature provides a comprehensive interface for administrators to manage the product catalog with full CRUD operations. This includes product listing, creation, editing, and deletion with advanced filtering and search capabilities.

## Architecture

### Route Structure

The admin product management follows a nested route structure under the authenticated dashboard:

```
dashboard/
  admin/
    products/
      index.tsx          # Product listing with search/filter
      create.tsx         # Product creation form
      $productId/
        edit.tsx         # Product editing form
```

### Components

#### Product List Page (`apps/web/src/routes/(authenticated)/dashboard/admin/products/index.tsx`)

**Features:**
- Paginated product listing with 20 items per page
- Real-time search by product name
- Sortable table columns (name, price, stock, status)
- Bulk actions support (planned for future)
- Status badges (Active/Inactive, Featured)
- Quick actions (Edit, Delete)

**Key Functionality:**
```typescript
// Search and pagination
const { data, isLoading, error } = useQuery({
  queryKey: ["admin-products", searchParams],
  queryFn: async () => {
    const params = new URLSearchParams();
    params.append("limit", "20");
    // ... search and pagination logic
  },
});

// Delete mutation with confirmation
const deleteMutation = useMutation({
  mutationFn: async (productId: string) => { /* ... */ },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    toast.success("Product deleted successfully");
  },
});
```

#### Product Creation Page (`apps/web/src/routes/(authenticated)/dashboard/admin/products/create.tsx`)

**Form Fields:**
- Basic Information: Name, slug, description
- Pricing: Price, compare-at price
- Inventory: SKU, stock quantity, low stock threshold
- Settings: Track inventory, allow backorders, active status, featured
- Category assignment

**Key Features:**
- Auto-generated slug from product name
- Real-time form validation
- Category selection dropdown
- Optimistic UI updates
- Success/error notifications

#### Product Edit Page (`apps/web/src/routes/(authenticated)/dashboard/admin/products/$productId/edit.tsx`)

**Functionality:**
- Pre-populated form with existing product data
- Same validation and features as create page
- Update mutation with proper error handling
- Navigation back to product list

## API Integration

### Product Endpoints

The admin interface integrates with the following API endpoints:

```typescript
// List products with filtering
GET /api/products?page=1&search=term&limit=20

// Create product
POST /api/products
Content-Type: application/json
{
  "name": "Product Name",
  "price": 29.99,
  "stock": 100,
  // ... other fields
}

// Get single product
GET /api/products/{id}

// Update product
PUT /api/products/{id}

// Delete product
DELETE /api/products/{id}
```

### Server-Side Implementation

#### Product Routes (`apps/server/src/routes/products.ts`)

```typescript
const products = new Hono<AppEnv>()
  .use("/*", auth)  // Admin-only access
  .get("/", listProductsHandler)
  .post("/", createProductHandler)
  .get("/:id", getProductHandler)
  .put("/:id", updateProductHandler)
  .delete("/:id", deleteProductHandler);
```

**Key Features:**
- Authentication middleware ensures admin access
- Input validation using Zod schemas
- Proper error handling and status codes
- Database transactions for data integrity

#### Business Logic (`packages/core/src/products/index.ts`)

```typescript
export async function createProduct(input: CreateProductInput)
export async function updateProduct(id: string, input: UpdateProductInput)
export async function deleteProduct(id: string)
export async function getProducts(filters: ProductFilters)
```

**Validation:**
- Unique SKU enforcement
- Slug uniqueness and formatting
- Price validation (positive numbers)
- Stock quantity constraints

## Database Schema

```sql
CREATE TABLE product (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  compareAtPrice DECIMAL(10,2),
  sku TEXT UNIQUE,
  stock INTEGER DEFAULT 0,
  lowStockThreshold INTEGER DEFAULT 10,
  trackInventory BOOLEAN DEFAULT true,
  allowBackorder BOOLEAN DEFAULT false,
  isActive BOOLEAN DEFAULT true,
  isFeatured BOOLEAN DEFAULT false,
  categoryId TEXT REFERENCES category(id),
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## UI/UX Design

### Design System Integration

- **shadcn/ui Components**: Consistent with app design system
- **Responsive Layout**: Works on desktop and mobile devices
- **Loading States**: Skeleton loaders during data fetching
- **Error States**: User-friendly error messages
- **Toast Notifications**: Success/error feedback

### Form Design

- **Progressive Disclosure**: Complex forms broken into logical sections
- **Inline Validation**: Real-time feedback on form inputs
- **Auto-save**: Draft saving for long forms (planned)
- **Keyboard Navigation**: Full keyboard accessibility

### Table Design

- **Sortable Columns**: Click headers to sort data
- **Pagination**: Efficient handling of large datasets
- **Search**: Real-time filtering as you type
- **Action Menus**: Contextual actions for each row

## Security Considerations

- **Authentication Required**: All admin routes protected by auth middleware
- **Input Sanitization**: All inputs validated and sanitized
- **SQL Injection Prevention**: Parameterized queries
- **XSS Protection**: Proper escaping of user inputs
- **CSRF Protection**: Built-in Hono security features

## Performance Optimizations

- **Query Optimization**: Efficient database queries with proper indexing
- **Pagination**: Server-side pagination prevents large data transfers
- **Caching**: React Query caching reduces API calls
- **Lazy Loading**: Components loaded on demand
- **Optimistic Updates**: Immediate UI feedback

## Error Handling

### Client-Side Errors

- **Network Errors**: Retry logic with exponential backoff
- **Validation Errors**: Field-level error display
- **Authentication Errors**: Redirect to login
- **Permission Errors**: Access denied messages

### Server-Side Errors

- **Database Errors**: Proper error logging and user-friendly messages
- **Validation Errors**: Detailed field-specific error responses
- **Concurrency Issues**: Optimistic locking for concurrent edits

## Testing Strategy

### Unit Tests

- Form validation logic
- API error handling
- Component state management
- Utility functions

### Integration Tests

- Full CRUD operations
- Search and filtering
- Authentication flows
- Error scenarios

### E2E Tests

- Complete product management workflow
- Cross-browser compatibility
- Mobile responsiveness

## Future Enhancements

- **Bulk Operations**: Select multiple products for batch actions
- **Product Variants**: Size, color, and other variant management
- **Image Upload**: Drag-and-drop image management
- **SEO Optimization**: Meta tags and structured data
- **Analytics Integration**: Product performance metrics
- **Import/Export**: CSV import/export functionality
- **Product Templates**: Reusable product configurations</content>
<parameter name="filePath">/home/vare/project/ecom_202/bhvr-ecom/docs/admin-product-management.md