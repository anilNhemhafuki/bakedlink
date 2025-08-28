
-- Add new fields to staff table
ALTER TABLE staff ADD COLUMN citizenship_number VARCHAR(50);
ALTER TABLE staff ADD COLUMN pan_number VARCHAR(50);
ALTER TABLE staff ADD COLUMN identity_card_url VARCHAR(500);
ALTER TABLE staff ADD COLUMN agreement_paper_url VARCHAR(500);
