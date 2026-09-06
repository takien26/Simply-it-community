import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { realtimeEmitter, RealtimeEventPayload } from '@/lib/realtime';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return new Response('Unauthorized', { status: 401 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection ACK
      const initMessage = `data: ${JSON.stringify({ type: 'CONNECTED', message: 'SSE Stream Active' })}\n\n`;
      controller.enqueue(encoder.encode(initMessage));

      const eventListener = (payload: RealtimeEventPayload) => {
        try {
          // If event has targetUserId, only send if matches
          if (payload.targetUserId && payload.targetUserId !== currentUser.userId) {
            return;
          }
          const sseData = `data: ${JSON.stringify(payload)}\n\n`;
          controller.enqueue(encoder.encode(sseData));
        } catch (err) {
          console.error('Error enqueuing SSE event:', err);
        }
      };

      realtimeEmitter.on('event', eventListener);

      // Heartbeat ping every 25 seconds
      const interval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(':ping\n\n'));
        } catch {
          clearInterval(interval);
        }
      }, 25000);

      // Cleanup when connection closes
      request.signal.addEventListener('abort', () => {
        realtimeEmitter.off('event', eventListener);
        clearInterval(interval);
        try {
          controller.close();
        } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
