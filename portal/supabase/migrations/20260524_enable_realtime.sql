-- Enable Supabase Realtime for portal tables so mobile/web clients
-- receive live updates when admin changes orders, stages, documents, etc.

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'orders',
    'order_stages',
    'order_documents',
    'order_activity',
    'portal_messages',
    'portal_notifications',
    'ndt_records',
    'shipments',
    'rfq_requests',
    'customers',
    'customer_users'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;
