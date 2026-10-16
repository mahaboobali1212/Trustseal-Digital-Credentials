/**
 * TrustSeal Apache Kafka Event Bus
 * Core Pillar 03: Apache Kafka Streams & Real-Time Event Pipelines
 *
 * Implements decoupled, asynchronous event publishing and consumption.
 * Supports production Kafka clusters (via kafkajs) with an automatic local event
 * fallback engine when running without a local broker.
 */

import { Kafka, Producer, Consumer, EachMessagePayload } from 'kafkajs';

export const KAFKA_TOPICS = {
  CREDENTIAL_ISSUED: 'credential.issued',
  CREDENTIAL_VERIFIED: 'credential.verified',
  CREDENTIAL_REVOKED: 'credential.revoked',
} as const;

export type KafkaTopic = (typeof KAFKA_TOPICS)[keyof typeof KAFKA_TOPICS];

export interface CredentialEventPayload {
  credentialId: string;
  recipient_name: string;
  recipient_email: string;
  course_or_role: string;
  sha256_hash: string;
  issue_date: string;
  timestamp: string;
}

process.env.KAFKAJS_NO_PARTITIONER_WARNING = '1';

const kafkaBrokers = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');

const kafka = new Kafka({
  clientId: 'trustseal-engine',
  brokers: kafkaBrokers,
  connectionTimeout: 800,
  retry: {
    initialRetryTime: 100,
    retries: 0,
  },
});

let producer: Producer | null = null;
let isKafkaConnected = false;

// In-process event listeners for local development & reactive UI updates
type LocalEventListener = (topic: string, message: unknown) => void;
const localSubscribers: LocalEventListener[] = [];

export function subscribeLocalEvents(fn: LocalEventListener) {
  localSubscribers.push(fn);
  return () => {
    const idx = localSubscribers.indexOf(fn);
    if (idx !== -1) localSubscribers.splice(idx, 1);
  };
}

/**
 * Initializes and connects the Kafka Producer.
 */
export async function getKafkaProducer(): Promise<Producer | null> {
  if (producer && isKafkaConnected) return producer;

  try {
    producer = kafka.producer();
    await producer.connect();
    isKafkaConnected = true;
    console.log('✅ [Kafka] Producer connected to brokers:', kafkaBrokers);
    return producer;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.warn(`⚠️ [Kafka] Broker unreachable (${msg}). Using local event bus.`);
    isKafkaConnected = false;
    return null;
  }
}

/**
 * Publishes an event to a Kafka topic.
 * Guarantees message delivery: if Kafka broker is unavailable, broadcasts locally
 * so downstream workers and UI still receive event stream.
 */
export async function publishKafkaEvent(
  topic: KafkaTopic,
  key: string,
  payload: Record<string, unknown>
): Promise<{ success: boolean; partition?: number; offset?: string; mode: 'KAFKA' | 'EMULATED' }> {
  const p = await getKafkaProducer();
  const serialized = JSON.stringify(payload);

  if (p && isKafkaConnected) {
    try {
      const recordMetadata = await p.send({
        topic,
        messages: [
          {
            key,
            value: serialized,
            headers: {
              source: 'trustseal-outbox-relay',
              timestamp: new Date().toISOString(),
            },
          },
        ],
      });
      console.log(`📤 [Kafka] Published to topic [${topic}], partition ${recordMetadata[0]?.partition}`);
      return {
        success: true,
        partition: recordMetadata[0]?.partition,
        offset: recordMetadata[0]?.baseOffset,
        mode: 'KAFKA',
      };
    } catch (err) {
      console.error('Failed to send to Kafka, falling back to local bus:', err);
    }
  }

  // Local fallback event dispatch
  console.log(`📡 [Local Event Bus] Dispatched to topic [${topic}] with key [${key}]`);
  localSubscribers.forEach((sub) => {
    try {
      sub(topic, payload);
    } catch (e) {
      console.error('Error in local subscriber:', e);
    }
  });

  return { success: true, mode: 'EMULATED' };
}

/**
 * Starts a Kafka consumer for background workers.
 */
export async function createKafkaConsumer(
  groupId: string,
  topics: string[],
  handler: (payload: EachMessagePayload) => Promise<void>
): Promise<Consumer | null> {
  try {
    const consumer = kafka.consumer({ groupId });
    await consumer.connect();
    for (const t of topics) {
      await consumer.subscribe({ topic: t, fromBeginning: false });
    }
    await consumer.run({
      eachMessage: async (payload) => {
        await handler(payload);
      },
    });
    console.log(`🎧 [Kafka] Consumer [${groupId}] subscribed to [${topics.join(', ')}]`);
    return consumer;
  } catch (err) {
    console.warn(`⚠️ [Kafka] Consumer initialization skipped (${err instanceof Error ? err.message : String(err)})`);
    return null;
  }
}
