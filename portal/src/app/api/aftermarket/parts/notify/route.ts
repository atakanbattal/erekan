import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const requestId = body.requestId as string;
  const requestNumber = body.requestNumber as string;
  const quoted = body.quoted === true;

  const admin = createAdminClient();
  const { data: partReq } = await admin
    .from('spare_part_requests')
    .select('customer_id')
    .eq('id', requestId)
    .single();

  if (!partReq) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (quoted) {
    await admin.from('portal_notifications').insert({
      audience: 'customer',
      customer_id: partReq.customer_id,
      type: 'spare_part_quoted',
      title: `Yedek parça teklifi hazır: ${requestNumber}`,
      body: null,
      link: '/aftermarket/parts',
    });
  } else {
    await admin.from('portal_notifications').insert({
      audience: 'admin',
      customer_id: partReq.customer_id,
      type: 'action_required',
      title: `Yeni yedek parça talebi: ${requestNumber}`,
      body: null,
      link: '/admin/aftermarket/parts',
    });
  }

  return NextResponse.json({ ok: true });
}
