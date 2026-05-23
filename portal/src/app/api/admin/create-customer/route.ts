import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
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
  const { email, password, company_name, contact_name, phone } = body;

  const { data: userId, error } = await supabase.rpc('create_customer_account', {
    p_email: email,
    p_password: password,
    p_company_name: company_name,
    p_contact_name: contact_name || null,
    p_phone: phone || null,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true, userId });
}
