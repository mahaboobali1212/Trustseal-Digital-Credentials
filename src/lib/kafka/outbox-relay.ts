/**
 * TrustSeal Transactional Outbox Relay
 * Core Pillar 05 & 03: ACID Outbox to Kafka Pipeline
 *
 * Implements the Poller-Publisher pattern:
 * 1. Queries pending records in `outbox_events` table (committed atomically with credentials)
 * 2. Transmits events to Apache Kafka broker
 * 3. Updates outbox records to status 'PUBLISHED' upon broker acknowledgment (ACK)
 * 4. Ensures at-least-once delivery with zero data loss
 */

import { getPendingOutboxEvents, markOutboxEventPublished, OutboxEvent } from '@/lib/db';
import { publishKafkaEvent, KAFKA_TOPICS, KafkaTopic } from '@/lib/kafka';

export interface OutboxProcessingResult {
  processedCount: number;
  publishedEvents: string[];
  errors: Array<{ eventId: string; error: string }>;
}

/**
 * Executes a single outbox relay sweep.
 */
export async function processOutboxQueue(batchSize = 25): Promise<OutboxProcessingResult> {
  const pendingEvents: OutboxEvent[] = await getPendingOutboxEvents(batchSize);
  const result: OutboxProcessingResult = {
    processedCount: pendingEvents.length,
    publishedEvents: [],
    errors: [],
  };

  if (pendingEvents.length === 0) {
    return result;
  }

  console.log(`🔄 [Outbox Relay] Processing ${pendingEvents.length} pending events...`);

  for (const event of pendingEvents) {
    try {
      let topic: KafkaTopic = KAFKA_TOPICS.CREDENTIAL_ISSUED;
      if (event.event_type === 'CredentialRevoked') {
        topic = KAFKA_TOPICS.CREDENTIAL_REVOKED;
      } else if (event.event_type === 'CredentialVerified') {
        topic = KAFKA_TOPICS.CREDENTIAL_VERIFIED;
      }

      // Publish to Kafka
      const publishRes = await publishKafkaEvent(topic, event.aggregate_id, {
        outboxEventId: event.id,
        aggregateType: event.aggregate_type,
        aggregateId: event.aggregate_id,
        eventType: event.event_type,
        payload: event.payload,
        createdAt: event.created_at,
      });

      if (publishRes.success) {
        // Mark as published in PostgreSQL
        await markOutboxEventPublished(event.id);
        result.publishedEvents.push(event.id);
        console.log(`✅ [Outbox Relay] Event ${event.id} (${event.event_type}) marked PUBLISHED`);
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(`❌ [Outbox Relay] Failed to publish event ${event.id}:`, errorMsg);
      result.errors.push({ eventId: event.id, error: errorMsg });
    }
  }

  return result;
}

// Global daemon handle for background polling
let isRelayRunning = false;
let relayTimer: NodeJS.Timeout | null = null;

export function startOutboxRelayDaemon(intervalMs = 2000) {
  if (isRelayRunning) return;
  isRelayRunning = true;
  console.log(`🚀 [Outbox Relay Daemon] Started with polling interval ${intervalMs}ms`);

  const poll = async () => {
    try {
      await processOutboxQueue();
    } catch (err) {
      console.error('Error in outbox relay poll cycle:', err);
    }
    if (isRelayRunning) {
      relayTimer = setTimeout(poll, intervalMs);
    }
  };

  poll();
}

export function stopOutboxRelayDaemon() {
  isRelayRunning = false;
  if (relayTimer) {
    clearTimeout(relayTimer);
    relayTimer = null;
  }
  console.log('🛑 [Outbox Relay Daemon] Stopped');
}
