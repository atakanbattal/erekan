import type { RfqStatus } from '@/lib/stages';
import type { PortalMessage } from '@/lib/types';

export type ActivityBadgeVariant =
  | 'unread'
  | 'awaiting'
  | 'answered'
  | 'action'
  | 'pending'
  | 'success'
  | 'danger'
  | 'muted';

export type MessageThreadStatus = 'unread' | 'awaiting_reply' | 'answered';

export type RfqListStatus = 'pending' | 'action_required' | 'completed' | 'rejected';

export function getCustomerThreadStatus(thread: {
  unread: boolean;
  latest: PortalMessage;
}): MessageThreadStatus {
  if (thread.unread) return 'unread';
  if (thread.latest.sender_type === 'customer') return 'awaiting_reply';
  return 'answered';
}

export function getCustomerRfqListStatus(status: RfqStatus): RfqListStatus {
  if (status === 'rejected') return 'rejected';
  if (status === 'quoted') return 'action_required';
  if (status === 'approved' || status === 'converted') return 'completed';
  return 'pending';
}

export function rfqMatchesFilter(status: RfqStatus, filter: 'all' | 'pending' | 'answered' | 'closed') {
  if (filter === 'all') return true;
  if (filter === 'pending') return status === 'submitted' || status === 'reviewing';
  if (filter === 'answered') {
    return status === 'quoted' || status === 'approved' || status === 'converted';
  }
  return status === 'rejected';
}

export function isRfqAwaitingAdminAction(rfq: {
  status: RfqStatus;
  quote_file_path?: string | null;
}) {
  if (rfq.quote_file_path) return false;
  return rfq.status === 'submitted' || rfq.status === 'reviewing';
}

export function normalizeRfqStatus(rfq: {
  status: RfqStatus;
  quote_file_path?: string | null;
}): RfqStatus {
  if (rfq.quote_file_path && (rfq.status === 'submitted' || rfq.status === 'reviewing')) {
    return 'quoted';
  }
  return rfq.status;
}
