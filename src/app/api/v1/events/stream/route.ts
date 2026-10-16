/**
 * TrustSeal Real-Time Event Stream (Server-Sent Events)
 * Core Pillar 06: Real-Time WebSockets & Live Streaming
 *
 * Provides a live bidirectional/streaming pipeline for admin dashboards to
 * observe Kafka event streaming, outbox commits, and verification audits in real time.
 */

import { NextRequest } from 'next/server';
import { subscribeLocalEvents } from '@/lib/kafka';

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial heartbeat
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: 'CONNECTED', timestamp: new Date().toISOString() })}\n\n`)
      );

      // Subscribe to all event pipeline updates
      const unsubscribe = subscribeLocalEvents((topic, message) => {
        try {
          const payload = JSON.stringify({
            topic,
            data: message,
            timestamp: new Date().toISOString(),
          });
          controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
        } catch {
          // Stream might be closed
        }
      });

      // Heartbeat interval to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          clearInterval(heartbeat);
          unsubscribe();
        }
      }, 15000);

      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
        unsubscribe();
        try {
          controller.close();
        } catch {
          // Ignore
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
