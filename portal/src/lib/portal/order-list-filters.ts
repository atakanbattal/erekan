import type { OrderStatus } from '@/lib/stages';
import type { Order } from '@/lib/types';

export type OrderPresetFilter =
  | 'overdue'
  | 'due_this_week'
  | 'ready_shipment'
  | 'upcoming_delivery'
  | 'finished';

const PRESET_FILTERS = new Set<string>([
  'overdue',
  'due_this_week',
  'ready_shipment',
  'upcoming_delivery',
  'finished',
]);

const STATUS_VALUES = new Set<string>([
  'draft',
  'active',
  'on_hold',
  'completed',
  'shipped',
  'cancelled',
]);

export function isOrderOverdue(
  order: Pick<Order, 'expected_delivery' | 'status'>,
  today = new Date()
): boolean {
  return !!(
    order.expected_delivery &&
    new Date(order.expected_delivery) < today &&
    (order.status === 'active' || order.status === 'on_hold')
  );
}

export function isOrderDueThisWeek(order: Order, today = new Date()): boolean {
  const weekLater = new Date(today);
  weekLater.setDate(weekLater.getDate() + 7);

  return !!(
    order.expected_delivery &&
    new Date(order.expected_delivery) >= today &&
    new Date(order.expected_delivery) <= weekLater &&
    (order.status === 'active' || order.status === 'on_hold')
  );
}

export function isOrderReadyForShipment(order: Order): boolean {
  return order.status === 'active' && order.current_stage >= 6;
}

export function isOrderUpcomingDelivery(order: Order): boolean {
  return !!(
    order.expected_delivery &&
    (order.status === 'active' || order.status === 'on_hold')
  );
}

export function isOrderFinished(order: Order): boolean {
  return order.status === 'completed' || order.status === 'shipped';
}

export function filterOrdersByPreset(
  orders: Order[],
  preset: OrderPresetFilter,
  today = new Date()
): Order[] {
  switch (preset) {
    case 'overdue':
      return orders.filter((o) => isOrderOverdue(o, today));
    case 'due_this_week':
      return orders.filter((o) => isOrderDueThisWeek(o, today));
    case 'ready_shipment':
      return orders.filter(isOrderReadyForShipment);
    case 'upcoming_delivery':
      return orders.filter(isOrderUpcomingDelivery);
    case 'finished':
      return orders.filter(isOrderFinished);
    default:
      return orders;
  }
}

export function filterOrdersByStatus(orders: Order[], status: OrderStatus): Order[] {
  return orders.filter((o) => o.status === status);
}

export function parseOrderListQuery(params: {
  filter?: string;
  status?: string;
}): { preset?: OrderPresetFilter; status?: OrderStatus } {
  if (params.status && STATUS_VALUES.has(params.status)) {
    return { status: params.status as OrderStatus };
  }
  if (params.filter && PRESET_FILTERS.has(params.filter)) {
    return { preset: params.filter as OrderPresetFilter };
  }
  return {};
}

export function orderListFilterLabelKey(
  parsed: ReturnType<typeof parseOrderListQuery>
): string | null {
  if (parsed.preset) return `orders.filter.${parsed.preset}`;
  if (parsed.status) return `orderStatus.${parsed.status}`;
  return null;
}

export function buildOrdersListHref(options: {
  filter?: OrderPresetFilter;
  status?: OrderStatus;
  basePath?: string;
}): string {
  const base = options.basePath ?? '/admin/orders';
  if (options.status) return `${base}?status=${options.status}`;
  if (options.filter) return `${base}?filter=${options.filter}`;
  return base;
}
