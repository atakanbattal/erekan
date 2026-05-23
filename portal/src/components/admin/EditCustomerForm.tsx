'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { Customer } from '@/lib/types';
import { useI18n } from '@/lib/i18n/context';

interface EditCustomerFormProps {
  customer: Customer;
}

export function EditCustomerForm({ customer }: EditCustomerFormProps) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    const form = new FormData(e.currentTarget);

    const { error: rpcError } = await supabase.rpc('update_customer', {
      p_customer_id: customer.id,
      p_company_name: form.get('company_name') as string,
      p_contact_name: (form.get('contact_name') as string) || null,
      p_email: form.get('email') as string,
      p_phone: (form.get('phone') as string) || null,
      p_is_active: form.get('is_active') === 'on',
    });

    if (rpcError) {
      setError(rpcError.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="card p-6 space-y-4 max-w-2xl">
      {error && (
        <div className="p-3 rounded bg-danger/10 border border-danger/30 text-danger text-sm">{error}</div>
      )}
      {success && (
        <div className="p-3 rounded bg-success/10 border border-success/30 text-success text-sm">
          {t('forms.customerUpdated')}
        </div>
      )}

      <div>
        <label className="label">{t('forms.companyName')}</label>
        <input name="company_name" className="input" defaultValue={customer.company_name} required />
      </div>

      <div>
        <label className="label">{t('forms.contactName')}</label>
        <input name="contact_name" className="input" defaultValue={customer.contact_name ?? ''} />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label">{t('forms.emailRequired')}</label>
          <input name="email" type="email" className="input" defaultValue={customer.email} required />
        </div>
        <div>
          <label className="label">{t('forms.phone')}</label>
          <input name="phone" type="tel" className="input" defaultValue={customer.phone ?? ''} />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input type="checkbox" name="is_active" defaultChecked={customer.is_active} />
        {t('forms.accountActive')}
      </label>

      <div className="flex gap-3 pt-2">
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? t('common.saving') : t('forms.saveChanges')}
        </button>
        <Link href="/admin/customers" className="btn-secondary">{t('forms.back')}</Link>
      </div>
    </form>
  );
}
