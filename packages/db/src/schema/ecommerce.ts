import { relations, sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

// ============================================================================
// ENUMS
// ============================================================================

export const orderStatusEnum = pgEnum("order_status", [
  "pending", // Awaiting payment
  "paid", // Payment confirmed
  "processing", // Order being prepared
  "shipped", // Shipped to customer
  "delivered", // Delivered successfully
  "cancelled", // Order cancelled
  "refunded", // Payment refunded
]);

export const paymentMethodEnum = pgEnum("payment_method", [
  "mercadopago", // Mercado Pago (cards, cash, transfers)
  "cash_on_delivery", // Cash on delivery
  "bank_transfer", // Bank transfer
]);

export const shippingZoneEnum = pgEnum("shipping_zone", [
  "amba", // Buenos Aires Metro Area
  "interior", // Rest of Argentina
  "pickup", // Store pickup
]);

// ============================================================================
// CATEGORIES
// ============================================================================

export const category = pgTable(
  "category",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    slug: varchar("slug", { length: 100 }).notNull().unique(),
    description: text("description"),
    image: text("image"), // Image URL
    parentId: uuid("parent_id"),
    isActive: boolean("is_active").default(true).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("category_slug_idx").on(table.slug),
    index("category_parent_idx").on(table.parentId),
  ],
);

// ============================================================================
// PRODUCTS
// ============================================================================

export const product = pgTable(
  "product",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull().unique(),
    description: text("description"),
    // Price in centavos (ARS) - 1500000 = $15,000 ARS
    price: integer("price").notNull(),
    // Compare-at price for discounts (optional)
    compareAtPrice: integer("compare_at_price"),
    // Cost for profit calculations (optional)
    costPrice: integer("cost_price"),
    sku: varchar("sku", { length: 100 }).unique(),
    barcode: varchar("barcode", { length: 100 }),
    stock: integer("stock").default(0).notNull(),
    lowStockThreshold: integer("low_stock_threshold").default(5).notNull(),
    // Track inventory
    trackInventory: boolean("track_inventory").default(true).notNull(),
    // Allow backorders
    allowBackorder: boolean("allow_backorder").default(false).notNull(),
    // Weight in grams (for shipping calculation)
    weight: integer("weight"),
    categoryId: uuid("category_id").references(() => category.id, {
      onDelete: "set null",
    }),
    isActive: boolean("is_active").default(true).notNull(),
    isFeatured: boolean("is_featured").default(false).notNull(),
    // SEO
    metaTitle: varchar("meta_title", { length: 70 }),
    metaDescription: varchar("meta_description", { length: 160 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("product_slug_idx").on(table.slug),
    index("product_category_idx").on(table.categoryId),
    index("product_sku_idx").on(table.sku),
    index("product_active_featured_idx").on(table.isActive, table.isFeatured),
    // Full-text search index (GIN) for PostgreSQL
    index("product_search_idx").using(
      "gin",
      sql`to_tsvector('spanish', coalesce(${table.name}, '') || ' ' || coalesce(${table.description}, ''))`,
    ),
  ],
);

// ============================================================================
// PRODUCT IMAGES
// ============================================================================

export const productImage = pgTable(
  "product_image",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productId: uuid("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    url: text("url").notNull(), // Image URL
    alt: varchar("alt", { length: 255 }),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("product_image_product_idx").on(table.productId)],
);

// ============================================================================
// PRODUCT VARIANTS
// ============================================================================

export const productVariant = pgTable(
  "product_variant",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productId: uuid("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    // Variant attributes (size, color, etc.)
    name: varchar("name", { length: 255 }).notNull(), // e.g., "M / Azul"
    // Individual variant options
    size: varchar("size", { length: 50 }), // e.g., "S", "M", "L", "XL", "42", "10.5"
    color: varchar("color", { length: 50 }), // e.g., "Azul", "Rojo", "Negro"
    material: varchar("material", { length: 50 }), // e.g., "Algodón", "Poliéster"
    style: varchar("style", { length: 50 }), // e.g., "Slim Fit", "Regular"
    // Unique SKU for this variant
    sku: varchar("sku", { length: 100 }).notNull().unique(),
    barcode: varchar("barcode", { length: 100 }),
    // Price override (if null, use product base price)
    price: integer("price"), // In centavos (ARS)
    compareAtPrice: integer("compare_at_price"),
    // Separate inventory per variant
    stock: integer("stock").default(0).notNull(),
    // Weight override (if null, use product weight)
    weight: integer("weight"), // In grams
    // Image specific to this variant (if any)
    imageId: uuid("image_id").references(() => productImage.id, {
      onDelete: "set null",
    }),
    // Variant-specific attributes
    isActive: boolean("is_active").default(true).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("product_variant_product_idx").on(table.productId),
    index("product_variant_sku_idx").on(table.sku),
    index("product_variant_active_idx").on(table.isActive),
  ],
);

// ============================================================================
// ADDRESSES
// ============================================================================

export const address = pgTable(
  "address",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    // Recipient info
    fullName: varchar("full_name", { length: 100 }).notNull(),
    phone: varchar("phone", { length: 20 }).notNull(),
    // DNI/CUIT for invoicing
    documentType: varchar("document_type", { length: 10 }).default("DNI"),
    documentNumber: varchar("document_number", { length: 20 }),
    // Address fields
    street: varchar("street", { length: 255 }).notNull(),
    number: varchar("number", { length: 20 }).notNull(),
    floor: varchar("floor", { length: 10 }),
    apartment: varchar("apartment", { length: 10 }),
    city: varchar("city", { length: 100 }).notNull(),
    province: varchar("province", { length: 100 }).notNull(),
    postalCode: varchar("postal_code", { length: 10 }).notNull(),
    // Additional info
    notes: text("notes"),
    shippingZone: shippingZoneEnum("shipping_zone")
      .default("interior")
      .notNull(),
    isDefault: boolean("is_default").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("address_user_idx").on(table.userId)],
);

