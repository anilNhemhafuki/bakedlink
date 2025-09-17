
-- Migration: Drop categories table
-- Date: 2024
-- Description: Remove categories table and update products table to remove category references

-- First, remove the foreign key constraint and set categoryId to NULL for all products
UPDATE products SET "categoryId" = NULL WHERE "categoryId" IS NOT NULL;

-- Drop the categories table
DROP TABLE IF EXISTS categories;

-- Update products table to remove categoryId column if you want to completely remove it
-- ALTER TABLE products DROP COLUMN IF EXISTS "categoryId";

-- Note: We're keeping the categoryId column in products table for now to avoid breaking changes
-- You can uncomment the ALTER TABLE statement above if you want to completely remove category references
