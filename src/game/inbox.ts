import { seasonLabel } from './player';
import { uid } from './random';
import type { Career, InboxItem } from './types';

const MAX_ITEMS = 100;

export const INBOX_ICONS: Record<InboxItem['kind'], string> = {
  welcome: '👋',
  goals: '🎯',
  season: '📊',
  offer: '📨',
  contract: '📝',
  transfer: '✈️',
  event: '⚡',
  decision: '🤔',
  press: '🎙️',
  achievement: '🏅',
  lotto: '🎟️',
  casino: '🎰',
  holiday: '🏖️',
  retire: '👋',
};

/** Neue Nachricht ins Postfach legen (neueste oben). */
export function postInbox(career: Career, item: Omit<InboxItem, 'id' | 'read' | 'season'> & { season?: string }): void {
  const entry: InboxItem = { id: uid(), read: false, season: item.season ?? seasonLabel(career.year), ...item };
  career.inbox = [entry, ...(career.inbox ?? [])].slice(0, MAX_ITEMS);
}

export function unreadCount(career: Career): number {
  return (career.inbox ?? []).filter((m) => !m.read).length + (career.decision ? 1 : 0);
}

export function markRead(prev: Career, id: string): Career {
  if (!(prev.inbox ?? []).some((m) => m.id === id && !m.read)) return prev;
  return { ...prev, inbox: prev.inbox!.map((m) => (m.id === id ? { ...m, read: true } : m)) };
}

export function markAllRead(prev: Career): Career {
  if (!(prev.inbox ?? []).some((m) => !m.read)) return prev;
  return { ...prev, inbox: prev.inbox!.map((m) => ({ ...m, read: true })) };
}
