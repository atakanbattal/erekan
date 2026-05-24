import type { Order } from '@/lib/types';

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
  const finishedWithDate = finished.filter((o) => o.expected_delivery);
  const onTimeCount = finishedWithDate.filter((o) => {
    const actual = o.shipped_at ? new Date(o.shipped_at) : new Date(o.updated_at);
    const expected = new Date(o.expected_delivery!);
    expected.setHours(23, 59, 59, 999);
    return actual <= expected;
  }).length;

  const activeOrdersList = orders.filter((o) => o.status === 'active');
  const avgProductionProgress = activeOrdersList.length
    ? Math.round(
        (activeOrdersList.reduce((sum, o) => sum + o.current_stage / 7, 0) /
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
      finishedWithDate.length > 0
        ? Math.round((onTimeCount / finishedWithDate.length) * 100)
        : null,
    onTimeCount,
    finishedWithDate: finishedWithDate.length,
    avgProductionProgress,
    avgProgress: avgProductionProgress,
    activeOrders: activeOrdersList.length,
    totalOrders: orders.length,
    upcomingDeliveries,
    documentCount,
  };
}
