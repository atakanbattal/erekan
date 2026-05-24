'use client';

import { useState } from 'react';
import { useDebouncedRouterRefresh } from '@/hooks/useDebouncedRouterRefresh';
import { formatDistanceToNow } from 'date-fns';
import { Send, MessageSquare } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useI18n } from '@/lib/i18n/context';
import type { MessageCategory, Order, PortalMessage } from '@/lib/types';

interface MessageComposerProps {
  customerId: string;
  senderName: string;
  orders?: Pick<Order, 'id' | 'job_number' | 'title'>[];
  defaultCategory?: MessageCategory;
  defaultOrderId?: string;
  defaultSubject?: string;
  threadId?: string;
  parentSubject?: string;
  onSent?: () => void;
}

export function MessageComposer({
  customerId,
  senderName,
  orders = [],
  defaultCategory = 'general',
  defaultOrderId = '',
  defaultSubject = '',
  threadId,
  parentSubject,
  onSent,
}: MessageComposerProps) {
  const { t } = useI18n();
  const refresh = useDebouncedRouterRefresh();
  const supabase = createClient();
  const [subject, setSubject] = useState(parentSubject ?? defaultSubject);
  const [body, setBody] = useState('');
  const [orderId, setOrderId] = useState(defaultOrderId);
  const [category] = useState<MessageCategory>(defaultCategory);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim() || !subject.trim()) return;

    setSending(true);
    setError('');

    const newThreadId = threadId ?? crypto.randomUUID();

    const { error: insertError } = await supabase.from('portal_messages').insert({
      customer_id: customerId,
      order_id: orderId || null,
      thread_id: newThreadId,
      category,
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

    setBody('');
    setSuccess(true);
    onSent?.();

    void fetch('/api/notifications/trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'customer_message',
        customerId,
        orderId: orderId || null,
        subject: subject.trim(),
        messageBody: body.trim(),
      }),
    });

    refresh();
    setTimeout(() => setSuccess(false), 4000);
  }

  return (
    <form onSubmit={handleSubmit} className="message-composer card p-5">
      {!threadId && (
        <>
          <div className="mb-4">
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
            <div className="mb-4">
              <label className="label">{t('messages.relatedOrder')}</label>
              <select
                className="input"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
              >
                <option value="">{t('messages.noOrder')}</option>
                {orders.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.job_number} — {o.title}
                  </option>
                ))}
              </select>
            </div>
          )}
        </>
      )}

      <div className="mb-4">
        <label className="label">{t('messages.message')}</label>
        <textarea
          className="input min-h-[120px] resize-y"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={threadId ? t('messages.replyPlaceholder') : t('messages.messagePlaceholder')}
          required
        />
      </div>

      {error && <p className="text-sm text-danger mb-3">{error}</p>}
      {success && <p className="text-sm text-success mb-3">{t('messages.sent')}</p>}

      <button type="submit" className="btn-primary flex items-center gap-2" disabled={sending}>
        <Send size={16} />
        {sending ? t('messages.sending') : threadId ? t('messages.reply') : t('messages.send')}
      </button>
    </form>
  );
}

export function buildMessageThreads(messages: PortalMessage[]) {
  const threadMap = messages.reduce((acc, msg) => {
    if (!acc.has(msg.thread_id)) acc.set(msg.thread_id, []);
    acc.get(msg.thread_id)!.push(msg);
    return acc;
  }, new Map<string, PortalMessage[]>());

  return Array.from(threadMap.entries())
    .map(([threadId, msgs]) => {
      const sorted = [...msgs].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      const latest = sorted[sorted.length - 1];
      const unread = msgs.some(
        (m) => m.sender_type === 'admin' && !m.is_read_by_customer
      );
      return { threadId, msgs: sorted, latest, unread, count: msgs.length };
    })
    .sort(
      (a, b) =>
        new Date(b.latest.created_at).getTime() - new Date(a.latest.created_at).getTime()
    );
}

export async function markCustomerThreadRead(threadId: string) {
  const supabase = createClient();
  await supabase
    .from('portal_messages')
    .update({ is_read_by_customer: true })
    .eq('thread_id', threadId)
    .eq('sender_type', 'admin');
}

