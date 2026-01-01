-- Database initialization script for bhvr-ecom (OpenCommercium)
-- This script runs when the PostgreSQL container starts for the first time

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For fuzzy text search

-- Create custom functions for e-commerce

-- Function to generate order numbers (e.g., ORD-2026-0001)
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
  year_part TEXT;
  count_part TEXT;
  order_count INTEGER;
BEGIN
  year_part := TO_CHAR(NOW(), 'YYYY');
  
  -- Get count of orders created this year
  SELECT COUNT(*) INTO order_count
  FROM "order"
  WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());
  
  count_part := LPAD((order_count + 1)::TEXT, 4, '0');
  
  RETURN 'ORD-' || year_part || '-' || count_part;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate shipping cost based on zone and weight
CREATE OR REPLACE FUNCTION calculate_shipping_cost(
  zone TEXT,
  weight_grams INTEGER
)
RETURNS INTEGER AS $$
DECLARE
  base_cost INTEGER;
  weight_multiplier NUMERIC;
BEGIN
  -- Base costs in centavos (ARS)
  CASE zone
    WHEN 'amba' THEN base_cost := 50000; -- $500 ARS
    WHEN 'interior' THEN base_cost := 100000; -- $1000 ARS
    WHEN 'pickup' THEN base_cost := 0; -- Free
    ELSE base_cost := 100000;
  END CASE;
  
  -- Additional cost per kg (for weight > 1kg)
  IF weight_grams > 1000 THEN
    weight_multiplier := (weight_grams - 1000) / 1000.0;
    base_cost := base_cost + (weight_multiplier * 20000)::INTEGER; -- $200 per additional kg
  END IF;
  
  RETURN base_cost;
END;
$$ LANGUAGE plpgsql;

-- Function to check if a product is in stock
CREATE OR REPLACE FUNCTION is_product_in_stock(
  product_id UUID,
  requested_quantity INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  current_stock INTEGER;
  track_inventory BOOLEAN;
  allow_backorder BOOLEAN;
BEGIN
  SELECT stock, track_inventory, allow_backorder
  INTO current_stock, track_inventory, allow_backorder
  FROM product
  WHERE id = product_id;
  
  -- If not tracking inventory, always in stock
  IF NOT track_inventory THEN
    RETURN TRUE;
  END IF;
  
  -- If allowing backorders, always in stock
  IF allow_backorder THEN
    RETURN TRUE;
  END IF;
  
  -- Check stock level
  RETURN current_stock >= requested_quantity;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update product search vector on insert/update
CREATE OR REPLACE FUNCTION update_product_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('spanish', 
    COALESCE(NEW.name, '') || ' ' || 
    COALESCE(NEW.description, '') || ' ' ||
    COALESCE(NEW.sku, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Note: The trigger will be created after the product table is created by Drizzle migrations

-- Create indexes for common queries (will be created by Drizzle, but listed here for reference)
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS product_search_idx ON product USING gin(search_vector);
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS order_user_status_idx ON "order"(user_id, status);
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS cart_session_idx ON cart(session_id) WHERE session_id IS NOT NULL;

-- Database statistics and settings optimization
-- Increase statistics target for better query planning
-- ALTER TABLE product ALTER COLUMN name SET STATISTICS 1000;
-- ALTER TABLE product ALTER COLUMN slug SET STATISTICS 1000;

COMMENT ON DATABASE bhvr_ecom IS 'OpenCommercium e-commerce database - Beaver Stack implementation';