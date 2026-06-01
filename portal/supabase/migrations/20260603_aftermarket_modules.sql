-- Aftermarket: assets, service cases, maintenance, spare parts

DO $$ BEGIN
  ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'service_case_submitted';
  ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'service_case_updated';
  ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'maintenance_due';
  ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'spare_part_quoted';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE asset_status AS ENUM ('active', 'under_service', 'retired');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE service_case_type AS ENUM ('warranty', 'paid_service', 'consultation');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE service_fault_category AS ENUM (
    'weld_defect', 'deformation', 'coating', 'assembly', 'wear', 'electrical', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE service_priority AS ENUM ('low', 'normal', 'high', 'critical');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE service_case_status AS ENUM (
    'submitted', 'triage', 'assigned', 'in_progress', 'waiting_parts',
    'resolved', 'closed', 'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE maintenance_plan_status AS ENUM ('active', 'paused', 'completed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE spare_part_stock_status AS ENUM (
    'in_stock', 'limited', 'made_to_order', 'discontinued'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE spare_part_request_status AS ENUM (
    'draft', 'submitted', 'quoted', 'approved', 'rejected', 'ordered', 'shipped', 'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Customer assets (installed base)
CREATE TABLE IF NOT EXISTS customer_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  order_id uuid UNIQUE REFERENCES orders(id) ON DELETE SET NULL,
  asset_tag text NOT NULL,
  serial_number text,
  title text NOT NULL,
  description text,
  material text,
  standard text,
  location text,
  installed_at timestamptz,
  warranty_start date,
  warranty_end date,
  warranty_months int NOT NULL DEFAULT 24,
  status asset_status NOT NULL DEFAULT 'active',
  access_token text UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS customer_assets_customer_idx ON customer_assets(customer_id, status);
CREATE INDEX IF NOT EXISTS customer_assets_order_idx ON customer_assets(order_id);
CREATE UNIQUE INDEX IF NOT EXISTS customer_assets_tag_idx ON customer_assets(asset_tag);

-- Service cases
CREATE TABLE IF NOT EXISTS service_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  asset_id uuid NOT NULL REFERENCES customer_assets(id) ON DELETE CASCADE,
  case_number text NOT NULL UNIQUE,
  case_type service_case_type NOT NULL DEFAULT 'warranty',
  fault_category service_fault_category NOT NULL DEFAULT 'other',
  priority service_priority NOT NULL DEFAULT 'normal',
  status service_case_status NOT NULL DEFAULT 'submitted',
  subject text NOT NULL,
  description text NOT NULL,
  operating_conditions text,
  requested_resolution text,
  assigned_to text,
  resolution_notes text,
  closed_at timestamptz,
  customer_confirmed_at timestamptz,
  created_by_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS service_cases_customer_idx ON service_cases(customer_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS service_cases_asset_idx ON service_cases(asset_id);

CREATE TABLE IF NOT EXISTS service_case_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES service_cases(id) ON DELETE CASCADE,
  file_path text NOT NULL,
  file_name text NOT NULL,
  mime_type text,
  file_size bigint,
  uploaded_by text NOT NULL DEFAULT 'customer',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS service_case_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES service_cases(id) ON DELETE CASCADE,
  author_type text NOT NULL,
  author_name text,
  body text NOT NULL,
  is_internal boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Maintenance
CREATE TABLE IF NOT EXISTS maintenance_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  asset_id uuid NOT NULL REFERENCES customer_assets(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  interval_days int NOT NULL DEFAULT 180,
  checklist jsonb NOT NULL DEFAULT '[]',
  next_due_at date,
  last_performed_at date,
  status maintenance_plan_status NOT NULL DEFAULT 'active',
  reminder_days_before int NOT NULL DEFAULT 14,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS maintenance_plans_asset_idx ON maintenance_plans(asset_id, status);
CREATE INDEX IF NOT EXISTS maintenance_plans_due_idx ON maintenance_plans(next_due_at) WHERE status = 'active';

CREATE TABLE IF NOT EXISTS maintenance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  asset_id uuid NOT NULL REFERENCES customer_assets(id) ON DELETE CASCADE,
  plan_id uuid REFERENCES maintenance_plans(id) ON DELETE SET NULL,
  performed_at timestamptz NOT NULL DEFAULT now(),
  performed_by text,
  work_summary text NOT NULL,
  parts_used text,
  next_due_at date,
  report_file_path text,
  report_file_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS maintenance_records_asset_idx ON maintenance_records(asset_id, performed_at DESC);

-- Spare parts catalog (staff-managed)
CREATE TABLE IF NOT EXISTS spare_part_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  part_number text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  drawing_ref text,
  unit text NOT NULL DEFAULT 'adet',
  unit_price numeric(12, 2),
  currency text NOT NULL DEFAULT 'EUR',
  stock_status spare_part_stock_status NOT NULL DEFAULT 'in_stock',
  is_active boolean NOT NULL DEFAULT true,
  image_path text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS asset_bom (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES customer_assets(id) ON DELETE CASCADE,
  part_id uuid NOT NULL REFERENCES spare_part_catalog(id) ON DELETE CASCADE,
  qty numeric(10, 2) NOT NULL DEFAULT 1,
  recommended_interval_days int,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (asset_id, part_id)
);

CREATE TABLE IF NOT EXISTS spare_part_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  asset_id uuid REFERENCES customer_assets(id) ON DELETE SET NULL,
  request_number text NOT NULL UNIQUE,
  status spare_part_request_status NOT NULL DEFAULT 'draft',
  notes text,
  quote_file_path text,
  quote_file_name text,
  quote_amount numeric(12, 2),
  quote_currency text DEFAULT 'EUR',
  admin_notes text,
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS spare_part_requests_customer_idx
  ON spare_part_requests(customer_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS spare_part_request_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES spare_part_requests(id) ON DELETE CASCADE,
  part_id uuid REFERENCES spare_part_catalog(id) ON DELETE SET NULL,
  part_number text NOT NULL,
  part_name text NOT NULL,
  qty numeric(10, 2) NOT NULL DEFAULT 1,
  unit text NOT NULL DEFAULT 'adet',
  notes text
);

-- Sequences for human-readable numbers
CREATE SEQUENCE IF NOT EXISTS service_case_number_seq START 1;
CREATE SEQUENCE IF NOT EXISTS spare_part_request_number_seq START 1;

CREATE OR REPLACE FUNCTION generate_service_case_number()
RETURNS trigger AS $$
BEGIN
  IF NEW.case_number IS NULL OR NEW.case_number = '' THEN
    NEW.case_number := 'SR-' || to_char(now(), 'YYYY') || '-' ||
      lpad(nextval('service_case_number_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS service_cases_number_trg ON service_cases;
CREATE TRIGGER service_cases_number_trg
  BEFORE INSERT ON service_cases
  FOR EACH ROW EXECUTE FUNCTION generate_service_case_number();

CREATE OR REPLACE FUNCTION generate_spare_part_request_number()
RETURNS trigger AS $$
BEGIN
  IF NEW.request_number IS NULL OR NEW.request_number = '' THEN
    NEW.request_number := 'PR-' || to_char(now(), 'YYYY') || '-' ||
      lpad(nextval('spare_part_request_number_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS spare_part_requests_number_trg ON spare_part_requests;
CREATE TRIGGER spare_part_requests_number_trg
  BEFORE INSERT ON spare_part_requests
  FOR EACH ROW EXECUTE FUNCTION generate_spare_part_request_number();

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

CREATE OR REPLACE FUNCTION trg_sync_asset_on_order_complete()
RETURNS trigger AS $$
BEGIN
  IF NEW.status IN ('completed', 'shipped')
     AND (OLD.status IS DISTINCT FROM NEW.status OR TG_OP = 'INSERT') THEN
    PERFORM sync_customer_asset_from_order(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS orders_sync_asset_trg ON orders;
CREATE TRIGGER orders_sync_asset_trg
  AFTER INSERT OR UPDATE OF status ON orders
  FOR EACH ROW EXECUTE FUNCTION trg_sync_asset_on_order_complete();

-- Backfill existing delivered orders
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM orders WHERE status IN ('completed', 'shipped') LOOP
    PERFORM sync_customer_asset_from_order(r.id);
  END LOOP;
END $$;

-- RLS
ALTER TABLE customer_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_case_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_case_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE spare_part_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_bom ENABLE ROW LEVEL SECURITY;
ALTER TABLE spare_part_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE spare_part_request_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS customer_assets_select ON customer_assets;
CREATE POLICY customer_assets_select ON customer_assets
  FOR SELECT USING (customer_id = get_customer_id() OR is_staff());

DROP POLICY IF EXISTS customer_assets_all ON customer_assets;
CREATE POLICY customer_assets_all ON customer_assets
  FOR ALL USING (is_staff()) WITH CHECK (is_staff());

DROP POLICY IF EXISTS service_cases_select ON service_cases;
CREATE POLICY service_cases_select ON service_cases
  FOR SELECT USING (customer_id = get_customer_id() OR is_staff());

DROP POLICY IF EXISTS service_cases_insert ON service_cases;
CREATE POLICY service_cases_insert ON service_cases
  FOR INSERT WITH CHECK (customer_id = get_customer_id());

DROP POLICY IF EXISTS service_cases_update ON service_cases;
CREATE POLICY service_cases_update ON service_cases
  FOR UPDATE USING (customer_id = get_customer_id() OR is_staff())
  WITH CHECK (customer_id = get_customer_id() OR is_staff());

DROP POLICY IF EXISTS service_case_attachments_select ON service_case_attachments;
CREATE POLICY service_case_attachments_select ON service_case_attachments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM service_cases sc
      WHERE sc.id = service_case_attachments.case_id
        AND (sc.customer_id = get_customer_id() OR is_staff())
    )
  );

DROP POLICY IF EXISTS service_case_attachments_insert ON service_case_attachments;
CREATE POLICY service_case_attachments_insert ON service_case_attachments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM service_cases sc
      WHERE sc.id = service_case_attachments.case_id
        AND (sc.customer_id = get_customer_id() OR is_staff())
    )
  );

DROP POLICY IF EXISTS service_case_updates_select ON service_case_updates;
CREATE POLICY service_case_updates_select ON service_case_updates
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM service_cases sc
      WHERE sc.id = service_case_updates.case_id
        AND (sc.customer_id = get_customer_id() OR is_staff())
    )
    AND (NOT is_internal OR is_staff())
  );

DROP POLICY IF EXISTS service_case_updates_insert ON service_case_updates;
CREATE POLICY service_case_updates_insert ON service_case_updates
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM service_cases sc
      WHERE sc.id = service_case_updates.case_id
        AND (sc.customer_id = get_customer_id() OR is_staff())
    )
  );

DROP POLICY IF EXISTS maintenance_plans_select ON maintenance_plans;
CREATE POLICY maintenance_plans_select ON maintenance_plans
  FOR SELECT USING (customer_id = get_customer_id() OR is_staff());

DROP POLICY IF EXISTS maintenance_plans_all ON maintenance_plans;
CREATE POLICY maintenance_plans_all ON maintenance_plans
  FOR ALL USING (is_staff()) WITH CHECK (is_staff());

DROP POLICY IF EXISTS maintenance_records_select ON maintenance_records;
CREATE POLICY maintenance_records_select ON maintenance_records
  FOR SELECT USING (customer_id = get_customer_id() OR is_staff());

DROP POLICY IF EXISTS maintenance_records_insert ON maintenance_records;
CREATE POLICY maintenance_records_insert ON maintenance_records
  FOR INSERT WITH CHECK (customer_id = get_customer_id() OR is_staff());

DROP POLICY IF EXISTS spare_part_catalog_select ON spare_part_catalog;
CREATE POLICY spare_part_catalog_select ON spare_part_catalog
  FOR SELECT USING (is_active = true OR is_staff());

DROP POLICY IF EXISTS spare_part_catalog_all ON spare_part_catalog;
CREATE POLICY spare_part_catalog_all ON spare_part_catalog
  FOR ALL USING (is_staff()) WITH CHECK (is_staff());

DROP POLICY IF EXISTS asset_bom_select ON asset_bom;
CREATE POLICY asset_bom_select ON asset_bom
  FOR SELECT USING (
    is_staff()
    OR EXISTS (
      SELECT 1 FROM customer_assets a
      WHERE a.id = asset_bom.asset_id AND a.customer_id = get_customer_id()
    )
  );

DROP POLICY IF EXISTS asset_bom_all ON asset_bom;
CREATE POLICY asset_bom_all ON asset_bom
  FOR ALL USING (is_staff()) WITH CHECK (is_staff());

DROP POLICY IF EXISTS spare_part_requests_select ON spare_part_requests;
CREATE POLICY spare_part_requests_select ON spare_part_requests
  FOR SELECT USING (customer_id = get_customer_id() OR is_staff());

DROP POLICY IF EXISTS spare_part_requests_insert ON spare_part_requests;
CREATE POLICY spare_part_requests_insert ON spare_part_requests
  FOR INSERT WITH CHECK (customer_id = get_customer_id());

DROP POLICY IF EXISTS spare_part_requests_update ON spare_part_requests;
CREATE POLICY spare_part_requests_update ON spare_part_requests
  FOR UPDATE USING (customer_id = get_customer_id() OR is_staff())
  WITH CHECK (customer_id = get_customer_id() OR is_staff());

DROP POLICY IF EXISTS spare_part_request_lines_select ON spare_part_request_lines;
CREATE POLICY spare_part_request_lines_select ON spare_part_request_lines
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM spare_part_requests r
      WHERE r.id = spare_part_request_lines.request_id
        AND (r.customer_id = get_customer_id() OR is_staff())
    )
  );

DROP POLICY IF EXISTS spare_part_request_lines_insert ON spare_part_request_lines;
CREATE POLICY spare_part_request_lines_insert ON spare_part_request_lines
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM spare_part_requests r
      WHERE r.id = spare_part_request_lines.request_id
        AND (r.customer_id = get_customer_id() OR is_staff())
    )
  );

