export type UserRole = 'SUPER_ADMIN' | 'TENANT_ADMIN' | 'OPERATOR' | 'VIEWER';
export type UserStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED';
export type ChannelStatus =
  | 'CREATED'
  | 'CONNECTING'
  | 'QR_PENDING'
  | 'CONNECTED'
  | 'DISCONNECTED'
  | 'ERROR';
export type MessageStatus =
  | 'QUEUED'
  | 'SENDING'
  | 'SENT'
  | 'DELIVERED'
  | 'READ'
  | 'FAILED';
export type MessageType = 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT' | 'STICKER';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  tenantId: string | null;
  locale: string;
}

export interface Channel {
  id: string;
  name: string;
  instanceName: string;
  evolutionServerId: string;
  status: ChannelStatus;
  connectionState: string;
  phoneNumber: string | null;
  profileName: string | null;
  enabled: boolean;
  weight: number;
  rateLimitPerMinute: number;
  rateLimitPerHour: number | null;
  rateLimitPerDay: number | null;
  minDelayMs: number;
  maxDelayMs: number;
  lastSentAt: string | null;
  createdAt: string;
}

export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  status: 'ACTIVE' | 'REVOKED';
  scopes: string[];
  lastUsedAt: string | null;
  createdAt: string;
  secret?: string;
}

export interface UserRow {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  status: UserStatus;
  locale: string;
  createdAt: string;
}

export interface EvolutionServer {
  id: string;
  name: string;
  baseUrl: string;
  enabled: boolean;
  defaultWebhookUrl: string | null;
  createdAt: string;
}

export interface TenantRow {
  id: string;
  name: string;
  slug: string;
  status: 'ACTIVE' | 'SUSPENDED';
  defaultLocale: string;
  userCount: number;
  createdAt: string;
}

export interface MessageRow {
  id: string;
  toNumber: string;
  type: MessageType;
  status: MessageStatus;
  channelId: string | null;
  externalId: string | null;
  text: string | null;
  error: Record<string, any> | null;
  createdAt: string;
  sentAt: string | null;
}

export interface MessageEventRow {
  id: string;
  status: MessageStatus;
  source: string;
  detail: Record<string, any> | null;
  createdAt: string;
}

export interface Summary {
  total: number;
  byStatus: Record<string, number>;
  today: Record<string, number>;
  failureRate: number;
  queued: number;
  sentToday: number;
  failedToday: number;
}

export interface ChannelUsage {
  channelId: string;
  name: string;
  status: ChannelStatus;
  enabled: boolean;
  sentToday: number;
  rateLimitPerMinute: number;
  rateLimitPerDay: number | null;
}
