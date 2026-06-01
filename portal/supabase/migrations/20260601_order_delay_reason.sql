ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS delay_reason text;

COMMENT ON COLUMN orders.delay_reason IS 'Admin-provided explanation when delivery is overdue';
