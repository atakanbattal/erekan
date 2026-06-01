-- Do not overwrite admin-configured warranty when order data is re-synced
CREATE OR REPLACE FUNCTION sync_customer_asset_from_order(p_order_id uuid)
RETURNS uuid AS $$
DECLARE
  o record;
  v_installed timestamptz;
  v_asset_id uuid;
  v_tag text;
BEGIN
  SELECT * INTO o FROM orders WHERE id = p_order_id;
  IF NOT FOUND OR o.status NOT IN ('completed', 'shipped') THEN
    RETURN NULL;
  END IF;

  v_installed := COALESCE(o.shipped_at, o.updated_at, now());
  v_tag := COALESCE(o.serial_number, o.job_number);

  INSERT INTO customer_assets (
    customer_id, order_id, asset_tag, serial_number, title, description,
    material, standard, installed_at, warranty_start, warranty_end, warranty_months
  ) VALUES (
    o.customer_id, o.id, v_tag, o.serial_number, o.title, o.description,
    o.material, o.standard, v_installed,
    (v_installed AT TIME ZONE 'UTC')::date,
    ((v_installed AT TIME ZONE 'UTC')::date + interval '24 months')::date,
    24
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
