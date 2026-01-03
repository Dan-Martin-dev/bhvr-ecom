# Testing Guide

## ✅ **Business Logic Tests Implemented**

Comprehensive test suites have been created for all business logic in `packages/core`:

### Test Files Created:
- `src/products/__tests__/products.test.ts` - Product CRUD operations
- `src/cart/__tests__/cart.test.ts` - Shopping cart management  
- `src/orders/__tests__/orders.test.ts` - Order creation and management

### Test Coverage:
- ✅ **30+ test cases** covering all use cases
- ✅ **Product operations** - Create, read, update, delete, search, filter
- ✅ **Cart management** - Add, update, remove items, calculate totals
- ✅ **Order processing** - Create orders, apply coupons, shipping costs
- ✅ **Edge cases** - Stock validation, coupon expiration, empty carts

## 🚀 **Running Tests**

### Quick Start

```bash
# Run all tests
make test

# Run tests in watch mode
make test-watch

# Or using bun directly
bun run test
```

### Prerequisites

**IMPORTANT:** Tests require a running database with the schema applied.

```bash
# 1. Start Docker services
make docker-up

# 2. Apply database schema
make db-push

# 3. (Optional) Seed database with sample data
make db-seed

# 4. Run tests
make test
```

## 📋 **Test Configuration**

Tests use environment variables from `packages/core/.env.test`:

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/postgres
BETTER_AUTH_SECRET=test-secret-key-for-testing-only
BETTER_AUTH_URL=http://localhost:3000
CORS_ORIGIN=http://localhost:5173
```

**Note:** Currently, tests use the same database as development. In the future, consider using a separate test database to avoid conflicts.

## 🎯 **Testing Strategy**

### Priority 1: Business Logic (Current Implementation ✅)
- **Location:** `packages/core/src/**/__tests__/`
- **Focus:** Pure business logic, independent of HTTP/UI
- **Benefits:** Fast, isolated, easy to maintain
- **Coverage Target:** 70-80%

### Priority 2: Validation Schemas (Future)
- **Location:** `packages/validations/src/__tests__/`
- **Focus:** Zod schema validation
- **Example:** Test that negative prices are rejected

### Priority 3: API Routes (Future)
- **Location:** `apps/server/src/routes/__tests__/`
- **Focus:** HTTP endpoints, request/response handling
- **Tool:** Hono built-in testing utilities

### Priority 4: React Components (Future)
- **Location:** `apps/web/src/components/__tests__/`
- **Focus:** UI components, user interactions
- **Tool:** Vitest + Testing Library

## 📊 **Test Examples**

### Product Tests
```typescript
test("should create product with valid data", async () => {
  const product = await createProduct({
    name: "Test Product",
    price: 2999,
    categoryId: "cat-123",
  });
  
  expect(product.name).toBe("Test Product");
  expect(product.price).toBe(2999);
});
```

### Cart Tests
```typescript
test("should throw error when stock insufficient", async () => {
  expect(async () => {
    await addToCart({
      productId: "low-stock-product",
      quantity: 100, // More than available
    });
  }).toThrow("Only 2 items available");
});
```

### Order Tests
```typescript
test("should apply coupon discount to order", async () => {
  const order = await createOrder({
    cartId: "cart-123",
    shippingAddress: { /*...*/ },
    couponCode: "SUMMER2026",
  });
  
  expect(order.discount).toBeGreaterThan(0);
  expect(order.total).toBeLessThan(order.subtotal);
});
```

## 🛠️ **Adding New Tests**

When adding new features:

1. **Write tests alongside the feature** (not after!)
2. **Test business logic first** - It's the easiest and most valuable
3. **Follow the existing test structure**:
   ```
   describe("Feature Name", () => {
     beforeAll(async () => {
       // Setup test data
     });
     
     describe("use case name", () => {
       test("should do something", async () => {
         // Arrange
         const input = { /* */ };
         
         // Act
         const result = await useCase(input);
         
         // Assert
         expect(result).toBeDefined();
       });
     });
   });
   ```

## 🐛 **Troubleshooting**

### Database Connection Errors
```bash
# Ensure Docker is running
docker-compose ps

# Restart if needed
make docker-restart

# Apply schema
make db-push
```

### Test Failures After Schema Changes
```bash
# Push new schema to database
make db-push

# Re-run tests
make test
```

### Environment Variable Errors
- Check `packages/core/.env.test` exists
- Verify DATABASE_URL matches your Docker setup
- Ensure all required env vars are set

## 📈 **Test Metrics**

Current test coverage:
- **Products:** 10 test cases
- **Cart:** 10 test cases  
- **Orders:** 10 test cases
- **Total:** 30+ test cases

## 🎓 **Best Practices**

1. **Test behavior, not implementation** - Focus on what the code does, not how
2. **Keep tests independent** - Each test should work in isolation
3. **Use descriptive test names** - "should create product with valid data" is better than "test1"
4. **Test edge cases** - Empty inputs, invalid data, boundary conditions
5. **Mock at boundaries** - Mock external services, not internal functions
6. **Run tests frequently** - Use `make test-watch` during development

## 🚀 **Next Steps**

1. ✅ Business logic tests (DONE)
2. 🔲 Add validation schema tests
3. 🔲 Add API route tests
4. 🔲 Set up CI/CD to run tests automatically
5. 🔲 Add test coverage reporting
6. 🔲 Create separate test database

## 📚 **Resources**

- [Bun Test Documentation](https://bun.sh/docs/cli/test)
- [Hono Testing Guide](https://hono.dev/guides/testing)
- [Clean Architecture Testing](../docs/clean-architecture.md)