interface MessageThreadListProps {
  messages: PortalMessage[];
  onSelectThread?: (threadId: string) => void;
  selectedThreadId?: string;
  searchQuery?: string;
  categoryFilter?: MessageCategory | 'all';
}

export function MessageThreadList({
  messages,
  onSelectThread,
  selectedThreadId,
  searchQuery = '',
  categoryFilter = 'all',
}: MessageThreadListProps) {
  const { t, dateLocale } = useI18n();

  const query = searchQuery.trim().toLowerCase();
  const threadList = buildMessageThreads(messages).filter(({ latest, msgs }) => {
    if (categoryFilter !== 'all' && latest.category !== categoryFilter) return false;
    if (!query) return true;
    const haystack = [
      latest.subject,
      ...msgs.map((m) => m.body),
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(query);
  });

  if (threadList.length === 0) {
    return (
      <div className="card p-8 text-center text-steel-2">
        <MessageSquare size={32} className="mx-auto mb-3 opacity-40" />
        {query || categoryFilter !== 'all' ? t('messages.noSearchResults') : t('messages.noMessages')}
      </div>
    );
  }

  return (
    <div className="message-thread-list">
      {threadList.map(({ threadId, latest, unread, count }) => (
        <button
          key={threadId}
          type="button"
          onClick={() => onSelectThread?.(threadId)}
          className={`message-thread-item ${selectedThreadId === threadId ? 'message-thread-item--active' : ''} ${unread ? 'message-thread-item--unread' : ''}`}
        >
          <div className="message-thread-item-top">
            <span className="message-thread-subject">{latest.subject}</span>
            {unread && <span className="message-thread-unread">{t('messages.unread')}</span>}
          </div>
          <p className="message-thread-preview">{latest.body.slice(0, 100)}</p>
          <div className="message-thread-meta">
            <span>{t(`messages.categories.${latest.category}`)}</span>
            <span>
              {t('messages.messageCount', { count })}
              {' · '}
              {formatDistanceToNow(new Date(latest.created_at), {
                addSuffix: true,
                locale: dateLocale,
              })}
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}

interface MessageThreadViewProps {
  messages: PortalMessage[];
  threadId: string;
  customerId: string;
  senderName: string;
  orders?: Pick<Order, 'id' | 'job_number' | 'title'>[];
  onBack?: () => void;
}

export function MessageThreadView({
  messages,
  threadId,
  customerId,
  senderName,
  orders,
  onBack,
}: MessageThreadViewProps) {
  const { t, dateLocale } = useI18n();
  const threadMessages = messages
    .filter((m) => m.thread_id === threadId)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  const first = threadMessages[0];
  if (!first) return null;

  return (
    <div className="message-thread-view card">
      <div className="message-thread-view-header">
        {onBack && (
          <button type="button" className="message-thread-back" onClick={onBack}>
            ← {t('messages.backToList')}
          </button>
        )}
        <h3 className="font-bold text-bone">{first.subject}</h3>
        <span className="text-xs text-steel-2">
          {t(`messages.categories.${first.category}`)}
        </span>
      </div>

      <div className="message-bubbles message-bubbles--scroll">
        {threadMessages.map((msg) => (
          <div
            key={msg.id}
            className={`message-bubble message-bubble--${msg.sender_type}`}
          >
            <div className="message-bubble-header">
              <span className="message-bubble-sender">
                {msg.sender_type === 'admin' ? t('messages.fromAdmin') : t('messages.fromYou')}
                {msg.sender_name ? ` · ${msg.sender_name}` : ''}
              </span>
              <span className="message-bubble-time">
                {formatDistanceToNow(new Date(msg.created_at), {
                  addSuffix: true,
                  locale: dateLocale,
                })}
              </span>
            </div>
            <p className="message-bubble-body">{msg.body}</p>
          </div>
        ))}
      </div>

      <div className="message-thread-reply">
        <MessageComposer
          customerId={customerId}
          senderName={senderName}
          orders={orders}
          threadId={threadId}
          parentSubject={first.subject}
          defaultCategory={first.category}
          defaultOrderId={first.order_id ?? ''}
        />
      </div>
    </div>
  );
}
