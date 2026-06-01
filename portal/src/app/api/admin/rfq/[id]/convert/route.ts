import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/portal/audit-log';
import { notifyCustomer } from '@/lib/portal/notifications';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, { params }: RouteParams) {
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
    .select('is_admin, full_name')
    .eq('auth_user_id', user.id)
    .single();

  if (!staff?.is_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data: rfq } = await supabase
    .from('rfq_requests')
    .select('*, customers(email, company_name)')
    .eq('id', rfqId)
    .single();

  if (!rfq) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (rfq.status !== 'approved') {
    return NextResponse.json({ error: 'RFQ must be approved first' }, { status: 400 });
  }

  if (rfq.converted_order_id) {
    return NextResponse.json({ error: 'Already converted', orderId: rfq.converted_order_id }, { status: 409 });
  }

  const admin = createAdminClient();
  const { data: jobNumber, error: rpcError } = await admin.rpc('generate_job_number');

  if (rpcError || !jobNumber) {
    return NextResponse.json({ error: rpcError?.message ?? 'Job number failed' }, { status: 500 });
  }

  const { data: order, error: orderError } = await admin
    .from('orders')
    .insert({
      customer_id: rfq.customer_id,
      job_number: jobNumber,
      title: rfq.title,
      description: rfq.description,
      material: rfq.material,
      quantity: rfq.quantity,
      standard: rfq.standard,
      status: 'active',
      current_stage: 1,
      expected_delivery: rfq.deadline,
      traceability_token: crypto.randomUUID().replace(/-/g, '').slice(0, 24),
    })
    .select('id, job_number')
    .single();

  if (orderError || !order) {
    return NextResponse.json({ error: orderError?.message ?? 'Order create failed' }, { status: 500 });
  }

  await admin
    .from('rfq_requests')
    .update({
      status: 'converted',
      converted_order_id: order.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', rfqId);

  await admin.from('order_activity').insert({
    order_id: order.id,
    action: 'order_created',
    description: `RFQ'dan siparişe dönüştürüldü: ${order.job_number} — ${rfq.title}`,
    actor_name: staff.full_name,
  });

  await writeAuditLog({
    actorType: 'staff',
    actorId: user.id,
    actorName: staff.full_name,
    entityType: 'rfq',
    entityId: rfqId,
    action: 'rfq_converted',
    details: { orderId: order.id, jobNumber: order.job_number },
  });

  const customerEmail = (rfq.customers as { email?: string } | null)?.email;
  await notifyCustomer({
    customerId: rfq.customer_id,
    customerEmail,
    orderId: order.id,
    type: 'stage_changed',
    title: `Siparişiniz oluşturuldu: ${order.job_number}`,
    body: rfq.title,
    link: `/orders/${order.id}`,
  });

  return NextResponse.json({ ok: true, orderId: order.id, jobNumber: order.job_number });
}
