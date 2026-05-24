'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useDebouncedRouterRefresh } from '@/hooks/useDebouncedRouterRefresh';
import { formatDistanceToNow } from 'date-fns';
import { Send } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useI18n } from '@/lib/i18n/context';
import {
  AttachmentList,
  FileAttachmentPicker,
  uploadMessageAttachments,
} from '@/components/portal/FileAttachments';
import { RealtimeProvider } from '@/components/portal/RealtimeProvider';
import type { PortalMessage } from '@/lib/types';

interface AdminMessageInboxProps {
  threads: PortalMessage[];
  staffName: string;
}

export function AdminMessageInbox({ threads, staffName }: AdminMessageInboxProps) {
  const { t, dateLocale } = useI18n();
  const refresh = useDebouncedRouterRefresh();
  const supabase = createClient();
  const bubblesRef = useRef<HTMLDivElement>(null);

  const threadMap = threads.reduce(
    (acc, msg) => {
      if (!acc.has(msg.thread_id)) acc.set(msg.thread_id, []);
      acc.get(msg.thread_id)!.push(msg);
      return acc;
    },
    new Map<string, PortalMessage[]>()
  );

  const threadList = Array.from(threadMap.entries())
    .map(([threadId, msgs]) => {
      const sorted = [...msgs].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      return {
        threadId,
        msgs: sorted,
        latest: sorted[sorted.length - 1],
      };
    })
    .sort(
      (a, b) =>
        new Date(b.latest.created_at).getTime() - new Date(a.latest.created_at).getTime()
    );

  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(
    threadList[0]?.threadId ?? null
  );
  const [reply, setReply] = useState('');
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const selected = selectedThreadId
    ? [...(threadMap.get(selectedThreadId) ?? [])].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
    : null;

  const markThreadRead = useCallback(
    async (threadId: string) => {
      await supabase
        .from('portal_messages')
        .update({ is_read_by_admin: true })
        .eq('thread_id', threadId)
        .eq('sender_type', 'customer');
    },
    [supabase]
  );

  const selectThread = useCallback((threadId: string) => {
    setSelectedThreadId(threadId);
  }, []);

  useEffect(() => {
    if (!selectedThreadId) return;
    void markThreadRead(selectedThreadId);
  }, [selectedThreadId, markThreadRead]);

  useEffect(() => {
    const el = bubblesRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [selected?.length, selectedThreadId]);

  async function handleReply(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedThreadId || !selected?.[0]) return;
    const trimmedReply = reply.trim();
    if (!trimmedReply && pendingFiles.length === 0) return;

    setSending(true);
    setError('');
    const first = selected[0];
    const messageBody = trimmedReply || t('attachments.filesOnly');

    const { data: inserted, error: insertError } = await supabase
      .from('portal_messages')
      .insert({
        customer_id: first.customer_id,
        order_id: first.order_id,
        thread_id: selectedThreadId,
        category: first.category,
        subject: first.subject,
        body: messageBody,
        sender_type: 'admin',
        sender_name: staffName,
        is_read_by_admin: true,
        is_read_by_customer: false,
      })
      .select('id')
      .single();

    if (insertError || !inserted) {
      setSending(false);
      setError(t('messages.sendError', { message: insertError?.message ?? 'Unknown error' }));
      return;
    }

    try {
      if (pendingFiles.length > 0) {
        await uploadMessageAttachments(inserted.id, pendingFiles);
      }
    } catch (uploadErr) {
      setSending(false);
      setError(
        t('messages.sendError', {
          message: uploadErr instanceof Error ? uploadErr.message : 'Upload failed',
        })
      );
      return;
    }

    setReply('');
    setPendingFiles([]);
    setSending(false);

    void fetch('/api/notifications/trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'admin_reply',
        customerId: first.customer_id,
        orderId: first.order_id,
        subject: first.subject,
        messageBody,
        customerEmail: first.customers?.email,
      }),
    });

    refresh();
  }

  return (
    <>
      <RealtimeProvider variant="admin" />
      <div className="admin-message-inbox">
        <div className="admin-message-threads">
          {threadList.length === 0 ? (
            <div className="p-8 text-center text-steel-2">{t('messages.noThreads')}</div>
          ) : (
            threadList.map(({ threadId, latest, msgs }) => {
              const unread = msgs.some(
                (m) => m.sender_type === 'customer' && !m.is_read_by_admin
              );
              const company = latest.customers?.company_name ?? '—';
              return (
                <button
                  key={threadId}
                  type="button"
                  onClick={() => selectThread(threadId)}
                  className={`message-thread-item ${selectedThreadId === threadId ? 'message-thread-item--active' : ''} ${unread ? 'message-thread-item--unread' : ''}`}
                >
                  <div className="message-thread-item-top">
                    <span className="message-thread-subject">{latest.subject}</span>
                    {unread && <span className="message-thread-unread">{t('messages.unread')}</span>}
                  </div>
                  <p className="text-xs text-steel-2 mb-1">{company}</p>
                  <p className="message-thread-preview">
                    {(latest.attachments?.length ?? 0) > 0 && !latest.body
                      ? t('attachments.fileAttached')
                      : latest.body.slice(0, 80)}
                  </p>
                  <div className="message-thread-meta">
                    <span>{t(`messages.categories.${latest.category}`)}</span>
                    <span>
                      {formatDistanceToNow(new Date(latest.created_at), {
                        addSuffix: true,
                        locale: dateLocale,
                      })}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {selected && selected[0] && (
          <div className="admin-message-detail card">
            <div className="p-4 border-b border-ink-4">
              <h3 className="font-bold text-bone">{selected[0].subject}</h3>
              <p className="text-sm text-steel-2">
                {t('messages.threadWith', {
                  company: selected[0].customers?.company_name ?? '—',
                })}
              </p>
            </div>

            <div ref={bubblesRef} className="message-bubbles p-4">
              {selected.map((msg) => (
                <div
                  key={msg.id}
                  className={`message-bubble message-bubble--${msg.sender_type}`}
                >
                  <div className="message-bubble-header">
                    <span className="message-bubble-sender">
                      {msg.sender_type === 'admin'
                        ? t('messages.fromAdmin')
                        : (msg.sender_name ?? msg.customers?.contact_name ?? '—')}
                    </span>
                    <span className="message-bubble-time">
                      {formatDistanceToNow(new Date(msg.created_at), {
                        addSuffix: true,
                        locale: dateLocale,
                      })}
                    </span>
                  </div>
                  {msg.body && <p className="message-bubble-body">{msg.body}</p>}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <AttachmentList attachments={msg.attachments} compact />
                  )}
                </div>
              ))}
            </div>

            <form onSubmit={handleReply} className="p-4 border-t border-ink-4">
              <textarea
                className="input min-h-[80px] mb-3"
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder={t('messages.replyPlaceholder')}
              />
              <FileAttachmentPicker
                files={pendingFiles}
                onChange={setPendingFiles}
                disabled={sending}
              />
              {error && <p className="text-sm text-danger mt-2">{error}</p>}
              <button
                type="submit"
                className="btn-primary flex items-center gap-2 mt-3"
                disabled={sending || (!reply.trim() && pendingFiles.length === 0)}
              >
                <Send size={16} />
                {sending ? t('messages.sending') : t('messages.reply')}
              </button>
            </form>
          </div>
        )}
      </div>
    </>
  );
}
