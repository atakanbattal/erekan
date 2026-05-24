import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { CustomerUserRole } from '@/lib/stages';

function generateTempPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$';
  let password = '';
  for (let i = 0; i < 14; i += 1) {
    password += chars[Math.floor(Math.random() * chars.length)];
  }
  return password;
}

async function resolveInviteCustomerId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  requestedCustomerId?: string | null
) {
  const { data: staff } = await supabase
    .from('staff_profiles')
    .select('is_admin')
    .eq('auth_user_id', userId)
    .single();

  if (staff?.is_admin) {
    if (!requestedCustomerId) return null;
    return requestedCustomerId;
  }

  const { data: owner } = await supabase
    .from('customers')
    .select('id')
    .eq('auth_user_id', userId)
    .single();

  if (owner) return owner.id;

  return null;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const {
    email,
    full_name,
    role,
    customer_id: requestedCustomerId,
  } = body as {
    email?: string;
    full_name?: string;
    role?: CustomerUserRole;
    customer_id?: string;
  };

  if (!email?.trim() || !full_name?.trim()) {
    return NextResponse.json({ error: 'Email and full_name are required' }, { status: 400 });
  }

  const customerId = await resolveInviteCustomerId(supabase, user.id, requestedCustomerId);
  if (!customerId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const validRoles: CustomerUserRole[] = ['admin', 'quality', 'procurement', 'viewer'];
  const inviteRole: CustomerUserRole = validRoles.includes(role as CustomerUserRole)
    ? (role as CustomerUserRole)
    : 'viewer';

  const tempPassword = generateTempPassword();
  const admin = createAdminClient();

  const { data: authUser, error: authError } = await admin.auth.admin.createUser({
    email: email.trim(),
    password: tempPassword,
    email_confirm: true,
    user_metadata: { full_name: full_name.trim() },
  });

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 });
  }

  const { error: insertError } = await admin.from('customer_users').insert({
    customer_id: customerId,
    auth_user_id: authUser.user.id,
    full_name: full_name.trim(),
    email: email.trim(),
    role: inviteRole,
    is_active: true,
  });

  if (insertError) {
    await admin.auth.admin.deleteUser(authUser.user.id);
    return NextResponse.json({ error: insertError.message }, { status: 400 });
  }

  return NextResponse.json({ success: true, tempPassword });
}
