-- Portal enhancements: notifications, multi-user, NDT, shipments, RFQ, templates, certifications

-- Notification types
DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM (
    'message_reply', 'stage_changed', 'document_uploaded',
    'delivery_reminder', 'delivery_overdue', 'support_request',
    'rfq_submitted', 'quote_ready', 'shipment_updated', 'ndt_result'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE notification_audience AS ENUM ('customer', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS portal_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audience notification_audience NOT NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  type notification_type NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  is_read boolean NOT NULL DEFAULT false,
  email_sent boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS portal_notifications_customer_idx ON portal_notifications(customer_id, is_read);
CREATE INDEX IF NOT EXISTS portal_notifications_audience_idx ON portal_notifications(audience, is_read);

ALTER TABLE portal_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notifications_select ON portal_notifications;
CREATE POLICY notifications_select ON portal_notifications
  FOR SELECT USING (
    (audience = 'customer' AND customer_id = get_customer_id())
    OR is_staff()
  );

DROP POLICY IF EXISTS notifications_update ON portal_notifications;
CREATE POLICY notifications_update ON portal_notifications
  FOR UPDATE USING (
    (audience = 'customer' AND customer_id = get_customer_id())
    OR is_staff()
  );

-- Multi-user customer accounts
DO $$ BEGIN
  CREATE TYPE customer_user_role AS ENUM ('admin', 'quality', 'procurement', 'viewer');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS customer_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  auth_user_id uuid NOT NULL UNIQUE,
  full_name text NOT NULL,
  email text NOT NULL,
  role customer_user_role NOT NULL DEFAULT 'viewer',
  is_primary boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS customer_users_customer_idx ON customer_users(customer_id);

ALTER TABLE customer_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS customer_users_select ON customer_users;
CREATE POLICY customer_users_select ON customer_users
  FOR SELECT USING (customer_id = get_customer_id() OR is_staff());

DROP POLICY IF EXISTS customer_users_insert ON customer_users;
CREATE POLICY customer_users_insert ON customer_users
  FOR INSERT WITH CHECK (
    is_staff()
    OR (
      customer_id = get_customer_id()
      AND EXISTS (
        SELECT 1 FROM customer_users cu
        WHERE cu.auth_user_id = auth.uid()
          AND cu.customer_id = customer_users.customer_id
          AND cu.role = 'admin'
          AND cu.is_active = true
      )
    )
    OR (
      customer_id = get_customer_id()
      AND EXISTS (
        SELECT 1 FROM customers c
        WHERE c.id = customer_users.customer_id AND c.auth_user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS customer_users_update ON customer_users;
CREATE POLICY customer_users_update ON customer_users
  FOR UPDATE USING (customer_id = get_customer_id() OR is_staff());

-- Extend get_customer_id for multi-user support (after customer_users table exists)
CREATE OR REPLACE FUNCTION public.get_customer_id()
 RETURNS uuid
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    (SELECT id FROM customers WHERE auth_user_id = auth.uid() LIMIT 1),
    (SELECT customer_id FROM customer_users WHERE auth_user_id = auth.uid() AND is_active = true LIMIT 1)
  );
$function$;

-- NDT records
DO $$ BEGIN
  CREATE TYPE ndt_method AS ENUM ('ut', 'mt', 'pt', 'vt', 'rt');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE ndt_result AS ENUM ('pass', 'conditional', 'fail', 'pending');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS ndt_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  stage_id uuid REFERENCES order_stages(id) ON DELETE SET NULL,
  method ndt_method NOT NULL,
  result ndt_result NOT NULL DEFAULT 'pending',
  inspector_name text,
  report_number text,
  notes text,
  is_visible_to_customer boolean NOT NULL DEFAULT true,
  tested_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ndt_records_order_idx ON ndt_records(order_id);

ALTER TABLE ndt_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ndt_select ON ndt_records;
CREATE POLICY ndt_select ON ndt_records
  FOR SELECT USING (
    is_staff()
    OR (
      is_visible_to_customer = true
      AND EXISTS (
        SELECT 1 FROM orders o
        WHERE o.id = ndt_records.order_id AND o.customer_id = get_customer_id()
      )
    )
  );

DROP POLICY IF EXISTS ndt_insert ON ndt_records;
CREATE POLICY ndt_insert ON ndt_records
  FOR INSERT WITH CHECK (is_staff());

DROP POLICY IF EXISTS ndt_update ON ndt_records;
CREATE POLICY ndt_update ON ndt_records
  FOR UPDATE USING (is_staff());

-- Shipments
CREATE TABLE IF NOT EXISTS shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  carrier text,
  tracking_number text,
  shipped_at timestamptz,
  estimated_arrival timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS shipments_order_idx ON shipments(order_id);

ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS shipments_select ON shipments;
CREATE POLICY shipments_select ON shipments
  FOR SELECT USING (
    is_staff()
    OR EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = shipments.order_id AND o.customer_id = get_customer_id()
    )
  );

DROP POLICY IF EXISTS shipments_insert ON shipments;
CREATE POLICY shipments_insert ON shipments
  FOR INSERT WITH CHECK (is_staff());

DROP POLICY IF EXISTS shipments_update ON shipments;
CREATE POLICY shipments_update ON shipments
  FOR UPDATE USING (is_staff());

-- Order templates
CREATE TABLE IF NOT EXISTS order_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  title_template text NOT NULL,
  material text,
  standard text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE order_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS templates_select ON order_templates;
CREATE POLICY templates_select ON order_templates
  FOR SELECT USING (is_staff());

DROP POLICY IF EXISTS templates_insert ON order_templates;
CREATE POLICY templates_insert ON order_templates
  FOR INSERT WITH CHECK (is_staff());

DROP POLICY IF EXISTS templates_update ON order_templates;
CREATE POLICY templates_update ON order_templates
  FOR UPDATE USING (is_staff());

DROP POLICY IF EXISTS templates_delete ON order_templates;
CREATE POLICY templates_delete ON order_templates
  FOR DELETE USING (is_staff());

-- RFQ / Quotes
DO $$ BEGIN
  CREATE TYPE rfq_status AS ENUM ('submitted', 'reviewing', 'quoted', 'approved', 'rejected', 'converted');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS rfq_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  material text,
  quantity text,
  standard text,
  deadline date,
  status rfq_status NOT NULL DEFAULT 'submitted',
  admin_notes text,
  quote_file_path text,
  quote_file_name text,
  converted_order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rfq_requests_customer_idx ON rfq_requests(customer_id);

ALTER TABLE rfq_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rfq_select ON rfq_requests;
CREATE POLICY rfq_select ON rfq_requests
  FOR SELECT USING (customer_id = get_customer_id() OR is_staff());

DROP POLICY IF EXISTS rfq_insert ON rfq_requests;
CREATE POLICY rfq_insert ON rfq_requests
  FOR INSERT WITH CHECK (customer_id = get_customer_id());

DROP POLICY IF EXISTS rfq_update ON rfq_requests;
CREATE POLICY rfq_update ON rfq_requests
  FOR UPDATE USING (customer_id = get_customer_id() OR is_staff());

-- Company certifications showcase
CREATE TABLE IF NOT EXISTS company_certifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  title text NOT NULL,
  description text,
  valid_until date,
  sort_order int NOT NULL DEFAULT 0,
  is_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE company_certifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS certs_select ON company_certifications;
CREATE POLICY certs_select ON company_certifications
  FOR SELECT USING (is_visible = true OR is_staff());

DROP POLICY IF EXISTS certs_manage ON company_certifications;
CREATE POLICY certs_manage ON company_certifications
  FOR ALL USING (is_staff());

-- Customer document uploads
ALTER TABLE order_documents ADD COLUMN IF NOT EXISTS uploader_type text NOT NULL DEFAULT 'admin';

-- Seed certifications
INSERT INTO company_certifications (code, title, description, sort_order)
SELECT v.code, v.title, v.description, v.sort_order
FROM (VALUES
  ('EN-ISO-3834-2', 'EN ISO 3834-2', 'Kaynaklı imalat kalite gereksinimleri — Kapsamlı kalite', 1),
  ('EN-1090-EXC3', 'EN 1090 EXC3', 'Çelik konstrüksiyon imalat ve montaj', 2),
  ('ISO-9001', 'ISO 9001', 'Kalite yönetim sistemi', 3),
  ('ISO-14001', 'ISO 14001', 'Çevre yönetim sistemi', 4),
  ('ISO-45001', 'ISO 45001', 'İş sağlığı ve güvenliği yönetim sistemi', 5)
) AS v(code, title, description, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM company_certifications LIMIT 1);

-- Seed default order templates
INSERT INTO order_templates (name, title_template, material, standard, description)
SELECT v.name, v.title_template, v.material, v.standard, v.description
FROM (VALUES
  ('Basınçlı Kap', 'Basınçlı Kap İmalatı', 'P355NL1', 'EN 13445', 'Basınçlı kap kaynaklı imalat şablonu'),
  ('Boru Profil', 'Boru/Profil İmalatı', 'S355J2', 'EN 10219', 'Boru ve profil kaynaklı imalat'),
  ('Çelik Konstrüksiyon', 'Çelik Konstrüksiyon', 'S355JR', 'EN 1090 EXC3', 'Çelik konstrüksiyon imalat şablonu'),
  ('Savunma Parçası', 'Savunma Sanayi Parçası', 'Hardox 500', 'MIL-STD', 'Savunma sanayi kaynaklı imalat')
) AS v(name, title_template, material, standard, description)
WHERE NOT EXISTS (SELECT 1 FROM order_templates LIMIT 1);