// ============================================================================
// CART
// ============================================================================

export const cart = pgTable(
  "cart",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
    // Anonymous cart identifier (for guest checkout)
    sessionId: varchar("session_id", { length: 255 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    // Cart expires after 30 days of inactivity
    expiresAt: timestamp("expires_at")
      .default(sql`now() + interval '30 days'`)
      .notNull(),
  },
  (table) => [
    index("cart_user_idx").on(table.userId),
    index("cart_session_idx").on(table.sessionId),
  ],
);

export const cartItem = pgTable(
  "cart_item",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    cartId: uuid("cart_id")
      .notNull()
      .references(() => cart.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    quantity: integer("quantity").default(1).notNull(),
    // Store price at time of adding (for comparison)
    priceAtAdd: integer("price_at_add").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("cart_item_cart_idx").on(table.cartId),
    index("cart_item_product_idx").on(table.productId),
  ],
);

// ============================================================================
// SHIPPING METHODS
// ============================================================================

export const shippingMethod = pgTable(
  "shipping_method",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    description: text("description"),
    // Base cost in centavos (ARS)
    baseCost: integer("base_cost").notNull(),
    // Cost per kg in centavos (for weight-based pricing)
    costPerKg: integer("cost_per_kg").default(0).notNull(),
    // Shipping zones this method applies to
    zones: shippingZoneEnum("zones").array().notNull(),
    // Estimated delivery time in days
    minDeliveryDays: integer("min_delivery_days").notNull(),
    maxDeliveryDays: integer("max_delivery_days").notNull(),
    // Free shipping threshold in centavos
    freeShippingThreshold: integer("free_shipping_threshold"),
    // Active/inactive status
    isActive: boolean("is_active").default(true).notNull(),
    // Display order (lower numbers appear first)
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("shipping_method_active_idx").on(table.isActive),
    index("shipping_method_sort_idx").on(table.sortOrder),
  ],
);

// ============================================================================
// ORDERS
// ============================================================================

