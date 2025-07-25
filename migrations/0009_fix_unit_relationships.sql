
-- Fix unit relationships across all tables

-- Ensure products table has unit fields
ALTER TABLE products ADD COLUMN IF NOT EXISTS unit_id INTEGER;
ALTER TABLE products ADD COLUMN IF NOT EXISTS unit VARCHAR(50);

-- Add foreign key constraint for products.unit_id
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'products_unit_id_units_id_fk'
    ) THEN
        ALTER TABLE products ADD CONSTRAINT products_unit_id_units_id_fk 
        FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE SET NULL ON UPDATE NO ACTION;
    END IF;
END $$;

-- Ensure inventory_items has proper unit relationships
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'inventory_items_unit_id_units_id_fk'
    ) THEN
        ALTER TABLE inventory_items ADD CONSTRAINT inventory_items_unit_id_units_id_fk 
        FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE SET NULL ON UPDATE NO ACTION;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'inventory_items_secondary_unit_id_units_id_fk'
    ) THEN
        ALTER TABLE inventory_items ADD CONSTRAINT inventory_items_secondary_unit_id_units_id_fk 
        FOREIGN KEY (secondary_unit_id) REFERENCES units(id) ON DELETE SET NULL ON UPDATE NO ACTION;
    END IF;
END $$;

-- Ensure order_items unit constraint exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'order_items_unit_id_units_id_fk'
    ) THEN
        ALTER TABLE order_items ADD CONSTRAINT order_items_unit_id_units_id_fk 
        FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE SET NULL ON UPDATE NO ACTION;
    END IF;
END $$;

-- Ensure unit_conversions constraints exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'unit_conversions_from_unit_id_units_id_fk'
    ) THEN
        ALTER TABLE unit_conversions ADD CONSTRAINT unit_conversions_from_unit_id_units_id_fk 
        FOREIGN KEY (from_unit_id) REFERENCES units(id) ON DELETE CASCADE ON UPDATE NO ACTION;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'unit_conversions_to_unit_id_units_id_fk'
    ) THEN
        ALTER TABLE unit_conversions ADD CONSTRAINT unit_conversions_to_unit_id_units_id_fk 
        FOREIGN KEY (to_unit_id) REFERENCES units(id) ON DELETE CASCADE ON UPDATE NO ACTION;
    END IF;
END $$;

-- Update existing records to have consistent unit data
UPDATE inventory_items 
SET unit = COALESCE(units.abbreviation, units.name)
FROM units 
WHERE inventory_items.unit_id = units.id 
AND (inventory_items.unit IS NULL OR inventory_items.unit = '');

UPDATE products 
SET unit = COALESCE(units.abbreviation, units.name)
FROM units 
WHERE products.unit_id = units.id 
AND (products.unit IS NULL OR products.unit = '');

UPDATE order_items 
SET unit = COALESCE(units.abbreviation, units.name)
FROM units 
WHERE order_items.unit_id = units.id 
AND (order_items.unit IS NULL OR order_items.unit = '');
