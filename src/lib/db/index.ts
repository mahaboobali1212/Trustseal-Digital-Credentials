/**
 * TrustSeal Database & Transactional Outbox Engine
 * Core Pillar 05: PostgreSQL & ACID Outbox
 *
 * Implements the Transactional Outbox Pattern to eliminate the Dual-Write Problem.
 * Guarantees that credentials and their corresponding event records are committed
 * atomically within the same database transaction.
 */

import { Pool, PoolClient } from 'pg';
import crypto from 'crypto';

export interface CredentialRecord {
  id: string;
  recipient_name: string;
  recipient_email: string;
  course_or_role: string;
  issuing_org: string;
  issue_date: string;
  expiry_date?: string | null;
  status: 'PENDING' | 'SEALED' | 'REVOKED';
  sha256_hash?: string | null;
  digital_signature?: string | null;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface OutboxEvent {
  id: string;
  aggregate_type: string;
  aggregate_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  status: 'PENDING' | 'PUBLISHED' | 'FAILED';
  retry_count: number;
  last_error?: string | null;
  created_at: string;
  published_at?: string | null;
}

export interface AuditLog {
  id: string;
  credential_id: string;
  action: 'ISSUED' | 'VERIFIED_SUCCESS' | 'VERIFIED_TAMPERED' | 'REVOKED';
  actor_ip?: string;
  user_agent?: string;
  details?: Record<string, unknown>;
  created_at: string;
}

// Global in-memory fallback state for zero-dependency local testing
const inMemoryStore = {
  credentials: new Map<string, CredentialRecord>(),
  outbox: new Map<string, OutboxEvent>(),
  auditLogs: [] as AuditLog[],
};

// PostgreSQL Pool configuration
const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    'postgresql://postgres:postgres@localhost:5432/trustseal',
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

let isPostgresAvailable: boolean | null = null;

/**
 * Checks if the PostgreSQL server is reachable.
 */
export async function checkDatabaseConnection(): Promise<boolean> {
  if (isPostgresAvailable !== null) return isPostgresAvailable;
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    isPostgresAvailable = true;
    console.log('✅ [PostgreSQL] Connected successfully to database');
    await initializeTables();
    return true;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(
      `⚠️ [PostgreSQL] Connection failed (${message}). Falling back to in-memory ACID store.`
    );
    isPostgresAvailable = false;
    return false;
  }
}

/**
 * Ensures required tables exist when PostgreSQL is available.
 */
