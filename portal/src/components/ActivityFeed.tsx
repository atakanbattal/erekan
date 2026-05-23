'use client';

import { format } from 'date-fns';
import { FileText, CheckCircle2, Package, Flag, CircleDot } from 'lucide-react';
import type { OrderActivity } from '@/lib/types';
import {
  resolveActivity,
  prepareActivityFeed,
  ACTIVITY_VARIANT_STYLES,
  type ActivityVariant,
} from '@/lib/activity';
import { useI18n } from '@/lib/i18n/context';

interface ActivityFeedProps {
  activities: OrderActivity[];
  isCustomerView?: boolean;
  limit?: number;
}

function ActivityIcon({ variant }: { variant: ActivityVariant }) {
  const styles = ACTIVITY_VARIANT_STYLES[variant];

  switch (variant) {
    case 'document':
      return <FileText size={18} className={styles.icon} strokeWidth={2} />;
    case 'stage':
      return <CheckCircle2 size={18} className={styles.icon} strokeWidth={2} />;
    case 'status':
      return <Flag size={18} className={styles.icon} strokeWidth={2} />;
    case 'order':
      return <Package size={18} className={styles.icon} strokeWidth={2} />;
    default:
      return <CircleDot size={18} className={styles.icon} strokeWidth={2} />;
  }
}

function categoryKey(variant: ActivityVariant) {
  return `activity.category.${variant}` as const;
}

export function ActivityFeed({
  activities,
  isCustomerView = false,
  limit,
}: ActivityFeedProps) {
  const { t, dateLocale } = useI18n();
  const items = prepareActivityFeed(activities, limit);

  if (items.length === 0) return null;

  return (
    <section className="activity-feed">
      <header className="activity-feed-header">
        <div>
          <div className="eyebrow">{t('activity.title')}</div>
          <p className="activity-feed-subtitle">{t('activity.subtitle')}</p>
        </div>
        <span className="activity-feed-count">{items.length}</span>
      </header>

      <ol className="activity-feed-list">
        {items.map((act, index) => {
          const { headline, detail, variant } = resolveActivity(t, act, isCustomerView);
          const styles = ACTIVITY_VARIANT_STYLES[variant];
          const isLast = index === items.length - 1;
          const dateLabel = format(new Date(act.created_at), 'd MMMM yyyy', { locale: dateLocale });
          const timeLabel = format(new Date(act.created_at), 'HH:mm', { locale: dateLocale });

          return (
            <li
              key={act.id}
              className="activity-feed-item"
              data-variant={variant}
            >
              <div className="activity-feed-rail" aria-hidden>
                <div className={`activity-feed-node ${styles.node}`}>
                  <ActivityIcon variant={variant} />
                </div>
                {!isLast && <div className="activity-feed-line" />}
              </div>

              <div className="activity-feed-body">
                <div className="activity-feed-top">
                  <span className={`activity-feed-badge ${styles.badge}`}>
                    {t(categoryKey(variant))}
                  </span>
                  <div className="activity-feed-time">
                    <span className="activity-feed-date">{dateLabel}</span>
                    <span className="activity-feed-clock">{timeLabel}</span>
                  </div>
                </div>
                <p className={`activity-feed-headline ${styles.text}`}>{headline}</p>
                {detail && <p className="activity-feed-detail">{detail}</p>}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
