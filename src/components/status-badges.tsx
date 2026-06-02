'use client';

import { useTranslations } from 'next-intl';
import { Badge } from './ui/badge';
import type { ChannelStatus, MessageStatus, UserStatus } from '@/lib/types';

const channelTone: Record<ChannelStatus, any> = {
  CREATED: 'neutral',
  CONNECTING: 'info',
  QR_PENDING: 'warning',
  CONNECTED: 'success',
  DISCONNECTED: 'neutral',
  ERROR: 'danger',
};

export function ChannelStatusBadge({ status }: { status: ChannelStatus }) {
  const t = useTranslations('channelStatus');
  return <Badge tone={channelTone[status]}>{t(status)}</Badge>;
}

const messageTone: Record<MessageStatus, any> = {
  QUEUED: 'neutral',
  SENDING: 'info',
  SENT: 'info',
  DELIVERED: 'success',
  READ: 'success',
  FAILED: 'danger',
};

export function MessageStatusBadge({ status }: { status: MessageStatus }) {
  const t = useTranslations('messageStatus');
  return <Badge tone={messageTone[status]}>{t(status)}</Badge>;
}

const userTone: Record<UserStatus, any> = {
  PENDING: 'warning',
  ACTIVE: 'success',
  SUSPENDED: 'danger',
};

export function UserStatusBadge({ status }: { status: UserStatus }) {
  const t = useTranslations('userStatus');
  return <Badge tone={userTone[status]}>{t(status)}</Badge>;
}
