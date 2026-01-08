/**
 * Test Helpers
 * 
 * Utility functions for creating and managing test data
 */

import { db } from "@bhvr-ecom/db";
import { user } from "@bhvr-ecom/db/schema/auth";
import { product, category, cart, cartItem } from "@bhvr-ecom/db/schema/ecommerce";
import { eq } from "drizzle-orm";
import { TEST_RUN_ID } from "./setup";

/**
 * Create a test user
 */
export async function createTestUser(userId: string, email?: string) {
  try {
    const [testUser] = await db
      .insert(user)
      .values({
        id: userId,
        name: `Test User ${userId}`,
        email: email || `${userId}@test.com`,
        emailVerified: true,
      })
      .onConflictDoNothing()
      .returning();
    
    return testUser;
  } catch (error) {
    // User might already exist, try to fetch it
    const [existing] = await db.select().from(user).where(eq(user.id, userId));
    return existing;
  }
}

/**
 * Clean up test data created during this test run
 */
export async function cleanupTestData() {
  try {
    // Delete cart items first (due to foreign keys)
    await db.delete(cartItem);
    
    // Delete carts
    await db.delete(cart);
    
    // Delete products with test slugs
    await db.delete(product).where(eq(product.slug, `test-product-${TEST_RUN_ID}`));
    await db.delete(product).where(eq(product.slug, `cart-test-product-${TEST_RUN_ID}`));
    
    // Delete categories with test slugs
    await db.delete(category).where(eq(category.slug, `test-category-${TEST_RUN_ID}`));
    await db.delete(category).where(eq(category.slug, `cart-test-category-${TEST_RUN_ID}`));
  } catch (error) {
    console.error("Cleanup error:", error);
  }
}

/**
 * Generate a valid UUID v4 for testing
 */
export function generateTestUUID(): string {
  return crypto.randomUUID();
}
