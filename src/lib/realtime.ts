import { EventEmitter } from 'events';

// Global singleton EventEmitter to ensure it persists across Next.js API route invocations
const globalForRealtime = globalThis as unknown as {
  realtimeEmitter: EventEmitter | undefined;
};

export const realtimeEmitter =
  globalForRealtime.realtimeEmitter ?? new EventEmitter();

// Allow unlimited listeners
realtimeEmitter.setMaxListeners(200);

if (process.env.NODE_ENV !== 'production') {
  globalForRealtime.realtimeEmitter = realtimeEmitter;
}

export interface RealtimeEventPayload {
  type: string; // 'TICKET_CREATED' | 'TICKET_UPDATED' | 'COMMENT_ADDED' | 'APPROVAL_REQUESTED' | 'SYSTEM_ALERT'
  title: string;
  message: string;
  data?: any;
  targetUserId?: string;
  targetRole?: string;
  timestamp: string;
}

/**
 * Broadcast a real-time event to all connected clients
 */
export function broadcastRealtimeEvent(payload: Omit<RealtimeEventPayload, 'timestamp'>) {
  try {
    const fullPayload: RealtimeEventPayload = {
      ...payload,
      timestamp: new Date().toISOString(),
    };
    realtimeEmitter.emit('event', fullPayload);
  } catch (error) {
    console.error('Error broadcasting realtime event:', error);
  }
}
