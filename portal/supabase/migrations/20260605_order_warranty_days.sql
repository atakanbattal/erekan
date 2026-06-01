-- Per-order warranty in days; warranty starts on shipment date (orders.shipped_at)

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS warranty_days int NOT NULL DEFAULT 730;

COMMENT ON COLUMN orders.warranty_days IS 'Product warranty duration in days; starts when order is shipped';

CREATE OR REPLACE FUNCTION sync_customer_asset_from_order(p_order_id uuid)
RETURNS uuid AS $$
DECLARE
  o record;
  v_installed timestamptz;
  v_asset_id uuid;
  v_tag text;
  v_warranty_days int;
  v_warranty_start date;
  v_warranty_end date;
  v_warranty_months int;
BEGIN
  SELECT * INTO o FROM orders WHERE id = p_order_id;
  IF NOT FOUND OR o.shipped_at IS NULL THEN
    RETURN NULL;
  END IF;

  v_installed := o.shipped_at;
  v_tag := COALESCE(o.serial_number, o.job_number);
  v_warranty_days := GREATEST(COALESCE(o.warranty_days, 730), 1);
  v_warranty_start := (v_installed AT TIME ZONE 'UTC')::date;
  v_warranty_end := v_warranty_start + v_warranty_days;
  v_warranty_months := GREATEST(1, ROUND(v_warranty_days / 30.0)::int);

  INSERT INTO customer_assets (
    customer_id, order_id, asset_tag, serial_number, title, description,
    material, standard, installed_at, warranty_start, warranty_end, warranty_months
  ) VALUES (
    o.customer_id, o.id, v_tag, o.serial_number, o.title, o.description,
    o.material, o.standard, v_installed,
    v_warranty_start, v_warranty_end, v_warranty_months
  )
  ON CONFLICT (order_id) DO UPDATE SET
    serial_number = EXCLUDED.serial_number,
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    material = EXCLUDED.material,
    standard = EXCLUDED.standard,
    installed_at = EXCLUDED.installed_at,
    updated_at = now()
  RETURNING id INTO v_asset_id;

  RETURN v_asset_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION trg_sync_asset_on_order_complete()
RETURNS trigger AS $$
BEGIN
  IF NEW.shipped_at IS NOT NULL AND (
    TG_OP = 'INSERT'
    OR OLD.shipped_at IS DISTINCT FROM NEW.shipped_at
    OR (NEW.status IN ('completed', 'shipped') AND OLD.status IS DISTINCT FROM NEW.status)
  ) THEN
    PERFORM sync_customer_asset_from_order(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS orders_sync_asset_trg ON orders;
CREATE TRIGGER orders_sync_asset_trg
  AFTER INSERT OR UPDATE OF status, shipped_at ON orders
  FOR EACH ROW EXECUTE FUNCTION trg_sync_asset_on_order_complete();

-- Backfill assets for orders that already have a shipment date
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM orders WHERE shipped_at IS NOT NULL LOOP
    PERFORM sync_customer_asset_from_order(r.id);
  END LOOP;
END $$;