export const order = pgTable(
  "order",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    // Human-readable order number (e.g., ORD-2026-0001)
    orderNumber: varchar("order_number", { length: 20 }).notNull().unique(),
    // User reference (nullable for guest checkout)
    userId: text("user_id").references(() => user.id, { onDelete: "restrict" }),
    // Guest email (for guest checkout without account)
    guestEmail: varchar("guest_email", { length: 255 }),
    status: orderStatusEnum("status").default("pending").notNull(),
    // Prices in centavos (ARS)
    subtotal: integer("subtotal").notNull(),
    shippingCost: integer("shipping_cost").default(0).notNull(),
    discount: integer("discount").default(0).notNull(),
    total: integer("total").notNull(),
    // Payment info
    paymentMethod: paymentMethodEnum("payment_method").notNull(),
    paymentId: varchar("payment_id", { length: 255 }), // Mercado Pago payment ID
    paymentStatus: varchar("payment_status", { length: 50 }),
    paidAt: timestamp("paid_at"),
    // Shipping info (snapshot of address at order time)
    shippingFullName: varchar("shipping_full_name", { length: 100 }).notNull(),
    shippingPhone: varchar("shipping_phone", { length: 20 }).notNull(),
    shippingStreet: varchar("shipping_street", { length: 255 }).notNull(),
    shippingNumber: varchar("shipping_number", { length: 20 }).notNull(),
    shippingFloor: varchar("shipping_floor", { length: 10 }),
    shippingApartment: varchar("shipping_apartment", { length: 10 }),
    shippingCity: varchar("shipping_city", { length: 100 }).notNull(),
    shippingProvince: varchar("shipping_province", { length: 100 }).notNull(),
    shippingPostalCode: varchar("shipping_postal_code", {
      length: 10,
    }).notNull(),
    shippingZone: shippingZoneEnum("shipping_zone").notNull(),
    shippingNotes: text("shipping_notes"),
    // Shipping method reference (snapshot info for consistency)
    shippingMethodId: uuid("shipping_method_id").references(
      () => shippingMethod.id,
      { onDelete: "set null" },
    ),
    shippingMethodName: varchar("shipping_method_name", { length: 100 }),
    shippingEstimatedDays: integer("shipping_estimated_days"),
    // Tracking
    trackingNumber: varchar("tracking_number", { length: 100 }),
    trackingUrl: text("tracking_url"),
    shippedAt: timestamp("shipped_at"),
    deliveredAt: timestamp("delivered_at"),
    // Notes
    customerNotes: text("customer_notes"),
    internalNotes: text("internal_notes"),
    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("order_user_idx").on(table.userId),
    index("order_status_idx").on(table.status),
    index("order_number_idx").on(table.orderNumber),
    index("order_created_idx").on(table.createdAt),
  ],
);

export const orderItem = pgTable(
  "order_item",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => order.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "restrict" }),
    // Snapshot of product at order time
    productName: varchar("product_name", { length: 255 }).notNull(),
    productSku: varchar("product_sku", { length: 100 }),
    productImage: text("product_image"),
    // Price in centavos (ARS) at time of purchase
    unitPrice: integer("unit_price").notNull(),
    quantity: integer("quantity").notNull(),
    // Total = unitPrice * quantity
    total: integer("total").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("order_item_order_idx").on(table.orderId),
    index("order_item_product_idx").on(table.productId),
  ],
);

// ============================================================================
// REVIEWS
// ============================================================================

export const review = pgTable(
  "review",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productId: uuid("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    orderId: uuid("order_id").references(() => order.id, {
      onDelete: "set null",
    }),
    rating: integer("rating").notNull(), // 1-5
    title: varchar("title", { length: 100 }),
    comment: text("comment"),
    isVerifiedPurchase: boolean("is_verified_purchase")
      .default(false)
      .notNull(),
    isApproved: boolean("is_approved").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("review_product_idx").on(table.productId),
    index("review_user_idx").on(table.userId),
    index("review_approved_idx").on(table.isApproved),
  ],
);

// ============================================================================
// WISHLIST
// ============================================================================

export const wishlistItem = pgTable(
  "wishlist_item",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("wishlist_user_idx").on(table.userId),
    index("wishlist_product_idx").on(table.productId),
  ],
);

