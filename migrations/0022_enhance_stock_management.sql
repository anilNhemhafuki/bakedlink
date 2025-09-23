
-- Add missing fields to inventory_items table for comprehensive stock management
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS brand VARCHAR(100);
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS location VARCHAR(100);
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS expiry_date DATE;
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS batch_number VARCHAR(50);
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(100);
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS last_stock NUMERIC(10, 2);
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS last_cost_per_unit NUMERIC(10, 2);
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS average_cost NUMERIC(10, 2);
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS total_value NUMERIC(12, 2);
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS is_day_closed BOOLEAN DEFAULT false;

-- Create daily stock snapshots table
CREATE TABLE IF NOT EXISTS daily_stock_snapshots (
  id SERIAL PRIMARY KEY,
  snapshot_date DATE NOT NULL,
  item_id INTEGER NOT NULL REFERENCES inventory_items(id),
  item_name VARCHAR(200) NOT NULL,
  primary_quantity NUMERIC(10, 2) NOT NULL,
  secondary_quantity NUMERIC(10, 2),
  primary_unit VARCHAR(50),
  secondary_unit VARCHAR(50),
  average_cost NUMERIC(10, 2) NOT NULL,
  total_value NUMERIC(12, 2) NOT NULL,
  is_closed BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(snapshot_date, item_id)
);

-- Create stock movements table for detailed tracking
CREATE TABLE IF NOT EXISTS stock_movements (
  id SERIAL PRIMARY KEY,
  item_id INTEGER NOT NULL REFERENCES inventory_items(id),
  movement_type VARCHAR(20) NOT NULL, -- 'purchase', 'production', 'adjustment', 'transfer'
  movement_direction VARCHAR(10) NOT NULL, -- 'in', 'out'
  quantity NUMERIC(10, 2) NOT NULL,
  unit_id INTEGER REFERENCES units(id),
  unit_cost NUMERIC(10, 2),
  total_cost NUMERIC(12, 2),
  reference_type VARCHAR(50), -- 'purchase_order', 'production_batch', 'manual_adjustment'
  reference_id INTEGER,
  reference_number VARCHAR(100),
  batch_number VARCHAR(50),
  expiry_date DATE,
  supplier VARCHAR(200),
  operator VARCHAR(100),
  notes TEXT,
  movement_date TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create FIFO cost tracking table
CREATE TABLE IF NOT EXISTS stock_cost_layers (
  id SERIAL PRIMARY KEY,
  item_id INTEGER NOT NULL REFERENCES inventory_items(id),
  quantity_remaining NUMERIC(10, 2) NOT NULL,
  unit_cost NUMERIC(10, 2) NOT NULL,
  purchase_date TIMESTAMP NOT NULL,
  batch_number VARCHAR(50),
  supplier VARCHAR(200),
  is_exhausted BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create production deduction logs table
CREATE TABLE IF NOT EXISTS production_deductions (
  id SERIAL PRIMARY KEY,
  production_id INTEGER,
  product_id INTEGER REFERENCES products(id),
  item_id INTEGER NOT NULL REFERENCES inventory_items(id),
  quantity_deducted NUMERIC(10, 2) NOT NULL,
  unit_cost NUMERIC(10, 2) NOT NULL,
  total_cost NUMERIC(12, 2) NOT NULL,
  batch_id VARCHAR(50),
  production_date TIMESTAMP NOT NULL,
  operator VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_daily_snapshots_date ON daily_stock_snapshots(snapshot_date);
CREATE INDEX IF NOT EXISTS idx_daily_snapshots_item ON daily_stock_snapshots(item_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_item ON stock_movements(item_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON stock_movements(movement_date);
CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON stock_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_cost_layers_item ON stock_cost_layers(item_id);
CREATE INDEX IF NOT EXISTS idx_cost_layers_exhausted ON stock_cost_layers(is_exhausted);
CREATE INDEX IF NOT EXISTS idx_production_deductions_product ON production_deductions(product_id);
CREATE INDEX IF NOT EXISTS idx_production_deductions_item ON production_deductions(item_id);

-- Update existing inventory items with calculated values
UPDATE inventory_items SET 
  average_cost = COALESCE(cost_per_unit, 0),
  total_value = COALESCE(CAST(current_stock AS NUMERIC) * CAST(cost_per_unit AS NUMERIC), 0),
  last_stock = current_stock,
  last_cost_per_unit = cost_per_unit
WHERE average_cost IS NULL OR total_value IS NULL;

-- Create function to automatically update total_value when stock or cost changes
CREATE OR REPLACE FUNCTION update_inventory_total_value()
RETURNS TRIGGER AS $$
BEGIN
  NEW.total_value = COALESCE(CAST(NEW.current_stock AS NUMERIC) * COALESCE(NEW.average_cost, CAST(NEW.cost_per_unit AS NUMERIC)), 0);
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update total value
DROP TRIGGER IF EXISTS trigger_update_inventory_total_value ON inventory_items;
CREATE TRIGGER trigger_update_inventory_total_value
  BEFORE UPDATE ON inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION update_inventory_total_value();
