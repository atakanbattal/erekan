'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function SetupPage() {
  const [loading, setLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function check() {
      const { count } = await supabase
        .from('staff_profiles')
        .select('*', { count: 'exact', head: true });

      setNeedsSetup((count ?? 0) === 0);
      setLoading(false);
    }
    check();
  }, [supabase]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    const form = new FormData(e.currentTarget);
    const email = form.get('email') as string;
    const password = form.get('password') as string;
    const fullName = form.get('full_name') as string;

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setSubmitting(false);
      return;
    }

    if (!authData.user) {
      setError('Kayıt başarısız');
      setSubmitting(false);
      return;
    }

    // If email confirmation is enabled, session may be null — use API bootstrap
    if (!authData.session) {
      const res = await fetch('/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: fullName, email }),
      });

      if (!res.ok) {
        const result = await res.json();
        setError(
          result.error ??
            'Hesap oluşturuldu. E-posta doğrulaması gerekebilir — Supabase Auth ayarlarından "Confirm email" kapatın veya service role key ekleyin.'
        );
        setSubmitting(false);
        return;
      }

      setError('');
      alert(
        'Admin hesabı oluşturuldu. E-posta doğrulaması aktifse Supabase panelinden hesabı onaylayın, ardından giriş yapın.'
      );
      router.push('/login');
      setSubmitting(false);
      return;
    }

    const { error: staffError } = await supabase.from('staff_profiles').insert({
      auth_user_id: authData.user.id,
      full_name: fullName,
      role: 'admin',
      is_admin: true,
    });

    if (staffError) {
      setError(staffError.message);
      setSubmitting(false);
      return;
    }

    router.push('/admin');
    router.refresh();
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-steel-2">
        Yükleniyor...
      </div>
    );
  }

  if (!needsSetup) {
    router.push('/login');
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="text-3xl font-black text-bone">
            Arma<span className="text-arc-2">Weld</span>
          </span>
          <div className="eyebrow mt-4 mb-2">İlk Kurulum</div>
          <h1 className="text-2xl font-bold text-bone">Admin Hesabı Oluştur</h1>
          <p className="text-sm text-steel-2 mt-2">
            Portal yönetim paneli için ilk admin hesabınızı oluşturun.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          {error && (
            <div className="p-3 rounded bg-danger/10 border border-danger/30 text-danger text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="label">Ad Soyad</label>
            <input name="full_name" className="input" required placeholder="Ali Eren" />
          </div>

          <div>
            <label className="label">E-posta</label>
            <input name="email" type="email" className="input" required />
          </div>

          <div>
            <label className="label">Şifre</label>
            <input name="password" type="password" className="input" minLength={8} required />
          </div>

          <button type="submit" className="btn-primary w-full" disabled={submitting}>
            {submitting ? 'Oluşturuluyor...' : 'Admin Hesabı Oluştur'}
          </button>
        </form>

        <p className="text-center text-xs text-steel-2 mt-6">
          <Link href="https://www.armaweld.com" className="text-arc-2 hover:underline">
            ← Ana Siteye Dön
          </Link>
        </p>
      </div>
    </div>
  );
}
