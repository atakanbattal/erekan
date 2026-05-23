'use client';

import Link from 'next/link';
import { Package, Truck, CheckCircle2, Layers } from 'lucide-react';
import { useI18n } from '@/lib/i18n/context';

interface DashboardStatCardsProps {
  total: number;
  inProduction: number;
  readyShipment: number;
  completed: number;
}

const CARD_CONFIG = [
  { key: 'inProduction' as const, icon: Package, color: 'blue', valueKey: 'inProduction' as const },
  { key: 'readyShipment' as const, icon: Truck, color: 'amber', valueKey: 'readyShipment' as const },
  { key: 'completed' as const, icon: CheckCircle2, color: 'green', valueKey: 'completed' as const },
  { key: 'total' as const, icon: Layers, color: 'purple', valueKey: 'total' as const },
];

const LABELS = {
  inProduction: 'dashboard.inProduction',
  readyShipment: 'dashboard.readyShipment',
  completed: 'dashboard.completed',
  total: 'dashboard.totalOrders',
} as const;

export function DashboardStatCards({
  total,
  inProduction,
  readyShipment,
  completed,
}: DashboardStatCardsProps) {
  const { t } = useI18n();
  const values = { total, inProduction, readyShipment, completed };

  return (
    <div className="dashboard-stat-grid">
      {CARD_CONFIG.map(({ key, icon: Icon, color, valueKey }) => (
        <Link key={key} href="/orders" className={`dashboard-stat-card dashboard-stat-card--${color}`}>
          <div className="dashboard-stat-card-icon">
            <Icon size={22} />
          </div>
          <div className="dashboard-stat-card-body">
            <div className="dashboard-stat-card-value">{values[valueKey]}</div>
            <div className="dashboard-stat-card-label">{t(LABELS[key])}</div>
          </div>
          <span className="dashboard-stat-card-link">{t('dashboard.viewAll')} →</span>
        </Link>
      ))}
    </div>
  );
}
