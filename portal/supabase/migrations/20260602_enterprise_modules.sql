-- Enterprise modules: actions, audit, doc versions, RFQ quotes, traceability, staff roles, notification prefs

DO $$ BEGIN
  ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'action_required';
  ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'rfq_approved';
  ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'rfq_rejected';
  ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'delivery_confirmed';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE portal_action_type AS ENUM (
    'rfq_quote_review',
    'rfq_convert',
    'order_delivery_confirm',
    'order_delay_note',
    'document_review',
    'general'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE portal_action_status AS ENUM ('open', 'completed', 'dismissed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE portal_action_audience AS ENUM ('customer', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE staff_role AS ENUM ('admin', 'operations', 'quality', 'sales');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS portal_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audience portal_action_audience NOT NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  rfq_id uuid REFERENCES rfq_requests(id) ON DELETE CASCADE,
  action_type portal_action_type NOT NULL,
  title text NOT NULL,
  description text,
  link text,
  status portal_action_status NOT NULL DEFAULT 'open',
  priority int NOT NULL DEFAULT 0,
  due_at timestamptz,
  completed_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS portal_actions_audience_status_idx
  ON portal_actions(audience, status, created_at DESC);
CREATE INDEX IF NOT EXISTS portal_actions_customer_idx
  ON portal_actions(customer_id, status);

ALTER TABLE portal_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS portal_actions_select ON portal_actions;
CREATE POLICY portal_actions_select ON portal_actions
  FOR SELECT USING (
    (audience = 'customer' AND customer_id = get_customer_id())
    OR is_staff()
  );

DROP POLICY IF EXISTS portal_actions_update ON portal_actions;
CREATE POLICY portal_actions_update ON portal_actions
  FOR UPDATE USING (
    (audience = 'customer' AND customer_id = get_customer_id())
    OR is_staff()
  );

DROP POLICY IF EXISTS portal_actions_insert ON portal_actions;
CREATE POLICY portal_actions_insert ON portal_actions
  FOR INSERT WITH CHECK (is_staff());

CREATE TABLE IF NOT EXISTS audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_type text NOT NULL,
  actor_id uuid,
  actor_name text,
  entity_type text NOT NULL,
  entity_id uuid,
  action text NOT NULL,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_log_created_idx ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS audit_log_entity_idx ON audit_log(entity_type, entity_id);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS audit_log_select ON audit_log;
CREATE POLICY audit_log_select ON audit_log
  FOR SELECT USING (is_staff());

DROP POLICY IF EXISTS audit_log_insert ON audit_log;
CREATE POLICY audit_log_insert ON audit_log
  FOR INSERT WITH CHECK (true);

ALTER TABLE order_documents
  ADD COLUMN IF NOT EXISTS version int NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS revision_label text,
  ADD COLUMN IF NOT EXISTS is_official boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS parent_document_id uuid REFERENCES order_documents(id) ON DELETE SET NULL;

ALTER TABLE rfq_requests
  ADD COLUMN IF NOT EXISTS quote_version int NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS customer_response_note text,
  ADD COLUMN IF NOT EXISTS responded_at timestamptz,
  ADD COLUMN IF NOT EXISTS responded_by_name text;

CREATE TABLE IF NOT EXISTS rfq_quote_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id uuid NOT NULL REFERENCES rfq_requests(id) ON DELETE CASCADE,
  version int NOT NULL,
  file_path text NOT NULL,
  file_name text NOT NULL,
  notes text,
  created_by_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (rfq_id, version)
);

CREATE INDEX IF NOT EXISTS rfq_quote_versions_rfq_idx ON rfq_quote_versions(rfq_id, version DESC);

ALTER TABLE rfq_quote_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rfq_quote_versions_select ON rfq_quote_versions;
CREATE POLICY rfq_quote_versions_select ON rfq_quote_versions
  FOR SELECT USING (
    is_staff()
    OR EXISTS (
      SELECT 1 FROM rfq_requests r
      WHERE r.id = rfq_quote_versions.rfq_id AND r.customer_id = get_customer_id()
    )
  );

DROP POLICY IF EXISTS rfq_quote_versions_insert ON rfq_quote_versions;
CREATE POLICY rfq_quote_versions_insert ON rfq_quote_versions
  FOR INSERT WITH CHECK (is_staff());

CREATE TABLE IF NOT EXISTS traceability_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  link_type text NOT NULL,
  heat_number text,
  wps_ref text,
  batch_ref text,
  ndt_record_id uuid REFERENCES ndt_records(id) ON DELETE SET NULL,
  shipment_id uuid REFERENCES shipments(id) ON DELETE SET NULL,
  stage_number int,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS traceability_links_order_idx ON traceability_links(order_id, created_at);

ALTER TABLE traceability_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS traceability_links_select ON traceability_links;
CREATE POLICY traceability_links_select ON traceability_links
  FOR SELECT USING (
    is_staff()
    OR EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = traceability_links.order_id AND o.customer_id = get_customer_id()
    )
  );

DROP POLICY IF EXISTS traceability_links_write ON traceability_links;
CREATE POLICY traceability_links_write ON traceability_links
  FOR ALL USING (is_staff()) WITH CHECK (is_staff());

ALTER TABLE orders ADD COLUMN IF NOT EXISTS traceability_token text UNIQUE;

ALTER TABLE shipments
  ADD COLUMN IF NOT EXISTS asn_number text,
  ADD COLUMN IF NOT EXISTS package_count int,
  ADD COLUMN IF NOT EXISTS total_weight_kg numeric,
  ADD COLUMN IF NOT EXISTS delivery_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivery_confirmed_by text;

ALTER TABLE staff_profiles
  ADD COLUMN IF NOT EXISTS staff_role staff_role NOT NULL DEFAULT 'operations';

CREATE TABLE IF NOT EXISTS notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid NOT NULL,
  user_type text NOT NULL,
  notification_type notification_type NOT NULL,
  email_enabled boolean NOT NULL DEFAULT true,
  in_app_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (auth_user_id, notification_type)
);

CREATE INDEX IF NOT EXISTS notification_preferences_user_idx
  ON notification_preferences(auth_user_id);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notification_preferences_all ON notification_preferences;
CREATE POLICY notification_preferences_all ON notification_preferences
  FOR ALL USING (auth_user_id = auth.uid()) WITH CHECK (auth_user_id = auth.uid());

-- Backfill traceability tokens for existing orders
UPDATE orders
SET traceability_token = encode(gen_random_bytes(12), 'hex')
WHERE traceability_token IS NULL;
