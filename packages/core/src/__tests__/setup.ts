/**
 * Test Setup
 * 
 * This file runs before all tests to set up the testing environment.
 * It loads test environment variables from .env.test or uses defaults.
 * 
 * NOTE: Tests use the same database as development.
 * Make sure to run `make docker-up` and `make db-push` before running tests.
 */

import { beforeAll } from "bun:test";

// Load test environment variables
beforeAll(() => {
  // Set default test environment variables if not already set
  // Using the same database as development for now
  process.env.DATABASE_URL =
    process.env.DATABASE_URL ||
    "postgresql://postgres:dev_password_change_in_prod_2026@localhost:5432/bhvr_ecom";
  
  process.env.BETTER_AUTH_SECRET =
    process.env.BETTER_AUTH_SECRET || "test-secret-key-for-testing-only";
  
  process.env.BETTER_AUTH_URL =
    process.env.BETTER_AUTH_URL || "http://localhost:3000";
  
  process.env.CORS_ORIGIN =
    process.env.CORS_ORIGIN || "http://localhost:5173";

  console.log("✓ Test environment configured");
  console.log(`  Database: ${process.env.DATABASE_URL?.split("@")[1] || "unknown"}`);
  console.log("  ⚠️  Tests use development database - ensure Docker is running!");
});
