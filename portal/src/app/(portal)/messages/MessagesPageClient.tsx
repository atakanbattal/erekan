'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import {
  MessageComposer,
  MessageThreadList,
  MessageThreadView,
  buildMessageThreads,
  markCustomerThreadRead,
} from '@/components/portal/MessagesPanel';
import { RealtimeProvider } from '@/components/portal/RealtimeProvider';
import { useI18n } from '@/lib/i18n/context';
import type { MessageCategory, Order, PortalMessage } from '@/lib/types';
import { useRouter } from 'next/navigation';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<MessageCategory | 'all'>('all');
  const [initialized, setInitialized] = useState(false);

  const selectThread = useCallback(async (threadId: string) => {
    setSelectedThreadId(threadId);
    setShowComposer(false);
    await markCustomerThreadRead(threadId);
  }, []);

  useEffect(() => {
    if (initialized || messages.length === 0) return;
    const firstThreadId = buildMessageThreads(messages)[0]?.threadId;
    if (firstThreadId && window.matchMedia('(min-width: 768px)').matches) {
      void selectThread(firstThreadId);
    }
    setInitialized(true);
  }, [messages, initialized, selectThread]);

  const categories: (MessageCategory | 'all')[] = ['all', 'general', 'support', 'order'];

  return (
    <div className="portal-page">
      <RealtimeProvider variant="customer" />
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
            onSent={() => setShowComposer(false)}
          />
        </div>
      )}

      <div className={`messages-layout ${selectedThreadId ? 'messages-layout--thread-open' : ''}`}>
        <div className="messages-layout-sidebar">
          <div className="messages-toolbar">
            <div className="messages-search">
              <Search size={16} className="messages-search-icon" />
              <input
                type="search"
                className="input messages-search-input"
                placeholder={t('messages.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="messages-category-tabs">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`messages-category-tab ${categoryFilter === cat ? 'messages-category-tab--active' : ''}`}
                  onClick={() => setCategoryFilter(cat)}
                >
                  {cat === 'all' ? t('messages.filterAll') : t(`messages.categories.${cat}`)}
                </button>
              ))}
            </div>
          </div>
          <MessageThreadList
            messages={messages}
            selectedThreadId={selectedThreadId}
            searchQuery={searchQuery}
            categoryFilter={categoryFilter}
            onSelectThread={selectThread}
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
              onBack={() => setSelectedThreadId(undefined)}
            />
          ) : (
            <div className="card messages-empty-state">
              <MessageSquarePlaceholder />
              <h3 className="text-lg font-bold text-bone mb-2">{t('messages.selectThread')}</h3>
              <p className="text-steel-2 text-sm mb-4">{t('messages.selectThreadDesc')}</p>
              <Link href="/support" className="text-arc-2 hover:underline text-sm">
                {t('sidebar.createSupport')} →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MessageSquarePlaceholder() {
  return (
    <svg
      className="messages-empty-icon"
      width="40"
      height="40"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
