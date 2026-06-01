import { isOrderOverdue } from '@/lib/portal/order-list-filters';
import type { Order } from '@/lib/types';
import type { RfqRequest, Shipment } from '@/lib/portal/types-ext';
import type { PortalActionType } from '@/lib/stages';

export interface ActionItem {
  id: string;
  actionType: PortalActionType;
  title: string;
  description?: string;
  link: string;
  priority: number;
  dueAt?: string | null;
  orderId?: string;
  rfqId?: string;
}

export function buildCustomerActions(params: {
  orders: Order[];
  rfqs: RfqRequest[];
  shipments: Shipment[];
}): ActionItem[] {
  const items: ActionItem[] = [];

  for (const rfq of params.rfqs) {
    if (rfq.status === 'quoted' && rfq.quote_file_path) {
      items.push({
        id: `rfq-review-${rfq.id}`,
        actionType: 'rfq_quote_review',
        title: rfq.title,
        description: 'quote_review',
        link: '/rfq',
        priority: 90,
        dueAt: rfq.deadline,
        rfqId: rfq.id,
      });
    }
  }

  for (const shipment of params.shipments) {
    if (!shipment.delivery_confirmed_at) {
      items.push({
        id: `delivery-confirm-${shipment.id}`,
        actionType: 'order_delivery_confirm',
        title: shipment.asn_number ?? shipment.tracking_number ?? shipment.id,
        description: 'delivery_confirm',
        link: `/orders/${shipment.order_id}`,
        priority: 70,
        orderId: shipment.order_id,
      });
    }
  }

  return items.sort((a, b) => b.priority - a.priority);
}

export function buildAdminActions(params: {
  orders: Order[];
  rfqs: RfqRequest[];
}): ActionItem[] {
  const items: ActionItem[] = [];

  for (const rfq of params.rfqs) {
    if (['submitted', 'reviewing'].includes(rfq.status) && !rfq.quote_file_path) {
      items.push({
        id: `rfq-pending-${rfq.id}`,
        actionType: 'rfq_convert',
        title: rfq.title,
        description: 'rfq_pending',
        link: '/admin/rfq',
        priority: 85,
        rfqId: rfq.id,
      });
    }
    if (rfq.status === 'approved' && !rfq.converted_order_id) {
      items.push({
        id: `rfq-convert-${rfq.id}`,
        actionType: 'rfq_convert',
        title: rfq.title,
        description: 'rfq_convert',
        link: '/admin/rfq',
        priority: 95,
        rfqId: rfq.id,
      });
    }
  }

  for (const order of params.orders) {
    if (isOrderOverdue(order) && !order.delay_reason?.trim()) {
      items.push({
        id: `delay-note-${order.id}`,
        actionType: 'order_delay_note',
        title: order.job_number,
        description: order.title,
        link: `/admin/orders/${order.id}`,
        priority: 100,
        orderId: order.id,
        dueAt: order.expected_delivery,
      });
    }
  }

  return items.sort((a, b) => b.priority - a.priority);
}
