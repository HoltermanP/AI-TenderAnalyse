-- Uitgebreide bedrijfsinformatie (handmatig invoerbaar voor tender-analyse)

ALTER TABLE company_info
  ADD COLUMN IF NOT EXISTS legal_form VARCHAR(120),
  ADD COLUMN IF NOT EXISTS address_line TEXT,
  ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20),
  ADD COLUMN IF NOT EXISTS city VARCHAR(255),
  ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'Nederland',
  ADD COLUMN IF NOT EXISTS vat_number VARCHAR(32),
  ADD COLUMN IF NOT EXISTS contact_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(50),
  ADD COLUMN IF NOT EXISTS cpv_focus TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS reference_projects TEXT,
  ADD COLUMN IF NOT EXISTS differentiators TEXT,
  ADD COLUMN IF NOT EXISTS strategic_notes TEXT;
