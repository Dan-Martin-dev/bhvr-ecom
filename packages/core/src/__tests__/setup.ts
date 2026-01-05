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
import { resolve } from "path";
import { existsSync, readFileSync } from "fs";

// Load .env.test file BEFORE any imports that need env variables
const envTestPath = resolve(import.meta.dir, "../../.env.test");
if (existsSync(envTestPath)) {
  const envContent = readFileSync(envTestPath, "utf-8");
  envContent.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const [key, ...valueParts] = trimmed.split("=");
      const value = valueParts.join("=");
      if (key && value && !process.env[key]) {
        process.env[key] = value;
      }
    }
  });
}

// Set default test environment variables if not already set
process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://postgres:dev_password_change_in_prod_2026@localhost:5432/bhvr_ecom";

process.env.BETTER_AUTH_SECRET =
  process.env.BETTER_AUTH_SECRET || "test-secret-key-for-testing-only";

process.env.BETTER_AUTH_URL =
  process.env.BETTER_AUTH_URL || "http://localhost:3000";

process.env.CORS_ORIGIN =
  process.env.CORS_ORIGIN || "http://localhost:5173";

// Export a unique test ID for this test run
export const TEST_RUN_ID = Date.now().toString();

// Load test environment variables
beforeAll(() => {
  console.log("✓ Test environment configured");
  console.log(`  Database: ${process.env.DATABASE_URL?.split("@")[1] || "unknown"}`);
  console.log(`  Test Run ID: ${TEST_RUN_ID}`);
  console.log("  ⚠️  Tests use development database - ensure Docker is running!");
  console.log("  💡 Tip: Run 'make db-reset' to clear test data between runs");
});
