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
  const caseId = body.caseId as string;
  const caseNumber = body.caseNumber as string;
  const updated = body.updated === true;

  const admin = createAdminClient();
  const { data: serviceCase } = await admin
    .from('service_cases')
    .select('customer_id, subject')
    .eq('id', caseId)
    .single();

  if (!serviceCase) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (updated) {
    await admin.from('portal_notifications').insert({
      audience: 'customer',
      customer_id: serviceCase.customer_id,
      type: 'service_case_updated',
      title: `Servis vakası güncellendi: ${caseNumber}`,
      body: serviceCase.subject,
      link: `/aftermarket/service/${caseId}`,
    });
  } else {
    await admin.from('portal_notifications').insert({
      audience: 'admin',
      customer_id: serviceCase.customer_id,
      type: 'service_case_submitted',
      title: `Yeni servis talebi: ${caseNumber}`,
      body: serviceCase.subject,
      link: `/admin/aftermarket/service/${caseId}`,
    });
  }

  return NextResponse.json({ ok: true });
}
