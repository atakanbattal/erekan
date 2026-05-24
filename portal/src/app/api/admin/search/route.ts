import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: staff } = await supabase
    .from('staff_profiles')
    .select('is_admin')
    .eq('auth_user_id', user.id)
    .single();

  if (!staff?.is_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim().toLowerCase() ?? '';

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const [{ data: orders }, { data: customers }, { data: messages }] = await Promise.all([
    supabase
      .from('orders')
      .select('id, job_number, title, material, status, customers(company_name)')
      .or(`job_number.ilike.%${q}%,title.ilike.%${q}%,material.ilike.%${q}%`)
      .limit(8),
    supabase
      .from('customers')
      .select('id, company_name, contact_name, email')
      .or(`company_name.ilike.%${q}%,contact_name.ilike.%${q}%,email.ilike.%${q}%`)
      .limit(5),
    supabase
      .from('portal_messages')
      .select('thread_id, subject, body, customers(company_name)')
      .or(`subject.ilike.%${q}%,body.ilike.%${q}%`)
      .limit(5),
  ]);

  const results = [
    ...(orders ?? []).map((o) => ({
      type: 'order' as const,
      id: o.id,
      title: o.job_number,
      subtitle: `${o.title} — ${(o.customers as unknown as { company_name: string } | null)?.company_name ?? ''}`,
      href: `/admin/orders/${o.id}`,
    })),
    ...(customers ?? []).map((c) => ({
      type: 'customer' as const,
      id: c.id,
      title: c.company_name,
      subtitle: c.contact_name ?? c.email,
      href: `/admin/customers/${c.id}`,
    })),
    ...(messages ?? []).map((m) => ({
      type: 'message' as const,
      id: m.thread_id,
      title: m.subject,
      subtitle: (m.customers as unknown as { company_name: string } | null)?.company_name ?? '',
      href: '/admin/messages',
    })),
  ];

  return NextResponse.json({ results: results.slice(0, 12) });
}
