'use client';

import { useState } from 'react';
import { Building2, Lock, Mail, User } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useI18n } from '@/lib/i18n/context';
import type { CustomerContext } from '@/lib/portal/types-ext';
import type { NotificationPreference } from '@/lib/portal/types-ext';
import { NotificationPreferencesPanel } from '@/components/portal/NotificationPreferencesPanel';
import type { CustomerUserRole } from '@/lib/stages';

interface SettingsPageClientProps {
  context: CustomerContext;
  notificationPrefs: NotificationPreference[];
}

function roleLabel(
  t: (key: string) => string,
  role: CustomerUserRole | 'owner'
) {
  if (role === 'owner') return t('settingsPage.roleOwner');
  return t(`teamPage.roles.${role}`);
}

export function SettingsPageClient({ context, notificationPrefs }: SettingsPageClientProps) {
  const { t } = useI18n();
  const supabase = createClient();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (newPassword.length < 8) {
      setError(t('settingsPage.passwordTooShort'));
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t('settingsPage.passwordMismatch'));
      return;
    }

    setUpdating(true);
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });
    setUpdating(false);

    if (updateError) {
      setError(t('settingsPage.updateError', { message: updateError.message }));
      return;
    }

    setSuccess(true);
    setNewPassword('');
    setConfirmPassword('');
  }

  const accountFields = [
    { icon: Building2, label: t('settingsPage.company'), value: context.companyName },
    { icon: User, label: t('settingsPage.contactName'), value: context.contactName },
    { icon: Mail, label: t('settingsPage.email'), value: context.email },
    { icon: User, label: t('settingsPage.role'), value: roleLabel(t, context.userRole) },
  ];

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h2 className="font-bold text-bone mb-5">{t('settingsPage.accountInfo')}</h2>
        <div className="space-y-5">
          {accountFields.map(({ icon: Icon, label, value }) => (
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
        </div>
      </div>

      <form onSubmit={handlePasswordSubmit} className="card p-6 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Lock size={18} className="text-arc-2" />
          <h2 className="font-bold text-bone">{t('settingsPage.changePassword')}</h2>
        </div>

        <div>
          <label className="label">{t('settingsPage.newPassword')}</label>
          <input
            type="password"
            className="input"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
            required
            minLength={8}
          />
        </div>

        <div>
          <label className="label">{t('settingsPage.confirmPassword')}</label>
          <input
            type="password"
            className="input"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            required
            minLength={8}
          />
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}
        {success && <p className="text-sm text-success">{t('settingsPage.passwordUpdated')}</p>}

        <button type="submit" className="btn-primary" disabled={updating}>
          {updating ? t('settingsPage.updating') : t('settingsPage.updatePassword')}
        </button>
      </form>

      <NotificationPreferencesPanel initialPrefs={notificationPrefs} />
    </div>
  );
}
