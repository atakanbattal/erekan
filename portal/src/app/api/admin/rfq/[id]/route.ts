import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { RfqStatus } from '@/lib/stages';

interface RouteParams {
  params: Promise<{ id: string }>;
}

const ALLOWED_STATUSES: RfqStatus[] = [
  'submitted',
  'reviewing',
  'quoted',
  'approved',
  'rejected',
  'converted',
];

async function authorizeAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const { data: staff } = await supabase
    .from('staff_profiles')
    .select('is_admin')
    .eq('auth_user_id', user.id)
    .single();

  if (!staff?.is_admin) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { supabase };
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const auth = await authorizeAdmin();
  if ('error' in auth && auth.error) return auth.error;

  const body = (await request.json()) as {
    status?: RfqStatus;
    admin_notes?: string | null;
  };

  const updates: { status?: RfqStatus; admin_notes?: string | null; updated_at: string } = {
    updated_at: new Date().toISOString(),
  };

  if (body.status !== undefined) {
    if (!ALLOWED_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }
    updates.status = body.status;
  }

  if (body.admin_notes !== undefined) {
    updates.admin_notes = body.admin_notes;
  }

  if (Object.keys(updates).length === 1) {
    return NextResponse.json({ error: 'No changes' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('rfq_requests')
    .update(updates)
    .eq('id', id)
    .select('id, status, admin_notes')
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Update failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, rfq: data });
}
