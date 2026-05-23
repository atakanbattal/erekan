import { createClient } from '@/lib/supabase/server';
import { getServerI18n } from '@/lib/i18n/server';
import { Building2, Mail, Phone, User } from 'lucide-react';

export default async function CompanyPage() {
  const { t } = await getServerI18n();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: customer } = await supabase
    .from('customers')
    .select('*')
    .eq('auth_user_id', user!.id)
    .single();

  const fields = [
    {
      icon: Building2,
      label: t('common.company'),
      value: customer?.company_name,
    },
    {
      icon: User,
      label: t('companyPage.contactPerson'),
      value: customer?.contact_name,
    },
    {
      icon: Mail,
      label: t('companyPage.email'),
      value: customer?.email,
    },
    {
      icon: Phone,
      label: t('companyPage.phone'),
      value: customer?.phone,
    },
  ];

  return (
    <div className="portal-page max-w-2xl">
      <div className="portal-page-header">
        <h1 className="portal-page-title">{t('companyPage.title')}</h1>
        <p className="portal-page-subtitle">{t('companyPage.subtitle')}</p>
      </div>

      <div className="card p-6 space-y-5">
        {fields.map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-ink-2 flex items-center justify-center shrink-0">
              <Icon size={18} className="text-arc-2" />
            </div>
            <div>
              <div className="label">{label}</div>
              <div className="text-bone font-medium">{value || '—'}</div>
            </div>
          </div>
        ))}

        <div className="pt-4 border-t border-ink-4 flex items-center justify-between">
          <span className="label">{t('companyPage.accountStatus')}</span>
          <span
            className={`text-sm font-semibold px-2.5 py-1 rounded-full ${
              customer?.is_active
                ? 'bg-success/10 text-success'
                : 'bg-danger/10 text-danger'
            }`}
          >
            {customer?.is_active ? t('common.active') : t('common.inactive')}
          </span>
        </div>
      </div>
    </div>
  );
}
