import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: req } = await supabase
    .from('spare_part_requests')
    .select('quote_file_path, customer_id')
    .eq('id', id)
    .single();

  if (!req?.quote_file_path) {
    return NextResponse.json({ error: 'No quote' }, { status: 404 });
  }

  const admin = createAdminClient();
  const { data } = await admin.storage.from('aftermarket-files').createSignedUrl(req.quote_file_path, 3600);

  if (!data?.signedUrl) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  return NextResponse.json({ url: data.signedUrl });
}
