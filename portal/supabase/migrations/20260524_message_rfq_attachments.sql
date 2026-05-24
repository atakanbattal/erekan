-- Message and RFQ file attachments (realtime tables added idempotently)

CREATE TABLE IF NOT EXISTS portal_message_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES portal_messages(id) ON DELETE CASCADE,
  file_path text NOT NULL,
  file_name text NOT NULL,
  mime_type text,
  file_size bigint,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS portal_message_attachments_message_id_idx ON portal_message_attachments(message_id);

ALTER TABLE portal_message_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS message_attachments_select ON portal_message_attachments;
CREATE POLICY message_attachments_select ON portal_message_attachments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM portal_messages m
      WHERE m.id = message_id
        AND (m.customer_id = get_customer_id() OR is_staff())
    )
  );

DROP POLICY IF EXISTS message_attachments_insert ON portal_message_attachments;
CREATE POLICY message_attachments_insert ON portal_message_attachments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM portal_messages m
      WHERE m.id = message_id
        AND (
          (m.customer_id = get_customer_id() AND m.sender_type = 'customer')
          OR is_staff()
        )
    )
  );

CREATE TABLE IF NOT EXISTS rfq_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id uuid NOT NULL REFERENCES rfq_requests(id) ON DELETE CASCADE,
  file_path text NOT NULL,
  file_name text NOT NULL,
  mime_type text,
  file_size bigint,
  uploaded_by text NOT NULL CHECK (uploaded_by IN ('customer', 'admin')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rfq_attachments_rfq_id_idx ON rfq_attachments(rfq_id);

ALTER TABLE rfq_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rfq_attachments_select ON rfq_attachments;
CREATE POLICY rfq_attachments_select ON rfq_attachments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM rfq_requests r
      WHERE r.id = rfq_id
        AND (r.customer_id = get_customer_id() OR is_staff())
    )
  );

DROP POLICY IF EXISTS rfq_attachments_insert ON rfq_attachments;
CREATE POLICY rfq_attachments_insert ON rfq_attachments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM rfq_requests r
      WHERE r.id = rfq_id
        AND (
          (r.customer_id = get_customer_id() AND uploaded_by = 'customer')
          OR (is_staff() AND uploaded_by = 'admin')
        )
    )
  );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'portal_message_attachments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE portal_message_attachments;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'rfq_attachments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE rfq_attachments;
  END IF;
END $$;
