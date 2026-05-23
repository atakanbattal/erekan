'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n/context';

export function NewCustomerForm() {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tempPassword, setTempPassword] = useState('');
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setTempPassword('');

    const form = new FormData(e.currentTarget);
    const email = form.get('email') as string;
    const password = form.get('password') as string;
    const companyName = form.get('company_name') as string;

    const res = await fetch('/api/admin/create-customer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        company_name: companyName,
        contact_name: (form.get('contact_name') as string) || null,
        phone: (form.get('phone') as string) || null,
      }),
    });

    const result = await res.json();

    if (!res.ok) {
      setError(result.error ?? t('forms.createCustomerFailed'));
      setLoading(false);
      return;
    }

    setTempPassword(password);
    router.push('/admin/customers');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="card p-6 space-y-4 max-w-2xl">
      {error && (
        <div className="p-3 rounded bg-danger/10 border border-danger/30 text-danger text-sm">
          {error}
        </div>
      )}

      {tempPassword && (
        <div className="p-3 rounded bg-success/10 border border-success/30 text-success text-sm">
          {t('forms.customerCreated')} <strong>{tempPassword}</strong>
        </div>
      )}

      <div>
        <label className="label">{t('forms.companyName')}</label>
        <input name="company_name" className="input" required />
      </div>

      <div>
        <label className="label">{t('forms.contactName')}</label>
        <input name="contact_name" className="input" />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label">{t('forms.emailRequired')}</label>
          <input name="email" type="email" className="input" required />
        </div>
        <div>
          <label className="label">{t('forms.phone')}</label>
          <input name="phone" type="tel" className="input" />
        </div>
      </div>

      <div>
        <label className="label">{t('forms.initialPassword')}</label>
        <input
          name="password"
          type="text"
          className="input font-mono"
          minLength={8}
          required
          placeholder={t('forms.passwordHint')}
        />
        <p className="text-xs text-steel-2 mt-1">{t('forms.passwordShareHint')}</p>
      </div>

      <div className="flex gap-3 pt-2">
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? t('forms.creatingCustomer') : t('forms.createCustomerAccount')}
        </button>
        <Link href="/admin/customers" className="btn-secondary">
          {t('common.cancel')}
        </Link>
      </div>
    </form>
  );
}
