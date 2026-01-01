import { db } from "../src/index";
import {
  category,
  product,
  productImage,
} from "../src/schema/ecommerce";

/**
 * Seed script for OpenCommercium (bhvr-ecom)
 * 
 * Run with: bun run db:seed
 */

async function seed() {
  console.log("🌱 Seeding database...");

  try {
    // Create categories
    console.log("Creating categories...");
    const [electronicsCategory] = await db
      .insert(category)
      .values({
        name: "Electronics",
        slug: "electronics",
        description: "Electronic devices and accessories",
        isActive: true,
        sortOrder: 1,
      })
      .returning();

    const [clothingCategory] = await db
      .insert(category)
      .values({
        name: "Clothing",
        slug: "clothing",
        description: "Fashion and apparel",
        isActive: true,
        sortOrder: 2,
      })
      .returning();

    const [homeCategory] = await db
      .insert(category)
      .values({
        name: "Home & Kitchen",
        slug: "home-kitchen",
        description: "Home appliances and kitchenware",
        isActive: true,
        sortOrder: 3,
      })
      .returning();

    // Create subcategory
    const [smartphonesCategory] = await db
      .insert(category)
      .values({
        name: "Smartphones",
        slug: "smartphones",
        description: "Mobile phones and accessories",
        parentId: electronicsCategory!.id,
        isActive: true,
        sortOrder: 1,
      })
      .returning();

    console.log(`✓ Created ${4} categories`);

    // Create products
    console.log("Creating products...");

    // Product 1: Smartphone
    const [product1] = await db
      .insert(product)
      .values({
        name: "Samsung Galaxy S24",
        slug: "samsung-galaxy-s24",
        description:
          "Latest flagship smartphone with 6.2-inch display, 128GB storage, and advanced camera system.",
        price: 89999900, // $899,999 ARS
        compareAtPrice: 99999900, // $999,999 ARS (10% discount)
        costPrice: 60000000,
        sku: "SAMGS24-128-BLK",
        barcode: "8806094931426",
        stock: 50,
        lowStockThreshold: 10,
        trackInventory: true,
        allowBackorder: false,
        weight: 168, // grams
        categoryId: smartphonesCategory!.id,
        isActive: true,
        isFeatured: true,
        metaTitle: "Samsung Galaxy S24 - 128GB | OpenCommercium",
        metaDescription:
          "Buy Samsung Galaxy S24 with 128GB storage. Free shipping in Argentina.",
      })
      .returning();

    // Product 2: Laptop
    const [product2] = await db
      .insert(product)
      .values({
        name: "MacBook Air M2",
        slug: "macbook-air-m2",
        description:
          "13-inch laptop with Apple M2 chip, 8GB RAM, and 256GB SSD. Perfect for work and creativity.",
        price: 149999900, // $1,499,999 ARS
        sku: "MBA-M2-256-SLV",
        barcode: "194253081234",
        stock: 25,
        lowStockThreshold: 5,
        trackInventory: true,
        weight: 1240, // grams
        categoryId: electronicsCategory!.id,
        isActive: true,
        isFeatured: true,
        metaTitle: "MacBook Air M2 - 256GB | OpenCommercium",
        metaDescription: "Apple MacBook Air with M2 chip. Fast shipping available.",
      })
      .returning();

    // Product 3: T-Shirt
    const [product3] = await db
      .insert(product)
      .values({
        name: "Classic Cotton T-Shirt",
        slug: "classic-cotton-tshirt",
        description:
          "Premium 100% cotton t-shirt. Available in multiple colors and sizes.",
        price: 2999900, // $29,999 ARS
        sku: "TSH-COT-WHT-M",
        stock: 200,
        lowStockThreshold: 20,
        trackInventory: true,
        weight: 180, // grams
        categoryId: clothingCategory!.id,
        isActive: true,
        isFeatured: false,
      })
      .returning();

    // Product 4: Coffee Maker
    const [product4] = await db
      .insert(product)
      .values({
        name: "Nespresso Vertuo Next",
        slug: "nespresso-vertuo-next",
        description:
          "Premium coffee maker with one-touch brewing. Makes espresso and coffee.",
        price: 7999900, // $79,999 ARS
        compareAtPrice: 8999900,
        sku: "NSP-VRT-NXT-BLK",
        stock: 30,
        lowStockThreshold: 8,
        trackInventory: true,
        weight: 4000, // grams
        categoryId: homeCategory!.id,
        isActive: true,
        isFeatured: true,
      })
      .returning();

    // Product 5: Out of stock example
    const [product5] = await db
      .insert(product)
      .values({
        name: "PlayStation 5",
        slug: "playstation-5",
        description: "Next-gen gaming console with 825GB SSD.",
        price: 59999900, // $599,999 ARS
        sku: "PS5-STD-WHT",
        stock: 0, // Out of stock
        lowStockThreshold: 5,
        trackInventory: true,
        allowBackorder: false,
        weight: 4500,
        categoryId: electronicsCategory!.id,
        isActive: true,
        isFeatured: false,
      })
      .returning();

    console.log(`✓ Created ${5} products`);

    // Create product images
    console.log("Creating product images...");
    await db.insert(productImage).values([
      {
        productId: product1!.id,
        url: "https://placehold.co/800x800/png?text=Galaxy+S24",
        alt: "Samsung Galaxy S24 front view",
        sortOrder: 0,
      },
      {
        productId: product1!.id,
        url: "https://placehold.co/800x800/png?text=Galaxy+S24+Back",
        alt: "Samsung Galaxy S24 back view",
        sortOrder: 1,
      },
      {
        productId: product2!.id,
        url: "https://placehold.co/800x800/png?text=MacBook+Air",
        alt: "MacBook Air M2",
        sortOrder: 0,
      },
      {
        productId: product3!.id,
        url: "https://placehold.co/800x800/png?text=T-Shirt",
        alt: "White cotton t-shirt",
        sortOrder: 0,
      },
      {
        productId: product4!.id,
        url: "https://placehold.co/800x800/png?text=Nespresso",
        alt: "Nespresso Vertuo Next",
        sortOrder: 0,
      },
      {
        productId: product5!.id,
        url: "https://placehold.co/800x800/png?text=PS5",
        alt: "PlayStation 5 console",
        sortOrder: 0,
      },
    ]);

    console.log("✓ Created product images");

    console.log("\n✅ Database seeding completed successfully!");
    console.log("\nSummary:");
    console.log("- 4 categories (including 1 subcategory)");
    console.log("- 5 products (1 out of stock)");
    console.log("- 7 product images");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    process.exit(1);
  }
}

seed();
