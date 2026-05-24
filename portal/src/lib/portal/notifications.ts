import { createAdminClient } from '@/lib/supabase/admin';
import type { NotificationAudience, NotificationType } from '@/lib/stages';

export interface CreateNotificationInput {
  audience: NotificationAudience;
  customerId?: string | null;
  orderId?: string | null;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
  emailTo?: string | null;
}

export async function createNotification(input: CreateNotificationInput) {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from('portal_notifications')
    .insert({
      audience: input.audience,
      customer_id: input.customerId ?? null,
      order_id: input.orderId ?? null,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      link: input.link ?? null,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Notification insert failed:', error.message);
    return null;
  }

  if (input.emailTo) {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_PORTAL_URL ?? 'https://portal.armaweld.com';
      await fetch(`${baseUrl}/api/notifications/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: input.emailTo,
          subject: input.title,
          body: input.body ?? input.title,
          link: input.link ? `${baseUrl}${input.link}` : baseUrl,
          notificationId: data.id,
        }),
      });
    } catch (e) {
      console.error('Email send failed:', e);
    }
  }

  return data.id;
}

export async function notifyCustomer(params: {
  customerId: string;
  customerEmail?: string | null;
  orderId?: string | null;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
}) {
  return createNotification({
    audience: 'customer',
    customerId: params.customerId,
    orderId: params.orderId,
    type: params.type,
    title: params.title,
    body: params.body,
    link: params.link,
    emailTo: params.customerEmail,
  });
}

export async function notifyAdmin(params: {
  customerId?: string | null;
  orderId?: string | null;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
  adminEmail?: string | null;
}) {
  const adminEmail =
    params.adminEmail ?? process.env.ADMIN_EMAIL ?? 'info@armaweld.com';

  return createNotification({
    audience: 'admin',
    customerId: params.customerId,
    orderId: params.orderId,
    type: params.type,
    title: params.title,
    body: params.body,
    link: params.link,
    emailTo: adminEmail,
  });
}
