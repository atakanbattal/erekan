import { redirect } from 'next/navigation';
import { format } from 'date-fns';
import { createClient } from '@/lib/supabase/server';
import { getServerI18n } from '@/lib/i18n/server';
import type { AuditLogEntry } from '@/lib/portal/types-ext';

export default async function AdminAuditPage() {
  const { t, dateLocale } = await getServerI18n();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: staff } = await supabase
    .from('staff_profiles')
    .select('is_admin')
    .eq('auth_user_id', user.id)
    .single();

  if (!staff?.is_admin) redirect('/dashboard');

  const { data: logs } = await supabase
    .from('audit_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);

  const entries = (logs ?? []) as AuditLogEntry[];

  return (
    <div className="portal-page">
      <div className="portal-page-header">
        <h1 className="portal-page-title">{t('auditPage.title')}</h1>
        <p className="portal-page-subtitle">{t('auditPage.subtitle')}</p>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-ink-4 bg-ink-3">
                <th className="text-left p-4 table-head">{t('auditPage.when')}</th>
                <th className="text-left p-4 table-head">{t('auditPage.actor')}</th>
                <th className="text-left p-4 table-head">{t('auditPage.entity')}</th>
                <th className="text-left p-4 table-head">{t('auditPage.action')}</th>
              </tr>
            </thead>
            <tbody>
              {!entries.length ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-steel-2">
                    {t('auditPage.empty')}
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr key={entry.id} className="border-b border-ink-4">
                    <td className="p-4 text-steel-2 whitespace-nowrap">
                      {format(new Date(entry.created_at), 'd MMM yyyy HH:mm', { locale: dateLocale })}
                    </td>
                    <td className="p-4 text-bone">
                      {entry.actor_name ?? entry.actor_type}
                    </td>
                    <td className="p-4 text-steel-2 font-mono text-xs">
                      {entry.entity_type}
                      {entry.entity_id ? ` · ${entry.entity_id.slice(0, 8)}` : ''}
                    </td>
                    <td className="p-4 text-steel-2">{entry.action}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
