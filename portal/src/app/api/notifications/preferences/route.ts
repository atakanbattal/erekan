import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { NotificationType } from '@/lib/stages';

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('auth_user_id', user.id);

  return NextResponse.json({ preferences: data ?? [] });
}

export async function PUT(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const notificationType = body.notificationType as NotificationType;
  const emailEnabled = body.email_enabled as boolean | undefined;
  const inAppEnabled = body.in_app_enabled as boolean | undefined;

  if (!notificationType) {
    return NextResponse.json({ error: 'Missing type' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from('notification_preferences')
    .select('*')
    .eq('auth_user_id', user.id)
    .eq('notification_type', notificationType)
    .maybeSingle();

  const payload = {
    auth_user_id: user.id,
    user_type: 'customer',
    notification_type: notificationType,
    email_enabled: emailEnabled ?? existing?.email_enabled ?? true,
    in_app_enabled: inAppEnabled ?? existing?.in_app_enabled ?? true,
  };

  const { data, error } = existing
    ? await admin
        .from('notification_preferences')
        .update(payload)
        .eq('id', existing.id)
        .select('*')
        .single()
    : await admin.from('notification_preferences').insert(payload).select('*').single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ preference: data });
}
