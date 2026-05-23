import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Header } from '@/components/Header';
import { AdminMessageInbox } from '@/components/admin/AdminMessageInbox';
import { getServerI18n } from '@/lib/i18n/server';
import type { PortalMessage } from '@/lib/types';

export default async function AdminMessagesPage() {
  const { t } = await getServerI18n();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: staff } = await supabase
    .from('staff_profiles')
    .select('*')
    .eq('auth_user_id', user.id)
    .single();

  if (!staff?.is_admin) redirect('/dashboard');

  const { data: messages } = await supabase
    .from('portal_messages')
    .select('*, customers(company_name, contact_name, email), orders(job_number, title)')
    .order('created_at', { ascending: false });

  const { count: unreadCount } = await supabase
    .from('portal_messages')
    .select('*', { count: 'exact', head: true })
    .eq('sender_type', 'customer')
    .eq('is_read_by_admin', false);

  return (
    <>
      <Header isAdmin userName={staff.full_name} />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="eyebrow">{t('admin.panelEyebrow')}</div>
            {(unreadCount ?? 0) > 0 && (
              <span className="portal-sidebar-badge">{unreadCount}</span>
            )}
          </div>
          <h1 className="text-3xl font-black text-bone">{t('messages.adminInbox')}</h1>
          <p className="text-steel-2 mt-1">{t('messages.adminInboxDesc')}</p>
        </div>

        <AdminMessageInbox
          threads={(messages ?? []) as PortalMessage[]}
          staffName={staff.full_name}
        />
      </main>
    </>
  );
}
