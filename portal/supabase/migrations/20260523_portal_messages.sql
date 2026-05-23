-- Customer-admin messaging for portal
CREATE TYPE message_category AS ENUM ('general', 'support', 'order');
CREATE TYPE message_sender AS ENUM ('customer', 'admin');

CREATE TABLE portal_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  thread_id uuid NOT NULL,
  category message_category NOT NULL DEFAULT 'general',
  subject text NOT NULL,
  body text NOT NULL,
  sender_type message_sender NOT NULL,
  sender_name text,
  is_read_by_admin boolean NOT NULL DEFAULT false,
  is_read_by_customer boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX portal_messages_customer_id_idx ON portal_messages(customer_id);
CREATE INDEX portal_messages_thread_id_idx ON portal_messages(thread_id);
CREATE INDEX portal_messages_order_id_idx ON portal_messages(order_id);

ALTER TABLE portal_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY messages_select ON portal_messages
  FOR SELECT USING (customer_id = get_customer_id() OR is_staff());

CREATE POLICY messages_insert ON portal_messages
  FOR INSERT WITH CHECK (
    (customer_id = get_customer_id() AND sender_type = 'customer')
    OR (is_staff() AND sender_type = 'admin')
  );

CREATE POLICY messages_update ON portal_messages
  FOR UPDATE
  USING (customer_id = get_customer_id() OR is_staff())
  WITH CHECK (customer_id = get_customer_id() OR is_staff());
