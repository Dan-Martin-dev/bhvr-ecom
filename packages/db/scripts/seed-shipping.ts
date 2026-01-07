#!/usr/bin/env bun

// This script must be run from the root with environment variables loaded
// Usage: bun run packages/db/scripts/seed-shipping.ts

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

// Read DATABASE_URL from environment
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("❌ DATABASE_URL is not set");
  process.exit(1);
}

const pool = new Pool({ connectionString });
const db = drizzle(pool, { schema });

async function seedShippingMethods() {
  console.log("🚢 Seeding shipping methods...");

  const methods = [
    {
      name: "Correo Argentino - Standard",
      description: "Envío estándar a todo el país con Correo Argentino",
      baseCost: 150000, // $1500 ARS in centavos
      costPerKg: 50000, // $500 per kg
      zones: ["amba", "interior"] as ("amba" | "interior" | "pickup")[],
      minDeliveryDays: 5,
      maxDeliveryDays: 10,
      freeShippingThreshold: 2000000, // Free shipping over $20,000 ARS
      isActive: true,
      sortOrder: 1,
    },
    {
      name: "Correo Argentino - Express",
      description: "Envío express a AMBA y principales ciudades",
      baseCost: 300000, // $3000 ARS
      costPerKg: 100000, // $1000 per kg
      zones: ["amba", "interior"] as ("amba" | "interior" | "pickup")[],
      minDeliveryDays: 2,
      maxDeliveryDays: 4,
      freeShippingThreshold: 5000000, // Free shipping over $50,000 ARS
      isActive: true,
      sortOrder: 2,
    },
    {
      name: "Andreani - Standard",
      description: "Envío con Andreani a todo el país",
      baseCost: 180000, // $1800 ARS
      costPerKg: 60000, // $600 per kg
      zones: ["amba", "interior"] as ("amba" | "interior" | "pickup")[],
      minDeliveryDays: 3,
      maxDeliveryDays: 7,
      freeShippingThreshold: 2500000, // Free shipping over $25,000 ARS
      isActive: true,
      sortOrder: 3,
    },
    {
      name: "Retiro en tienda",
      description: "Retirá tu pedido gratis en nuestro local",
      baseCost: 0, // Free
      costPerKg: 0,
      zones: ["pickup"] as ("amba" | "interior" | "pickup")[],
      minDeliveryDays: 1,
      maxDeliveryDays: 2,
      isActive: true,
      sortOrder: 0, // Show first
    },
  ];

  for (const method of methods) {
    const [created] = await db
      .insert(schema.shippingMethod)
      .values(method)
      .returning();
    
    if (created) {
      console.log(`  ✅ Created: ${created.name}`);
    }
  }

  console.log("✅ Shipping methods seeded successfully!");
  await pool.end();
}

seedShippingMethods()
  .catch((error) => {
    console.error("❌ Error seeding shipping methods:", error);
    process.exit(1);
  });
