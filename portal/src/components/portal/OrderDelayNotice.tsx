import { AlertTriangle } from 'lucide-react';
import { getServerI18n } from '@/lib/i18n/server';
import { isOrderOverdue } from '@/lib/portal/order-list-filters';
import type { Order } from '@/lib/types';

interface OrderDelayNoticeProps {
  order: Pick<Order, 'expected_delivery' | 'status' | 'delay_reason'>;
}

export async function OrderDelayNotice({ order }: OrderDelayNoticeProps) {
  if (!isOrderOverdue(order) || !order.delay_reason?.trim()) return null;

  const { t } = await getServerI18n();

  return (
    <div className="order-delay-notice mb-6">
      <div className="order-delay-notice-icon">
        <AlertTriangle size={18} />
      </div>
      <div>
        <div className="order-delay-notice-title">{t('order.delayNoticeTitle')}</div>
        <p className="order-delay-notice-body">{order.delay_reason}</p>
      </div>
    </div>
  );
}