DROP POLICY IF EXISTS spare_part_request_lines_update ON spare_part_request_lines;
CREATE POLICY spare_part_request_lines_update ON spare_part_request_lines
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM spare_part_requests r
      WHERE r.id = spare_part_request_lines.request_id
        AND (r.customer_id = get_customer_id() OR is_staff())
    )
  );

-- Storage bucket for aftermarket files
INSERT INTO storage.buckets (id, name, public)
VALUES ('aftermarket-files', 'aftermarket-files', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS aftermarket_files_select ON storage.objects;
CREATE POLICY aftermarket_files_select ON storage.objects
  FOR SELECT USING (
    bucket_id = 'aftermarket-files'
    AND (
      is_staff()
      OR (storage.foldername(name))[1] = get_customer_id()::text
    )
  );

DROP POLICY IF EXISTS aftermarket_files_insert ON storage.objects;
CREATE POLICY aftermarket_files_insert ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'aftermarket-files'
    AND (
      is_staff()
      OR (storage.foldername(name))[1] = get_customer_id()::text
    )
  );

DROP POLICY IF EXISTS aftermarket_files_update ON storage.objects;
CREATE POLICY aftermarket_files_update ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'aftermarket-files'
    AND (is_staff() OR (storage.foldername(name))[1] = get_customer_id()::text)
  );

-- Seed sample spare parts catalog
INSERT INTO spare_part_catalog (part_number, name, description, drawing_ref, unit, stock_status)
VALUES
  ('AW-TORCH-NZ-01', 'Kaynak torcu nozul', 'MIG/MAG torç nozul — standart', 'DWG-TORCH-01', 'adet', 'in_stock'),
  ('AW-TIP-M6-02', 'İletken uç M6', 'Bakır iletken uç, 1.2mm tel', 'DWG-TIP-M6', 'adet', 'in_stock'),
  ('AW-LINER-3M', 'Tel besleme liner 3m', '4 rolner tel besleme hattı', 'DWG-LINER-3M', 'adet', 'limited'),
  ('AW-GAS-DIF', 'Gaz difüzör', 'Seramik gaz difüzör', 'DWG-GAS-DIF', 'adet', 'in_stock'),
  ('AW-FIX-BASE', 'Fikstür taban plakası', 'Kaynak fikstürü yedek taban', 'DWG-FIX-BASE', 'adet', 'made_to_order')
ON CONFLICT (part_number) DO NOTHING;
