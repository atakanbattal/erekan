import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { notifyAdmin } from '@/lib/portal/notifications';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const { id: orderId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const customerId = (await supabase.rpc('get_customer_id')).data;
  if (!customerId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data: order } = await supabase
    .from('orders')
    .select('id, customer_id, job_number, title')
    .eq('id', orderId)
    .eq('customer_id', customerId)
    .single();

  if (!order) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const docType = (formData.get('document_type') as string) || 'other';
  const description = (formData.get('description') as string) || null;

  if (!file) {
    return NextResponse.json({ error: 'No file' }, { status: 400 });
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filePath = `${orderId}/customer/${Date.now()}_${safeName}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: uploadError } = await supabase.storage
    .from('order-documents')
    .upload(filePath, buffer, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const displayName = `${order.job_number}_${safeName}`;

  const { error: dbError } = await supabase.from('order_documents').insert({
    order_id: orderId,
    stage_id: null,
    name: displayName,
    document_type: docType,
    file_path: filePath,
    file_size: file.size,
    mime_type: file.type || 'application/octet-stream',
    description,
    uploaded_by: user.id,
    uploader_type: 'customer',
    is_visible_to_customer: true,
  });

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  await supabase.from('order_activity').insert({
    order_id: orderId,
    action: 'document_uploaded',
    description: `Müşteri dosya yükledi — ${displayName}`,
    actor_name: user.email,
    actor_role: 'customer',
  });

  await notifyAdmin({
    customerId,
    orderId,
    type: 'document_uploaded',
    title: `Müşteri dosya yükledi: ${order.job_number}`,
    body: displayName,
    link: `/admin/orders/${orderId}`,
  });

  return NextResponse.json({ ok: true });
}
