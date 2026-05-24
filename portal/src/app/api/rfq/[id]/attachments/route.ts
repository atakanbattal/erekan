import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

interface RouteParams {
  params: Promise<{ id: string }>;
}

const MAX_FILE_SIZE = 20 * 1024 * 1024;

export async function POST(request: Request, { params }: RouteParams) {
  const { id: rfqId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const customerId = (await supabase.rpc('get_customer_id')).data;
  const { data: staff } = await supabase
    .from('staff_profiles')
    .select('is_admin')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  const isStaff = !!staff?.is_admin;

  const { data: rfq } = await supabase
    .from('rfq_requests')
    .select('id, customer_id')
    .eq('id', rfqId)
    .single();

  if (!rfq) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (!isStaff && rfq.customer_id !== customerId) {
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
  const uploader = isStaff ? 'admin' : 'customer';
  const filePath = `rfq/${rfqId}/${uploader}/${Date.now()}_${safeName}`;
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
    .from('rfq_attachments')
    .insert({
      rfq_id: rfqId,
      file_path: filePath,
      file_name: file.name,
      mime_type: contentType,
      file_size: file.size,
      uploaded_by: uploader,
    })
    .select('id, file_name, mime_type, file_size, uploaded_by')
    .single();

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, attachment });
}
