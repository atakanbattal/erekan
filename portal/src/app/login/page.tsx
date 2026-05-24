'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useI18n } from '@/lib/i18n/context';
import { LangSwitcher } from '@/components/LangSwitcher';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const supabase = createClient();
  const { t } = useI18n();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(t('login.error'));
        return;
      }

      const userId = data.user?.id;
      if (!userId) {
        setError(t('login.error'));
        return;
      }

      const { data: staff } = await supabase
        .from('staff_profiles')
        .select('is_admin')
        .eq('auth_user_id', userId)
        .maybeSingle();

      // Full page navigation — reliable with :3000 proxy and SSR cookies
      window.location.assign(staff?.is_admin ? '/admin' : '/dashboard');
    } catch {
      setError(t('login.error'));
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    if (!email.trim()) {
      setError(t('login.resetEmailRequired'));
      return;
    }
    setLoading(true);
    setError('');
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/settings`,
    });
    setLoading(false);
    if (resetError) {
      setError(resetError.message);
      return;
    }
    setResetSent(true);
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="login-topbar">
        <LangSwitcher />
      </div>
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link href="https://www.armaweld.com" className="inline-block mb-6">
              <span className="text-3xl font-black tracking-tight text-bone">
                Arma<span className="text-arc-2">Weld</span>
              </span>
            </Link>
            <div className="eyebrow mb-2">{t('common.portal')}</div>
            <h1 className="text-2xl font-bold text-bone">{t('login.title')}</h1>
            <p className="text-sm text-steel-2 mt-2">{t('login.subtitle')}</p>
          </div>

          <form onSubmit={handleSubmit} className="card p-6 space-y-4">
            {error && (
              <div className="p-3 rounded bg-danger/10 border border-danger/30 text-danger text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="label" htmlFor="email">
                {t('login.email')}
              </label>
              <input
                id="email"
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('login.emailPlaceholder')}
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="label" htmlFor="password">
                {t('login.password')}
              </label>
              <input
                id="password"
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>

            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? t('login.submitting') : t('login.submit')}
            </button>

            <button
              type="button"
              className="text-sm text-arc-2 hover:underline w-full text-center"
              onClick={handleForgotPassword}
              disabled={loading}
            >
              {t('login.forgotPassword')}
            </button>

            {resetSent && (
              <p className="text-sm text-success text-center">{t('login.resetSent')}</p>
            )}
          </form>

          <p className="text-center text-xs text-steel-2 mt-6">
            {t('login.noAccount')}
            <br />
            <Link href="https://www.armaweld.com/iletisim.html" className="text-arc-2 hover:underline">
              {t('login.contactLink')}
            </Link>
          </p>
        </div>
      </div>

      <footer className="py-4 text-center text-xs text-steel-1 border-t border-ink-4">
        {t('common.copyright', { year: new Date().getFullYear() })}
      </footer>
    </div>
  );
}
