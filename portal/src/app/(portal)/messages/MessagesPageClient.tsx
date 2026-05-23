'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { MessageComposer, MessageThreadList, MessageThreadView } from '@/components/portal/MessagesPanel';
import { useI18n } from '@/lib/i18n/context';
import type { Order, PortalMessage } from '@/lib/types';

interface MessagesPageClientProps {
  customerId: string;
  senderName: string;
  messages: PortalMessage[];
  orders: Pick<Order, 'id' | 'job_number' | 'title'>[];
}

export function MessagesPageClient({
  customerId,
  senderName,
  messages,
  orders,
}: MessagesPageClientProps) {
  const { t } = useI18n();
  const [selectedThreadId, setSelectedThreadId] = useState<string | undefined>();
  const [showComposer, setShowComposer] = useState(false);

  return (
    <div className="portal-page">
      <div className="portal-page-header flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="portal-page-title">{t('messages.title')}</h1>
          <p className="portal-page-subtitle">{t('messages.subtitle')}</p>
        </div>
        <button
          type="button"
          className="btn-primary"
          onClick={() => {
            setShowComposer((v) => !v);
            setSelectedThreadId(undefined);
          }}
        >
          {t('messages.newMessage')}
        </button>
      </div>

      {showComposer && !selectedThreadId && (
        <div className="mb-6">
          <MessageComposer
            customerId={customerId}
            senderName={senderName}
            orders={orders}
          />
        </div>
      )}

      <div className="messages-layout">
        <div className="messages-layout-sidebar">
          <MessageThreadList
            messages={messages}
            selectedThreadId={selectedThreadId}
            onSelectThread={(id) => {
              setSelectedThreadId(id);
              setShowComposer(false);
            }}
          />
        </div>
        <div className="messages-layout-main">
          {selectedThreadId ? (
            <MessageThreadView
              messages={messages}
              threadId={selectedThreadId}
              customerId={customerId}
              senderName={senderName}
              orders={orders}
            />
          ) : (
            <div className="card p-12 text-center text-steel-2">
              {t('messages.noMessages')}
              <div className="mt-4">
                <Link href="/support" className="text-arc-2 hover:underline text-sm">
                  {t('sidebar.createSupport')} →
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
