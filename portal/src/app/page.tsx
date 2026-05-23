import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: staff } = await supabase
    .from('staff_profiles')
    .select('is_admin')
    .eq('auth_user_id', user.id)
    .single();

  redirect(staff?.is_admin ? '/admin' : '/dashboard');
}
