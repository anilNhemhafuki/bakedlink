
-- Add unit fields to order_items table
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS unit VARCHAR(50);
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS unit_id INTEGER;

-- Add foreign key constraint for unit_id
ALTER TABLE order_items ADD CONSTRAINT IF NOT EXISTS order_items_unit_id_units_id_fk 
  FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE SET NULL ON UPDATE NO ACTION;

-- Update existing order items with unit information from products
UPDATE order_items 
SET unit_id = products.unit_id,
    unit = COALESCE(units.abbreviation, units.name)
FROM products 
LEFT JOIN units ON products.unit_id = units.id
WHERE order_items.product_id = products.id
AND order_items.unit IS NULL;
