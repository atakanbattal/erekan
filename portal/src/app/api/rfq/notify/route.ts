import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { notifyAdmin } from '@/lib/portal/notifications';

export async function POST(request: Request) {
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

  const body = await request.json();
  const { rfqId, title } = body as { rfqId?: string; title?: string };

  if (!rfqId || !title) {
    return NextResponse.json({ error: 'Missing rfqId or title' }, { status: 400 });
  }

  const { data: rfq } = await supabase
    .from('rfq_requests')
    .select('id, customer_id, title')
    .eq('id', rfqId)
    .eq('customer_id', customerId)
    .single();

  if (!rfq) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await notifyAdmin({
    customerId,
    type: 'rfq_submitted',
    title: `Yeni RFQ: ${title}`,
    body: title,
    link: '/admin/rfq',
  });

  return NextResponse.json({ ok: true });
}
