'use client';

import Link from 'next/link';
import { Hash } from 'lucide-react';
import { ProcessFlow } from '@/components/ProcessFlow';
import { StatusBadge } from '@/components/StatusBadge';
import type { Order, OrderStage } from '@/lib/types';

interface OrderTrackingListProps {
  orders: Order[];
  stagesByOrderId: Record<string, OrderStage[]>;
}

export function OrderTrackingList({ orders, stagesByOrderId }: OrderTrackingListProps) {
  if (orders.length === 0) return null;

  return (
    <div className="order-tracking-list">
      {orders.map((order, index) => (
        <article
          key={order.id}
          className={`order-tracking-card ${index > 0 ? 'order-tracking-card--bordered' : ''}`}
        >
          <div className="order-tracking-card-header">
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <Hash size={15} className="text-arc-2 shrink-0" />
              <span className="font-mono text-sm text-arc-2">{order.job_number}</span>
              <h3 className="font-bold text-bone truncate">{order.title}</h3>
              <StatusBadge status={order.status} />
            </div>
            <Link href={`/orders/${order.id}`} className="order-tracking-card-link">
              →
            </Link>
          </div>
          <ProcessFlow
            stages={stagesByOrderId[order.id] ?? []}
            currentStage={order.current_stage}
            expectedDelivery={order.expected_delivery}
            orderHref={`/orders/${order.id}`}
            compact={orders.length > 2}
          />
        </article>
      ))}
    </div>
  );
}
