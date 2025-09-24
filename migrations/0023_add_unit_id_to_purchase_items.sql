
-- Migration: Add unitId to purchase_items table
ALTER TABLE purchase_items ADD COLUMN IF NOT EXISTS unit_id INTEGER;
