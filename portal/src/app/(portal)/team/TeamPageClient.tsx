'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Mail, User, UserPlus, Users } from 'lucide-react';
import { useI18n } from '@/lib/i18n/context';
import type { CustomerUser } from '@/lib/portal/types-ext';
import type { CustomerUserRole } from '@/lib/stages';

interface TeamPageClientProps {
  members: CustomerUser[];
  canInvite: boolean;
}

const ROLES: CustomerUserRole[] = ['admin', 'quality', 'procurement', 'viewer'];

export function TeamPageClient({ members, canInvite }: TeamPageClientProps) {
  const { t } = useI18n();
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<CustomerUserRole>('viewer');
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState('');
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) return;

    setInviting(true);
    setError('');
    setTempPassword(null);

    const res = await fetch('/api/team/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: fullName.trim(),
        email: email.trim(),
        role,
      }),
    });

    const data = await res.json();
    setInviting(false);

    if (!res.ok) {
      setError(t('teamPage.inviteError', { message: data.error ?? 'Unknown error' }));
      return;
    }

    setTempPassword(data.tempPassword);
    setFullName('');
    setEmail('');
    setRole('viewer');
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Users size={18} className="text-arc-2" />
          <h2 className="font-bold text-bone">{t('teamPage.members')}</h2>
        </div>

        {members.length === 0 ? (
          <p className="text-sm text-steel-2 text-center py-6">{t('teamPage.empty')}</p>
        ) : (
          <ul className="space-y-3">
            {members.map((member) => (
              <li
                key={member.id}
                className="flex items-center justify-between gap-3 rounded border border-ink-4 bg-ink-1/50 px-4 py-3 flex-wrap"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-ink-2 flex items-center justify-center shrink-0">
                    <User size={16} className="text-arc-2" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-bone truncate">{member.full_name}</div>
                    <div className="text-xs text-steel-2 flex items-center gap-1 truncate">
                      <Mail size={12} />
                      {member.email}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs px-2 py-1 rounded bg-ink-2 text-steel-2">
                    {t(`teamPage.roles.${member.role}`)}
                  </span>
                  <span
                    className={`text-xs font-semibold px-2 py-1 rounded-full ${
                      member.is_active
                        ? 'bg-success/10 text-success'
                        : 'bg-danger/10 text-danger'
                    }`}
                  >
                    {member.is_active ? t('teamPage.active') : t('teamPage.inactive')}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {canInvite ? (
        <form onSubmit={handleInvite} className="card p-6 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <UserPlus size={18} className="text-arc-2" />
            <h2 className="font-bold text-bone">{t('teamPage.invite')}</h2>
          </div>

          <div>
            <label className="label">{t('teamPage.fullName')}</label>
            <input
              className="input"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="label">{t('teamPage.email')}</label>
            <input
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="label">{t('teamPage.role')}</label>
            <select
              className="input"
              value={role}
              onChange={(e) => setRole(e.target.value as CustomerUserRole)}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {t(`teamPage.roles.${r}`)}
                </option>
              ))}
            </select>
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          {tempPassword && (
            <div className="rounded border border-success/30 bg-success/5 p-4 space-y-2">
              <p className="text-sm text-success font-medium">
                {t('teamPage.inviteSuccess')}{' '}
                <code className="font-mono text-bone">{tempPassword}</code>
              </p>
              <p className="text-xs text-steel-2">{t('teamPage.tempPasswordHint')}</p>
            </div>
          )}

          <button type="submit" className="btn-primary" disabled={inviting}>
            {inviting ? t('teamPage.inviting') : t('teamPage.inviteBtn')}
          </button>
        </form>
      ) : (
        <div className="card p-6">
          <p className="text-sm text-steel-2">{t('teamPage.noAccess')}</p>
        </div>
      )}
    </div>
  );
}