async function initializeTables() {
  try {
    const sql = `
      CREATE TABLE IF NOT EXISTS credentials (
        id VARCHAR(64) PRIMARY KEY,
        recipient_name VARCHAR(255) NOT NULL,
        recipient_email VARCHAR(255) NOT NULL,
        course_or_role VARCHAR(255) NOT NULL,
        issuing_org VARCHAR(255) NOT NULL DEFAULT 'Dezinet Engineering Labs',
        issue_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        expiry_date TIMESTAMPTZ,
        status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
        sha256_hash VARCHAR(64),
        digital_signature TEXT,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS outbox_events (
        id VARCHAR(64) PRIMARY KEY,
        aggregate_type VARCHAR(64) NOT NULL DEFAULT 'CREDENTIAL',
        aggregate_id VARCHAR(64) NOT NULL,
        event_type VARCHAR(64) NOT NULL,
        payload JSONB NOT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
        retry_count INT NOT NULL DEFAULT 0,
        last_error TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        published_at TIMESTAMPTZ
      );
      CREATE TABLE IF NOT EXISTS audit_logs (
        id VARCHAR(64) PRIMARY KEY,
        credential_id VARCHAR(64) NOT NULL,
        action VARCHAR(64) NOT NULL,
        actor_ip VARCHAR(64),
        user_agent TEXT,
        details JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await pool.query(sql);
  } catch (err) {
    console.error('Failed to initialize PostgreSQL schema:', err);
  }
}

/**
 * CORE PILLAR 05: The Transactional Outbox Pattern
 *
 * Saves the credential AND writes the outbox event in a single atomic transaction.
 * If either step fails, the entire transaction rolls back.
 */
export async function createCredentialWithOutbox(data: {
  recipient_name: string;
  recipient_email: string;
  course_or_role: string;
  issuing_org?: string;
  expiry_date?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<{ credential: CredentialRecord; outboxEvent: OutboxEvent }> {
  const credentialId = `DEZI-${new Date().getFullYear()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  const now = new Date().toISOString();

  // 1. Compute deterministic SHA-256 fingerprint for tamper-proofing
  const payloadToHash = JSON.stringify({
    id: credentialId,
    recipient: data.recipient_name,
    email: data.recipient_email,
    role: data.course_or_role,
    org: data.issuing_org || 'Dezinet Engineering Labs',
    issuedAt: now,
  });
  const sha256_hash = crypto.createHash('sha256').update(payloadToHash).digest('hex');

  // Simulated HMAC digital signature (in real production, signed by the gRPC crypto service private key)
  const digital_signature = crypto
    .createHmac('sha256', process.env.SIGNING_SECRET || 'dezinet-internship-secret-key-2026')
    .update(sha256_hash)
    .digest('hex');

  const credential: CredentialRecord = {
    id: credentialId,
    recipient_name: data.recipient_name,
    recipient_email: data.recipient_email,
    course_or_role: data.course_or_role,
    issuing_org: data.issuing_org || 'Dezinet Engineering Labs',
    issue_date: now,
    expiry_date: data.expiry_date || null,
    status: 'SEALED',
    sha256_hash,
    digital_signature,
    metadata: data.metadata || {},
    created_at: now,
    updated_at: now,
  };

  const outboxEventId = crypto.randomUUID();
  const outboxEvent: OutboxEvent = {
    id: outboxEventId,
    aggregate_type: 'CREDENTIAL',
    aggregate_id: credentialId,
    event_type: 'CredentialIssued',
    payload: {
      credentialId,
      recipient_name: credential.recipient_name,
      recipient_email: credential.recipient_email,
      course_or_role: credential.course_or_role,
      sha256_hash: credential.sha256_hash,
      issue_date: credential.issue_date,
    },
    status: 'PENDING',
    retry_count: 0,
    created_at: now,
  };

  const hasPostgres = await checkDatabaseConnection();

  if (hasPostgres) {
    const client: PoolClient = await pool.connect();
    try {
      // ATOMIC TRANSACTION: Both inserts succeed or both fail
      await client.query('BEGIN');

      const insertCredSql = `
        INSERT INTO credentials (
          id, recipient_name, recipient_email, course_or_role, issuing_org,
          issue_date, expiry_date, status, sha256_hash, digital_signature,
          metadata, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      `;
      await client.query(insertCredSql, [
        credential.id,
        credential.recipient_name,
        credential.recipient_email,
        credential.course_or_role,
        credential.issuing_org,
        credential.issue_date,
        credential.expiry_date,
        credential.status,
        credential.sha256_hash,
        credential.digital_signature,
        JSON.stringify(credential.metadata),
        credential.created_at,
        credential.updated_at,
      ]);

      const insertOutboxSql = `
        INSERT INTO outbox_events (
          id, aggregate_type, aggregate_id, event_type, payload, status, retry_count, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `;
      await client.query(insertOutboxSql, [
        outboxEvent.id,
        outboxEvent.aggregate_type,
        outboxEvent.aggregate_id,
        outboxEvent.event_type,
        JSON.stringify(outboxEvent.payload),
        outboxEvent.status,
        outboxEvent.retry_count,
        outboxEvent.created_at,
      ]);

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } else {
    // In-memory atomic store
    inMemoryStore.credentials.set(credential.id, credential);
    inMemoryStore.outbox.set(outboxEvent.id, outboxEvent);
  }

  return { credential, outboxEvent };
}

/**
 * Fetches all credentials ordered by creation date.
 */
export async function getAllCredentials(): Promise<CredentialRecord[]> {
  const hasPostgres = await checkDatabaseConnection();
  if (hasPostgres) {
    const res = await pool.query('SELECT * FROM credentials ORDER BY created_at DESC');
    return res.rows;
  }
  return Array.from(inMemoryStore.credentials.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

/**
 * Fetches a single credential by ID.
 */
export async function getCredentialById(id: string): Promise<CredentialRecord | null> {
  const hasPostgres = await checkDatabaseConnection();
  if (hasPostgres) {
    const res = await pool.query('SELECT * FROM credentials WHERE id = $1', [id]);
    return res.rows[0] || null;
  }
  return inMemoryStore.credentials.get(id) || null;
}

/**
 * Retrieves uncommitted/pending outbox events for the Kafka Relay Worker.
 */
export async function getPendingOutboxEvents(limit = 20): Promise<OutboxEvent[]> {
  const hasPostgres = await checkDatabaseConnection();
  if (hasPostgres) {
    const res = await pool.query(
      `SELECT * FROM outbox_events WHERE status = 'PENDING' ORDER BY created_at ASC LIMIT $1`,
      [limit]
    );
    return res.rows;
  }
  return Array.from(inMemoryStore.outbox.values())
    .filter((e) => e.status === 'PENDING')
    .slice(0, limit);
}

/**
 * Marks an outbox event as published after Kafka ACK.
 */
export async function markOutboxEventPublished(id: string): Promise<void> {
  const hasPostgres = await checkDatabaseConnection();
  const now = new Date().toISOString();
  if (hasPostgres) {
    await pool.query(
      `UPDATE outbox_events SET status = 'PUBLISHED', published_at = $1 WHERE id = $2`,
      [now, id]
    );
  } else {
    const event = inMemoryStore.outbox.get(id);
    if (event) {
      event.status = 'PUBLISHED';
      event.published_at = now;
    }
  }
}

/**
 * Records an audit log entry.
 */
export async function recordAuditLog(log: Omit<AuditLog, 'id' | 'created_at'>): Promise<AuditLog> {
  const record: AuditLog = {
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    ...log,
  };
  const hasPostgres = await checkDatabaseConnection();
  if (hasPostgres) {
    await pool.query(
      `INSERT INTO audit_logs (id, credential_id, action, actor_ip, user_agent, details, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        record.id,
        record.credential_id,
        record.action,
        record.actor_ip || null,
        record.user_agent || null,
        JSON.stringify(record.details || {}),
        record.created_at,
      ]
    );
  } else {
    inMemoryStore.auditLogs.unshift(record);
  }
  return record;
}

/**
 * Retrieves audit logs for a given credential.
 */
export async function getAuditLogsForCredential(credentialId: string): Promise<AuditLog[]> {
  const hasPostgres = await checkDatabaseConnection();
  if (hasPostgres) {
    const res = await pool.query(
      `SELECT * FROM audit_logs WHERE credential_id = $1 ORDER BY created_at DESC`,
      [credentialId]
    );
    return res.rows;
  }
  return inMemoryStore.auditLogs.filter((l) => l.credential_id === credentialId);
}
