/**
 * Product Variants Seed Script
 *
 * Run with: bun run packages/db/scripts/seed-variants.ts
 *
 * Creates sample product variants for existing products:
 * - T-shirt variants (sizes: S, M, L, XL; colors: Red, Blue, Black)
 * - Sneaker variants (sizes: 39, 40, 41, 42, 43)
 */

// This script must be run from the repo root. It follows the same env loading
// pattern as other seed scripts in the repo.
import { config } from "dotenv";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

// Load environment variables from apps/server/.env
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, "../../../apps/server/.env") });

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../src/schema/ecommerce";
import { eq, ilike, or } from "drizzle-orm";

const { product, productVariant } = schema;

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL not found in environment");
  process.exit(1);
}

// Use node-postgres Pool for compatibility
const pool = new Pool({ connectionString: DATABASE_URL });
const db = drizzle(pool, { schema });

// ============================================================================
// SEED DATA
// ============================================================================

async function seedVariants() {
  console.log("🌱 Seeding product variants...\n");

  try {
    // Find a T-shirt product (or any clothing product)
    const tshirt = await db.query.product.findFirst({
      where: (products, { ilike, or }) =>
        or(
          ilike(products.name, "%remera%"),
          ilike(products.name, "%t-shirt%"),
          ilike(products.name, "%camiseta%"),
        ),
    });

    if (tshirt) {
      console.log(`📦 Creating variants for product: ${tshirt.name}`);

      const tshirtVariants = [
        // Red variants
        {
          productId: tshirt.id,
          name: "S / Rojo",
          size: "S",
          color: "Rojo",
          sku: `${tshirt.sku}-S-RED`,
          stock: 15,
          sortOrder: 1,
        },
        {
          productId: tshirt.id,
          name: "M / Rojo",
          size: "M",
          color: "Rojo",
          sku: `${tshirt.sku}-M-RED`,
          stock: 25,
          sortOrder: 2,
        },
        {
          productId: tshirt.id,
          name: "L / Rojo",
          size: "L",
          color: "Rojo",
          sku: `${tshirt.sku}-L-RED`,
          stock: 20,
          sortOrder: 3,
        },
        {
          productId: tshirt.id,
          name: "XL / Rojo",
          size: "XL",
          color: "Rojo",
          sku: `${tshirt.sku}-XL-RED`,
          stock: 10,
          sortOrder: 4,
        },
        // Blue variants
        {
          productId: tshirt.id,
          name: "S / Azul",
          size: "S",
          color: "Azul",
          sku: `${tshirt.sku}-S-BLUE`,
          stock: 12,
          sortOrder: 5,
        },
        {
          productId: tshirt.id,
          name: "M / Azul",
          size: "M",
          color: "Azul",
          sku: `${tshirt.sku}-M-BLUE`,
          stock: 30,
          sortOrder: 6,
        },
        {
          productId: tshirt.id,
          name: "L / Azul",
          size: "L",
          color: "Azul",
          sku: `${tshirt.sku}-L-BLUE`,
          stock: 18,
          sortOrder: 7,
        },
        {
          productId: tshirt.id,
          name: "XL / Azul",
          size: "XL",
          color: "Azul",
          sku: `${tshirt.sku}-XL-BLUE`,
          stock: 8,
          sortOrder: 8,
        },
        // Black variants
        {
          productId: tshirt.id,
          name: "S / Negro",
          size: "S",
          color: "Negro",
          sku: `${tshirt.sku}-S-BLACK`,
          stock: 20,
          sortOrder: 9,
        },
        {
          productId: tshirt.id,
          name: "M / Negro",
          size: "M",
          color: "Negro",
          sku: `${tshirt.sku}-M-BLACK`,
          stock: 35,
          sortOrder: 10,
        },
        {
          productId: tshirt.id,
          name: "L / Negro",
          size: "L",
          color: "Negro",
          sku: `${tshirt.sku}-L-BLACK`,
          stock: 22,
          sortOrder: 11,
        },
        {
          productId: tshirt.id,
          name: "XL / Negro",
          size: "XL",
          color: "Negro",
          sku: `${tshirt.sku}-XL-BLACK`,
          stock: 12,
          sortOrder: 12,
        },
      ];

      await db.insert(productVariant).values(tshirtVariants);
      console.log(`  ✓ Created ${tshirtVariants.length} variants for ${tshirt.name}\n`);
    }

    // Find sneakers/shoes product
    const sneakers = await db.query.product.findFirst({
      where: (products, { ilike, or }) =>
        or(
          ilike(products.name, "%zapatilla%"),
          ilike(products.name, "%sneaker%"),
          ilike(products.name, "%zapato%"),
        ),
    });

    if (sneakers) {
      console.log(`📦 Creating variants for product: ${sneakers.name}`);

      const sneakerVariants = [
        {
          productId: sneakers.id,
          name: "Talle 39",
          size: "39",
          sku: `${sneakers.sku}-39`,
          stock: 8,
          sortOrder: 1,
        },
        {
          productId: sneakers.id,
          name: "Talle 40",
          size: "40",
          sku: `${sneakers.sku}-40`,
          stock: 12,
          sortOrder: 2,
        },
        {
          productId: sneakers.id,
          name: "Talle 41",
          size: "41",
          sku: `${sneakers.sku}-41`,
          stock: 15,
          sortOrder: 3,
        },
        {
          productId: sneakers.id,
          name: "Talle 42",
          size: "42",
          sku: `${sneakers.sku}-42`,
          stock: 18,
          sortOrder: 4,
        },
        {
          productId: sneakers.id,
          name: "Talle 43",
          size: "43",
          sku: `${sneakers.sku}-43`,
          stock: 10,
          sortOrder: 5,
        },
      ];

      await db.insert(productVariant).values(sneakerVariants);
      console.log(`  ✓ Created ${sneakerVariants.length} variants for ${sneakers.name}\n`);
    }

    if (!tshirt && !sneakers) {
      console.log("⚠️  No suitable products found to create variants");
      console.log("   Make sure you have products in the database first");
    }

    console.log("✅ Variant seeding complete!");
  } catch (error) {
    console.error("❌ Error seeding variants:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run seed
seedVariants();
