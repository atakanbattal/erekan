import type { Order } from '@/lib/types';
import { PRODUCTION_STAGES } from '@/lib/stages';

const STAGE_COUNT = PRODUCTION_STAGES.length;

export interface DeliveryMetrics {
  onTimeRate: number | null;
  onTimeCount: number;
  finishedWithDate: number;
  avgProductionProgress: number;
  avgProgress: number;
  activeOrders: number;
  totalOrders: number;
  upcomingDeliveries: number;
  documentCount: number;
}

export function computeDeliveryMetrics(
  orders: Order[],
  documentCount: number
): DeliveryMetrics {
  const finished = orders.filter(
    (o) => o.status === 'shipped' || o.status === 'completed'
  );
  const onTimeCount = finished.filter((o) => {
    const actual = o.shipped_at ? new Date(o.shipped_at) : new Date(o.updated_at);
    if (!o.expected_delivery) return true;
    const expected = new Date(o.expected_delivery);
    expected.setHours(23, 59, 59, 999);
    return actual <= expected;
  }).length;

  const activeOrdersList = orders.filter((o) => o.status === 'active' || o.status === 'on_hold');
  const avgProductionProgress = activeOrdersList.length
    ? Math.round(
        (activeOrdersList.reduce((sum, o) => sum + o.current_stage / STAGE_COUNT, 0) /
          activeOrdersList.length) *
          100
      )
    : 0;

  const upcomingDeliveries = orders.filter(
    (o) =>
      o.expected_delivery &&
      (o.status === 'active' || o.status === 'on_hold')
  ).length;

  return {
    onTimeRate:
      finished.length > 0 ? Math.round((onTimeCount / finished.length) * 100) : null,
    onTimeCount,
    finishedWithDate: finished.length,
    avgProductionProgress,
    avgProgress: avgProductionProgress,
    activeOrders: activeOrdersList.length,
    totalOrders: orders.length,
    upcomingDeliveries,
    documentCount,
  };
}
