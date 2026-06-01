import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { notifyCustomer } from '@/lib/portal/notifications';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const { id: rfqId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: staff } = await supabase
    .from('staff_profiles')
    .select('is_admin')
    .eq('auth_user_id', user.id)
    .single();

  if (!staff?.is_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data: rfqFull } = await supabase
    .from('rfq_requests')
    .select('id, customer_id, title, quote_version, customers(email)')
    .eq('id', rfqId)
    .single();

  if (!rfqFull) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File | null;

  if (!file) {
    return NextResponse.json({ error: 'No file' }, { status: 400 });
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filePath = `rfq/${rfqId}/${Date.now()}_${safeName}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const admin = createAdminClient();
  const { error: uploadError } = await admin.storage
    .from('order-documents')
    .upload(filePath, buffer, {
      contentType: file.type || 'application/octet-stream',
      upsert: true,
    });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const nextVersion = (rfqFull.quote_version ?? 0) + 1;

  const { error: updateError } = await admin
    .from('rfq_requests')
    .update({
      quote_file_path: filePath,
      quote_file_name: file.name,
      status: 'quoted',
      quote_version: nextVersion,
      updated_at: new Date().toISOString(),
    })
    .eq('id', rfqId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  const customerEmail = (rfqFull.customers as { email?: string } | null)?.email;

  await notifyCustomer({
    customerId: rfqFull.customer_id,
    customerEmail,
    type: 'quote_ready',
    title: `Teklifiniz hazır: ${rfqFull.title}`,
    body: rfqFull.title,
    link: '/rfq',
  });

  await admin.from('rfq_quote_versions').insert({
    rfq_id: rfqId,
    version: nextVersion,
    file_path: filePath,
    file_name: file.name,
    created_by_name: user.email ?? 'Admin',
  });

  return NextResponse.json({
    ok: true,
    rfq: {
      id: rfqId,
      status: 'quoted',
      quote_file_path: filePath,
      quote_file_name: file.name,
      quote_version: nextVersion,
    },
  });
}
