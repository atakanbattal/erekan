import { isOrderOverdue } from '@/lib/portal/order-list-filters';
import { computeDeliveryMetrics } from '@/lib/portal/delivery-metrics';
import type { Order } from '@/lib/types';

export interface PerformanceReport {
  totalOrders: number;
  activeOrders: number;
  completedOrders: number;
  onTimeCount: number;
  onTimeRate: number | null;
  finishedWithDate: number;
  overdueCount: number;
  avgStageProgress: number;
  avgLeadTimeDays: number | null;
  leadTimeSampleCount: number;
  byStatus: Record<string, number>;
  monthlyDeliveries: { month: string; count: number; onTime: number }[];
}

function orderCompletionDate(order: Order): Date | null {
  const raw = order.shipped_at ?? order.updated_at;
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isOrderOnTime(order: Order): boolean {
  const actual = orderCompletionDate(order);
  if (!actual) return false;
  if (!order.expected_delivery) return true;
  const expected = new Date(order.expected_delivery);
  expected.setHours(23, 59, 59, 999);
  return actual <= expected;
}

function leadTimeDays(order: Order): number | null {
  if (order.status !== 'completed' && order.status !== 'shipped') return null;

  const start = new Date(order.created_at);
  const end = orderCompletionDate(order);
  if (!end || Number.isNaN(start.getTime())) return null;

  const days = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
  if (!Number.isFinite(days)) return null;
  return Math.max(0, Math.round(days * 10) / 10);
}

export function buildPerformanceReport(orders: Order[]): PerformanceReport {
  const delivery = computeDeliveryMetrics(orders, 0);
  const finished = orders.filter((o) => o.status === 'completed' || o.status === 'shipped');
  const inProgress = orders.filter((o) => o.status === 'active' || o.status === 'on_hold');

  const leadTimes = finished
    .map(leadTimeDays)
    .filter((days): days is number => days != null);

  const byStatus = orders.reduce<Record<string, number>>((acc, o) => {
    acc[o.status] = (acc[o.status] ?? 0) + 1;
    return acc;
  }, {});

  const monthlyMap = new Map<string, { count: number; onTime: number }>();
  for (const order of finished) {
    const completion = orderCompletionDate(order);
    if (!completion) continue;

    const month = `${completion.getFullYear()}-${String(completion.getMonth() + 1).padStart(2, '0')}`;
    const entry = monthlyMap.get(month) ?? { count: 0, onTime: 0 };
    entry.count += 1;
    if (isOrderOnTime(order)) entry.onTime += 1;
    monthlyMap.set(month, entry);
  }

  const monthlyDeliveries = [...monthlyMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([month, data]) => ({ month, ...data }));

  const avgLeadTimeDays =
    leadTimes.length > 0
      ? Math.round((leadTimes.reduce((sum, d) => sum + d, 0) / leadTimes.length) * 10) / 10
      : null;

  return {
    totalOrders: delivery.totalOrders,
    activeOrders: inProgress.length,
    completedOrders: finished.length,
    onTimeCount: delivery.onTimeCount,
    onTimeRate: delivery.onTimeRate,
    finishedWithDate: delivery.finishedWithDate,
    overdueCount: orders.filter((o) => isOrderOverdue(o)).length,
    avgStageProgress: delivery.avgProductionProgress,
    avgLeadTimeDays,
    leadTimeSampleCount: leadTimes.length,
    byStatus,
    monthlyDeliveries,
  };
}
