'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useI18n } from '@/lib/i18n/context';
import type { Order } from '@/lib/types';

interface SupportPageClientProps {
  customerId: string;
  senderName: string;
  orders: Pick<Order, 'id' | 'job_number' | 'title'>[];
}

export function SupportPageClient({ customerId, senderName, orders }: SupportPageClientProps) {
  const { t } = useI18n();
  const router = useRouter();
  const supabase = createClient();
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [orderId, setOrderId] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim() || !body.trim()) return;

    setSending(true);
    setError('');

    const threadId = crypto.randomUUID();
    const { error: insertError } = await supabase.from('portal_messages').insert({
      customer_id: customerId,
      order_id: orderId || null,
      thread_id: threadId,
      category: 'support',
      subject: subject.trim(),
      body: body.trim(),
      sender_type: 'customer',
      sender_name: senderName,
      is_read_by_admin: false,
      is_read_by_customer: true,
    });

    setSending(false);

    if (insertError) {
      setError(t('messages.sendError', { message: insertError.message }));
      return;
    }

    setSuccess(true);
    setSubject('');
    setBody('');
    setOrderId('');
    router.refresh();
  }

  return (
    <div className="portal-page max-w-2xl">
      <div className="portal-page-header">
        <h1 className="portal-page-title">{t('supportPage.title')}</h1>
        <p className="portal-page-subtitle">{t('supportPage.subtitle')}</p>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 space-y-4">
        <div>
          <label className="label">{t('messages.subject')}</label>
          <input
            className="input"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder={t('messages.subjectPlaceholder')}
            required
          />
        </div>

        {orders.length > 0 && (
          <div>
            <label className="label">{t('messages.relatedOrder')}</label>
            <select className="input" value={orderId} onChange={(e) => setOrderId(e.target.value)}>
              <option value="">{t('messages.noOrder')}</option>
              {orders.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.job_number} — {o.title}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="label">{t('messages.message')}</label>
          <textarea
            className="input min-h-[160px] resize-y"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={t('messages.messagePlaceholder')}
            required
          />
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}
        {success && <p className="text-sm text-success">{t('messages.sent')}</p>}

        <button type="submit" className="btn-primary" disabled={sending}>
          {sending ? t('messages.sending') : t('supportPage.submit')}
        </button>
      </form>
    </div>
  );
}
