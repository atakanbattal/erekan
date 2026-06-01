import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { notifyAdmin, notifyCustomer } from '@/lib/portal/notifications';

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { type, customerId, orderId, subject, messageBody, customerEmail } = body;

  if (type === 'customer_message') {
    await notifyAdmin({
      customerId,
      orderId,
      type: 'message_reply',
      title: `Yeni müşteri mesajı: ${subject}`,
      body: messageBody,
      link: '/admin/messages',
    });
  } else if (type === 'admin_reply') {
    await notifyCustomer({
      customerId,
      customerEmail,
      orderId,
      type: 'message_reply',
      title: `ArmaWeld yanıtladı: ${subject}`,
      body: messageBody,
      link: '/messages',
    });
  } else if (type === 'document_uploaded') {
    await notifyCustomer({
      customerId,
      customerEmail,
      orderId,
      type: 'document_uploaded',
      title: body.title,
      body: body.docName,
      link: orderId ? `/orders/${orderId}` : '/documents',
    });
  } else if (type === 'stage_changed') {
    await notifyCustomer({
      customerId,
      customerEmail,
      orderId,
      type: 'stage_changed',
      title: body.title,
      body: body.body,
      link: `/orders/${orderId}`,
    });
  } else if (type === 'shipment_updated' && orderId) {
    const { data: order } = await supabase
      .from('orders')
      .select('customer_id, customers(email)')
      .eq('id', orderId)
      .single();
    if (order) {
      await notifyCustomer({
        customerId: order.customer_id,
        customerEmail: (order.customers as { email?: string } | null)?.email,
        orderId,
        type: 'shipment_updated',
        title: body.title ?? 'Sevkiyat güncellendi',
        body: body.body,
        link: `/orders/${orderId}`,
      });
    }
  } else if (type === 'ndt_result' && orderId) {
    const { data: order } = await supabase
      .from('orders')
      .select('customer_id, customers(email)')
      .eq('id', orderId)
      .single();
    if (order) {
      await notifyCustomer({
        customerId: order.customer_id,
        customerEmail: (order.customers as { email?: string } | null)?.email,
        orderId,
        type: 'ndt_result',
        title: body.title ?? 'NDT sonucu güncellendi',
        body: body.body,
        link: `/orders/${orderId}`,
      });
    }
  }

  return NextResponse.json({ ok: true });
}
