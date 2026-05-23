ALTER TABLE public.order_documents
  ADD COLUMN IF NOT EXISTS description text;

COMMENT ON COLUMN public.order_documents.description IS 'Optional note shown to customer with the file';
