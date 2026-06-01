import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/portal/audit-log';
import { notifyAdmin } from '@/lib/portal/notifications';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const { id: shipmentId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const confirmedBy = (body.confirmedBy as string) ?? 'Müşteri';

  const { data: shipment } = await supabase
    .from('shipments')
    .select('id, order_id, asn_number, orders(customer_id, job_number, title)')
    .eq('id', shipmentId)
    .single();

  if (!shipment) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const orderRaw = shipment.orders as
    | { customer_id: string; job_number: string; title: string }
    | { customer_id: string; job_number: string; title: string }[]
    | null;
  const order = Array.isArray(orderRaw) ? orderRaw[0] : orderRaw;

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from('shipments')
    .update({
      delivery_confirmed_at: new Date().toISOString(),
      delivery_confirmed_by: confirmedBy,
    })
    .eq('id', shipmentId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await admin.from('order_activity').insert({
    order_id: shipment.order_id,
    action: 'delivery_confirmed',
    description: `Teslimat onaylandı — ${shipment.asn_number ?? shipmentId}`,
    actor_name: confirmedBy,
  });

  await writeAuditLog({
    actorType: 'customer',
    actorId: user.id,
    actorName: confirmedBy,
    entityType: 'shipment',
    entityId: shipmentId,
    action: 'delivery_confirmed',
    details: { orderId: shipment.order_id },
  });

  await notifyAdmin({
    customerId: order.customer_id,
    orderId: shipment.order_id,
    type: 'delivery_confirmed',
    title: `Teslimat onaylandı: ${order.job_number}`,
    body: order.title,
    link: `/admin/orders/${shipment.order_id}`,
  });

  return NextResponse.json({ ok: true });
}
