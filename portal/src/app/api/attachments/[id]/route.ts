import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { mimeFromFileName } from '@/lib/documents';

interface RouteProps {
  params: Promise<{ id: string }>;
}

type AttachmentRecord = {
  id: string;
  file_path: string;
  file_name: string;
  mime_type: string | null;
};

function readCustomerId(relation: { customer_id: string } | { customer_id: string }[] | null) {
  if (!relation) return null;
  return Array.isArray(relation) ? relation[0]?.customer_id ?? null : relation.customer_id;
}

async function resolveAttachment(
  id: string,
  supabase: Awaited<ReturnType<typeof createClient>>
) {
  const { data: messageAttachment } = await supabase
    .from('portal_message_attachments')
    .select('id, file_path, file_name, mime_type, message:portal_messages(customer_id)')
    .eq('id', id)
    .maybeSingle();

  if (messageAttachment) {
    return {
      attachment: messageAttachment as AttachmentRecord,
      customerId: readCustomerId(
        messageAttachment.message as { customer_id: string } | { customer_id: string }[] | null
      ),
    };
  }

  const { data: rfqAttachment } = await supabase
    .from('rfq_attachments')
    .select('id, file_path, file_name, mime_type, rfq:rfq_requests(customer_id)')
    .eq('id', id)
    .maybeSingle();

  if (rfqAttachment) {
    return {
      attachment: rfqAttachment as AttachmentRecord,
      customerId: readCustomerId(
        rfqAttachment.rfq as { customer_id: string } | { customer_id: string }[] | null
      ),
    };
  }

  return null;
}

async function authorize(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const resolved = await resolveAttachment(id, supabase);
  if (!resolved?.customerId) {
    return { error: NextResponse.json({ error: 'Not found' }, { status: 404 }) };
  }

  const [{ data: staff }, { data: customerId }] = await Promise.all([
    supabase
      .from('staff_profiles')
      .select('is_admin')
      .eq('auth_user_id', user.id)
      .maybeSingle(),
    supabase.rpc('get_customer_id'),
  ]);

  const isStaff = !!staff?.is_admin;
  const isOwner = customerId === resolved.customerId;

  if (!isStaff && !isOwner) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { attachment: resolved.attachment };
}

export async function GET(request: Request, { params }: RouteProps) {
  const { id } = await params;
  const auth = await authorize(id);
  if ('error' in auth && auth.error) return auth.error;

  const attachment = auth.attachment!;
  const inline = new URL(request.url).searchParams.get('inline') === '1';

  const storageClient = process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createAdminClient()
    : await createClient();

  if (inline) {
    const { data: fileData, error } = await storageClient.storage
      .from('order-documents')
      .download(attachment.file_path);

    if (error || !fileData) {
      return NextResponse.json({ error: error?.message ?? 'Dosya alınamadı' }, { status: 500 });
    }

    const mime = attachment.mime_type || mimeFromFileName(attachment.file_name);
    const buffer = await fileData.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': mime,
        'Content-Disposition': `inline; filename="${encodeURIComponent(attachment.file_name)}"`,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  }

  const { data, error } = await storageClient.storage
    .from('order-documents')
    .createSignedUrl(attachment.file_path, 3600);

  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: error?.message ?? 'URL oluşturulamadı' }, { status: 500 });
  }

  return NextResponse.json({
    url: data.signedUrl,
    name: attachment.file_name,
    mime_type: attachment.mime_type || mimeFromFileName(attachment.file_name),
  });
}
