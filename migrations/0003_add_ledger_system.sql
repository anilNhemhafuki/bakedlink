
-- Add ledger system tables and columns

-- Add new columns to customers table
ALTER TABLE customers 
ADD COLUMN opening_balance NUMERIC(12,2) DEFAULT 0,
ADD COLUMN current_balance NUMERIC(12,2) DEFAULT 0;

-- Add new columns to parties table  
ALTER TABLE parties
ADD COLUMN tax_id VARCHAR(50),
ADD COLUMN notes TEXT,
ADD COLUMN opening_balance NUMERIC(12,2) DEFAULT 0,
ADD COLUMN current_balance NUMERIC(12,2) DEFAULT 0;

-- Create ledger_transactions table
CREATE TABLE ledger_transactions (
  id SERIAL PRIMARY KEY,
  customer_or_party_id INTEGER NOT NULL,
  entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('customer', 'party')),
  transaction_date TIMESTAMP NOT NULL,
  description TEXT NOT NULL,
  reference_number VARCHAR(100),
  debit_amount NUMERIC(12,2) DEFAULT 0,
  credit_amount NUMERIC(12,2) DEFAULT 0,
  running_balance NUMERIC(12,2) NOT NULL,
  transaction_type VARCHAR(50) NOT NULL,
  related_order_id INTEGER,
  related_purchase_id INTEGER,
  payment_method VARCHAR(50),
  notes TEXT,
  created_by VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_ledger_transactions_entity ON ledger_transactions(customer_or_party_id, entity_type);
CREATE INDEX idx_ledger_transactions_date ON ledger_transactions(transaction_date);
CREATE INDEX idx_ledger_transactions_type ON ledger_transactions(transaction_type);
