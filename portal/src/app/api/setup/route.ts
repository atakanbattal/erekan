import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: 'Service role key not configured' },
      { status: 500 }
    );
  }

  const admin = createAdminClient();

  const { count } = await admin
    .from('staff_profiles')
    .select('*', { count: 'exact', head: true });

  if (count && count > 0) {
    return NextResponse.json({ error: 'Setup already completed' }, { status: 400 });
  }

  const body = await request.json();
  const fullName = body.full_name || 'Admin';
  const email = body.email;

  if (!email) {
    return NextResponse.json({ error: 'Email required' }, { status: 400 });
  }

  const { data: users } = await admin.auth.admin.listUsers();
  const user = users?.users?.find((u) => u.email === email);

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  await admin.auth.admin.updateUserById(user.id, { email_confirm: true });

  const { error } = await admin.from('staff_profiles').insert({
    auth_user_id: user.id,
    full_name: fullName,
    role: 'admin',
    is_admin: true,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
