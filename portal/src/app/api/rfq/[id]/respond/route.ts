import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/portal/audit-log';
import { notifyAdmin } from '@/lib/portal/notifications';

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

  const body = await request.json();
  const response = body.response as 'approved' | 'rejected' | 'revision';
  const note = body.note as string | null;
  const responderName = body.responderName as string;

  if (!['approved', 'rejected', 'revision'].includes(response)) {
    return NextResponse.json({ error: 'Invalid response' }, { status: 400 });
  }

  const { data: rfq } = await supabase
    .from('rfq_requests')
    .select('id, customer_id, title, status, quote_file_path')
    .eq('id', rfqId)
    .single();

  if (!rfq || rfq.status !== 'quoted' || !rfq.quote_file_path) {
    return NextResponse.json({ error: 'RFQ not available for response' }, { status: 400 });
  }

  const newStatus =
    response === 'approved' ? 'approved' : response === 'rejected' ? 'rejected' : 'reviewing';

  const admin = createAdminClient();
  const { error } = await admin
    .from('rfq_requests')
    .update({
      status: newStatus,
      customer_response_note: note,
      responded_at: new Date().toISOString(),
      responded_by_name: responderName,
      updated_at: new Date().toISOString(),
    })
    .eq('id', rfqId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await writeAuditLog({
    actorType: 'customer',
    actorId: user.id,
    actorName: responderName,
    entityType: 'rfq',
    entityId: rfqId,
    action: `rfq_${response}`,
    details: { note, title: rfq.title },
  });

  if (response === 'approved') {
    await notifyAdmin({
      customerId: rfq.customer_id,
      type: 'rfq_approved',
      title: `Teklif onaylandı: ${rfq.title}`,
      body: note ?? rfq.title,
      link: '/admin/rfq',
    });
  } else if (response === 'rejected') {
    await notifyAdmin({
      customerId: rfq.customer_id,
      type: 'rfq_rejected',
      title: `Teklif reddedildi: ${rfq.title}`,
      body: note ?? rfq.title,
      link: '/admin/rfq',
    });
  } else {
    await notifyAdmin({
      customerId: rfq.customer_id,
      type: 'action_required',
      title: `Revizyon talebi: ${rfq.title}`,
      body: note ?? 'Müşteri revizyon istedi.',
      link: '/admin/rfq',
    });
  }

  return NextResponse.json({ ok: true, status: newStatus });
}
