import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

interface RouteParams {
  params: Promise<{ messageId: string }>;
}

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

export async function POST(request: Request, { params }: RouteParams) {
  const { messageId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: message } = await supabase
    .from('portal_messages')
    .select('id, thread_id, customer_id, sender_type')
    .eq('id', messageId)
    .single();

  if (!message) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const customerId = (await supabase.rpc('get_customer_id')).data;
  const { data: staff } = await supabase
    .from('staff_profiles')
    .select('is_admin')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  const isStaff = !!staff?.is_admin;
  const isOwner =
    customerId === message.customer_id && message.sender_type === 'customer';

  if (!isStaff && !isOwner) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File | null;

  if (!file) {
    return NextResponse.json({ error: 'No file' }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'File too large (max 20 MB)' }, { status: 400 });
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filePath = `messages/${message.thread_id}/${messageId}/${Date.now()}_${safeName}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const contentType = file.type || 'application/octet-stream';

  const admin = createAdminClient();
  const { error: uploadError } = await admin.storage
    .from('order-documents')
    .upload(filePath, buffer, { contentType, upsert: false });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: attachment, error: dbError } = await supabase
    .from('portal_message_attachments')
    .insert({
      message_id: messageId,
      file_path: filePath,
      file_name: file.name,
      mime_type: contentType,
      file_size: file.size,
    })
    .select('id, file_name, mime_type, file_size')
    .single();

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, attachment });
}
