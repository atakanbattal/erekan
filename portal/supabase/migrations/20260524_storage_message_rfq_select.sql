-- Allow customers to read message and RFQ attachment files they own
CREATE POLICY storage_select_message_rfq ON storage.objects
  FOR SELECT USING (
    bucket_id = 'order-documents'
    AND (
      is_staff()
      OR EXISTS (
        SELECT 1 FROM portal_message_attachments a
        JOIN portal_messages m ON m.id = a.message_id
        WHERE a.file_path = objects.name
          AND m.customer_id = get_customer_id()
      )
      OR EXISTS (
        SELECT 1 FROM rfq_attachments a
        JOIN rfq_requests r ON r.id = a.rfq_id
        WHERE a.file_path = objects.name
          AND r.customer_id = get_customer_id()
      )
      OR EXISTS (
        SELECT 1 FROM rfq_requests r
        WHERE r.quote_file_path = objects.name
          AND r.customer_id = get_customer_id()
      )
    )
  );
