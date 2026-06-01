import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { notifyCustomer } from '@/lib/portal/notifications';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: orderId } = await params;
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

  const body = await request.json();
  const stageTitle = body.stageTitle as string;
  const stageNumber = body.stageNumber as number;

  const { data: order } = await supabase
    .from('orders')
    .select('id, customer_id, job_number, title, customers(email)')
    .eq('id', orderId)
    .single();

  if (!order) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const customerEmail = (order.customers as { email?: string } | null)?.email;

  await notifyCustomer({
    customerId: order.customer_id,
    customerEmail,
    orderId: order.id,
    type: 'stage_changed',
    title: `${order.job_number}: ${stageTitle}`,
    body: `Aşama ${stageNumber}/7 güncellendi.`,
    link: `/orders/${order.id}`,
  });

  return NextResponse.json({ ok: true });
}