// ============================================================================
// COUPONS
// ============================================================================

export const coupon = pgTable(
  "coupon",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: varchar("code", { length: 50 }).notNull().unique(),
    description: text("description"),
    // Discount type: 'percentage' or 'fixed' (in centavos)
    discountType: varchar("discount_type", { length: 20 }).notNull(),
    discountValue: integer("discount_value").notNull(),
    // Minimum order value in centavos
    minimumOrder: integer("minimum_order").default(0).notNull(),
    // Maximum discount for percentage coupons
    maxDiscount: integer("max_discount"),
    // Usage limits
    usageLimit: integer("usage_limit"), // null = unlimited
    usedCount: integer("used_count").default(0).notNull(),
    // Per-user limit
    perUserLimit: integer("per_user_limit").default(1).notNull(),
    // Validity
    startsAt: timestamp("starts_at").defaultNow().notNull(),
    expiresAt: timestamp("expires_at"),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("coupon_code_idx").on(table.code),
    index("coupon_active_idx").on(table.isActive),
  ],
);

// ============================================================================
// RELATIONS
// ============================================================================

export const categoryRelations = relations(category, ({ one, many }) => ({
  parent: one(category, {
    fields: [category.parentId],
    references: [category.id],
    relationName: "categoryParent",
  }),
  children: many(category, { relationName: "categoryParent" }),
  products: many(product),
}));

export const productRelations = relations(product, ({ one, many }) => ({
  category: one(category, {
    fields: [product.categoryId],
    references: [category.id],
  }),
  images: many(productImage),
  variants: many(productVariant),
  reviews: many(review),
  cartItems: many(cartItem),
  orderItems: many(orderItem),
  wishlistItems: many(wishlistItem),
}));

export const productImageRelations = relations(productImage, ({ one, many }) => ({
  product: one(product, {
    fields: [productImage.productId],
    references: [product.id],
  }),
  variants: many(productVariant),
}));

export const productVariantRelations = relations(productVariant, ({ one }) => ({
  product: one(product, {
    fields: [productVariant.productId],
    references: [product.id],
  }),
  image: one(productImage, {
    fields: [productVariant.imageId],
    references: [productImage.id],
  }),
}));

export const addressRelations = relations(address, ({ one }) => ({
  user: one(user, {
    fields: [address.userId],
    references: [user.id],
  }),
}));

export const cartRelations = relations(cart, ({ one, many }) => ({
  user: one(user, {
    fields: [cart.userId],
    references: [user.id],
  }),
  items: many(cartItem),
}));

export const cartItemRelations = relations(cartItem, ({ one }) => ({
  cart: one(cart, {
    fields: [cartItem.cartId],
    references: [cart.id],
  }),
  product: one(product, {
    fields: [cartItem.productId],
    references: [product.id],
  }),
}));

export const orderRelations = relations(order, ({ one, many }) => ({
  user: one(user, {
    fields: [order.userId],
    references: [user.id],
  }),
  shippingMethod: one(shippingMethod, {
    fields: [order.shippingMethodId],
    references: [shippingMethod.id],
  }),
  items: many(orderItem),
  reviews: many(review),
}));

export const orderItemRelations = relations(orderItem, ({ one }) => ({
  order: one(order, {
    fields: [orderItem.orderId],
    references: [order.id],
  }),
  product: one(product, {
    fields: [orderItem.productId],
    references: [product.id],
  }),
}));

export const reviewRelations = relations(review, ({ one }) => ({
  product: one(product, {
    fields: [review.productId],
    references: [product.id],
  }),
  user: one(user, {
    fields: [review.userId],
    references: [user.id],
  }),
  order: one(order, {
    fields: [review.orderId],
    references: [order.id],
  }),
}));

export const wishlistItemRelations = relations(wishlistItem, ({ one }) => ({
  user: one(user, {
    fields: [wishlistItem.userId],
    references: [user.id],
  }),
  product: one(product, {
    fields: [wishlistItem.productId],
    references: [product.id],
  }),
}));

export const shippingMethodRelations = relations(shippingMethod, ({ many }) => ({
  orders: many(order),
}));
