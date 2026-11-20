-- ==============================================================================
-- NON-DESTRUCTIVE MIGRATION: Vendor Contact Persistence on Purchase Orders
-- TABLE: public.purchase_orders
-- ZERO DATA LOSS GUARANTEED:
--   - Uses 'ADD COLUMN IF NOT EXISTS'
--   - Persists selected supplier contact persons, phone numbers, and address details
-- ==============================================================================

ALTER TABLE IF EXISTS public.purchase_orders
  ADD COLUMN IF NOT EXISTS vendor_contact TEXT,
  ADD COLUMN IF NOT EXISTS vendor_phone TEXT,
  ADD COLUMN IF NOT EXISTS vendor_email TEXT,
  ADD COLUMN IF NOT EXISTS vendor_address TEXT,
  ADD COLUMN IF NOT EXISTS vendor_billing_address TEXT,
  ADD COLUMN IF NOT EXISTS vendor_gstin TEXT,
  ADD COLUMN IF NOT EXISTS vendor_pan TEXT,
  ADD COLUMN IF NOT EXISTS selected_contacts JSONB DEFAULT '[]'::jsonb;
