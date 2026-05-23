'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { ORDER_STATUS_LABELS, type OrderStatus } from '@/lib/stages';
import type { Order, OrderActivity, OrderDocument, OrderStage } from '@/lib/types';
import { StageManager } from './StageManager';
import { ActivityFeed } from '../ActivityFeed';
import { StatusBadge } from '../StatusBadge';
import { OrderFilesSection } from '../OrderFilesSection';
import { useI18n } from '@/lib/i18n/context';
import { getOrderStatusLabel } from '@/lib/i18n/helpers';

interface AdminOrderDetailProps {
  order: Order & { customers: { company_name: string; email: string } };
  stages: OrderStage[];
  documents: OrderDocument[];
  staffName: string;
  activities?: OrderActivity[];
}

export function AdminOrderDetail({
  order,
  stages,
  documents,
  staffName,
  activities = [],
}: AdminOrderDetailProps) {
  const { t } = useI18n();
  const [status, setStatus] = useState(order.status);
  const [saving, setSaving] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const supabase = createClient();
  const router = useRouter();

  async function updateOrderStatus(newStatus: OrderStatus) {
    setSaving(true);
    setStatus(newStatus);
    await supabase.from('orders').update({ status: newStatus }).eq('id', order.id);
    await supabase.from('order_activity').insert({
      order_id: order.id,
      action: 'status_changed',
      description: `Durum güncellendi: ${ORDER_STATUS_LABELS[newStatus]}`,
      actor_name: staffName,
    });
    setSaving(false);
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <div className="font-mono text-arc-2 mb-1">{order.job_number}</div>
          <h1 className="text-2xl font-black text-bone">{order.title}</h1>
          <p className="text-steel-2 mt-1">
            {order.customers.company_name} · {order.customers.email}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status={status} />
          <select
            className="input w-auto text-sm"
            value={status}
            disabled={saving}
            onChange={(e) => updateOrderStatus(e.target.value as OrderStatus)}
          >
            {(Object.keys(ORDER_STATUS_LABELS) as OrderStatus[]).map((key) => (
              <option key={key} value={key}>
                {getOrderStatusLabel(t, key)}
              </option>
            ))}
          </select>
          <Link href={`/orders/${order.id}`} className="btn-secondary text-sm">
            {t('admin.customerView')}
          </Link>
        </div>
      </div>

      <OrderFilesSection
        mode="admin"
        orderId={order.id}
        jobNumber={order.job_number}
        documents={documents}
        staffName={staffName}
        onUploaded={() => {
          setRefreshKey((k) => k + 1);
          router.refresh();
        }}
      />

      <div>
        <div className="eyebrow mb-4">{t('admin.stageManagement')}</div>
        <StageManager
          key={refreshKey}
          orderId={order.id}
          jobNumber={order.job_number}
          material={order.material}
          documents={documents}
          stages={stages}
          currentStage={order.current_stage}
          staffName={staffName}
          orderHeat={order.heat_number}
          orderWps={order.wps_ref}
          onDocumentsChange={() => {
            setRefreshKey((k) => k + 1);
            router.refresh();
          }}
        />
      </div>

      {activities.length > 0 && (
        <ActivityFeed activities={activities} isCustomerView={false} />
      )}
    </div>
  );
}
