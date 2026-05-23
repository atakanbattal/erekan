import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Plus, Pencil } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getServerI18n } from '@/lib/i18n/server';
import type { Customer } from '@/lib/types';

export default async function AdminCustomersPage() {
  const { t } = await getServerI18n();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: staff } = await supabase
    .from('staff_profiles')
    .select('is_admin, full_name')
    .eq('auth_user_id', user.id)
    .single();

  if (!staff?.is_admin) redirect('/dashboard');

  const { data: customers } = await supabase
    .from('customers')
    .select('*')
    .order('company_name');

  return (
    <div className="portal-page">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="eyebrow mb-2">{t('common.admin')}</div>
            <h1 className="text-2xl font-black text-bone">{t('admin.customersTitle')}</h1>
          </div>
          <Link href="/admin/customers/new" className="btn-primary flex items-center gap-2">
            <Plus size={18} /> {t('admin.newCustomer')}
          </Link>
        </div>

        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm table-fixed border-collapse">
              <thead>
                <tr className="border-b border-ink-4 bg-ink-3">
                  <th className="text-left p-4 table-head">{t('admin.company')}</th>
                  <th className="text-left p-4 table-head">{t('admin.contactPerson')}</th>
                  <th className="text-left p-4 table-head">{t('admin.email')}</th>
                  <th className="text-left p-4 table-head">{t('admin.phone')}</th>
                  <th className="text-left p-4 table-head">{t('common.status')}</th>
                  <th className="text-right p-4 table-head">{t('admin.action')}</th>
                </tr>
              </thead>
              <tbody>
                {!customers?.length ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-steel-2">
                      {t('admin.noCustomers')}
                    </td>
                  </tr>
                ) : (
                  (customers as Customer[]).map((c) => (
                    <tr
                      key={c.id}
                      className="border-b border-ink-4 hover:bg-ink-3/30 transition-colors"
                    >
                      <td className="p-4 font-medium text-bone">{c.company_name}</td>
                      <td className="p-4 text-steel-3">{c.contact_name ?? '—'}</td>
                      <td className="p-4 text-steel-3">{c.email}</td>
                      <td className="p-4 text-steel-3">{c.phone ?? '—'}</td>
                      <td className="p-4">
                        <span
                          className={`text-xs font-mono uppercase ${
                            c.is_active ? 'text-success' : 'text-steel-2'
                          }`}
                        >
                          {c.is_active ? t('common.active') : t('common.inactive')}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <Link
                          href={`/admin/customers/${c.id}`}
                          className="inline-flex items-center gap-1.5 text-sm text-arc-2 hover:text-arc-1 transition-colors"
                        >
                          <Pencil size={14} /> {t('common.edit')}
                        </Link>
                      </td>
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
