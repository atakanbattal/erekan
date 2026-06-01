import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { ArrowUpRight } from 'lucide-react';

export type KpiTone = 'arc' | 'danger' | 'blue' | 'purple' | 'green' | 'amber';

export interface AdminKpiCardItem {
  href: string;
  icon: LucideIcon;
  tone: KpiTone;
  label: string;
  value: string | number;
  hint: string;
  alert?: boolean;
  isText?: boolean;
}

interface AdminKpiGridProps {
  cards: AdminKpiCardItem[];
}

export function AdminKpiGrid({ cards }: AdminKpiGridProps) {
  return (
    <div className="admin-kpi-grid">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Link
            key={card.label}
            href={card.href}
            className={[
              'admin-kpi-card',
              `admin-kpi-card--${card.tone}`,
              card.alert ? 'admin-kpi-card--alert' : '',
            ].join(' ')}
          >
            <div className="admin-kpi-top">
              <span className="admin-kpi-icon">
                <Icon size={20} aria-hidden />
              </span>
              {card.alert ? (
                <span className="admin-kpi-badge">
                  <span className="admin-kpi-badge-dot" aria-hidden />
                  !
                </span>
              ) : (
                <ArrowUpRight size={16} className="admin-kpi-arrow" aria-hidden />
              )}
            </div>

            <div className={['admin-kpi-value', card.isText ? 'admin-kpi-value--text' : ''].join(' ')}>
              {card.value}
            </div>

            <div className="admin-kpi-label">{card.label}</div>

            <div className="admin-kpi-hint">{card.hint}</div>
          </Link>
        );
      })}
    </div>
  );
}
