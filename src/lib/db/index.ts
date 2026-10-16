/**
 * TrustSeal Database & Transactional Outbox Engine
 * Core Pillar 05: PostgreSQL & ACID Outbox
 *
 * Implements the Transactional Outbox Pattern to eliminate the Dual-Write Problem.
 * Guarantees that credentials and their corresponding event records are committed
 * atomically within the same database transaction.
 *
 * In local developer mode (when PostgreSQL is not connected), uses a persistent
 * JSON disk storage engine in `data/` so credentials survive server restarts.
 */

import { Pool, PoolClient } from 'pg';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

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

// ====================================================================
// Local Disk Persistence Engine (Survives Server Restarts)
// ====================================================================
const DATA_DIR = path.resolve(process.cwd(), 'data');
const CREDENTIALS_FILE = path.join(DATA_DIR, 'credentials.json');
const OUTBOX_FILE = path.join(DATA_DIR, 'outbox.json');
const AUDIT_FILE = path.join(DATA_DIR, 'audit_logs.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadLocalStore(): {
  credentials: Map<string, CredentialRecord>;
  outbox: Map<string, OutboxEvent>;
  auditLogs: AuditLog[];
} {
  ensureDataDir();
  const credentialsMap = new Map<string, CredentialRecord>();
  const outboxMap = new Map<string, OutboxEvent>();
  let auditLogs: AuditLog[] = [];

  // Seed default demonstration certificate for instant testing
  const seedCredId = 'DEZI-2026-A80B3C';
  const seedTimestamp = new Date().toISOString();
  const seedPayload = JSON.stringify({
    id: seedCredId,
    recipient: 'SHAIK MAHABOOB ALI',
    email: 'mahaboob@college.edu',
    role: 'Java Full Stack Developer',
    org: 'EduSkills & APSCHE (TrustSeal Authority)',
    issuedAt: seedTimestamp,
  });
  const seedHash = crypto.createHash('sha256').update(seedPayload).digest('hex');
  const seedSignature = crypto
    .createHmac('sha256', process.env.SIGNING_SECRET || 'dezinet-internship-secret-key-2026')
    .update(seedHash)
    .digest('hex');

  const defaultSeed: CredentialRecord = {
    id: seedCredId,
    recipient_name: 'SHAIK MAHABOOB ALI',
    recipient_email: 'mahaboob@college.edu',
    course_or_role: 'Java Full Stack Developer',
    issuing_org: 'EduSkills & APSCHE (TrustSeal Authority)',
    issue_date: seedTimestamp,
    status: 'SEALED',
    sha256_hash: seedHash,
    digital_signature: seedSignature,
    created_at: seedTimestamp,
    updated_at: seedTimestamp,
  };
  credentialsMap.set(seedCredId, defaultSeed);

  try {
    if (fs.existsSync(CREDENTIALS_FILE)) {
      const data = JSON.parse(fs.readFileSync(CREDENTIALS_FILE, 'utf-8'));
      if (Array.isArray(data)) {
        data.forEach((c: CredentialRecord) => credentialsMap.set(c.id, c));
      }
    }
    if (fs.existsSync(OUTBOX_FILE)) {
      const data = JSON.parse(fs.readFileSync(OUTBOX_FILE, 'utf-8'));
      if (Array.isArray(data)) {
        data.forEach((o: OutboxEvent) => outboxMap.set(o.id, o));
      }
    }
    if (fs.existsSync(AUDIT_FILE)) {
      auditLogs = JSON.parse(fs.readFileSync(AUDIT_FILE, 'utf-8'));
    }
  } catch (err) {
    console.warn('Could not read local data store, initialized with defaults:', err);
  }

  return { credentials: credentialsMap, outbox: outboxMap, auditLogs };
}

const localStore = loadLocalStore();

function saveLocalStore() {
  try {
    ensureDataDir();
    fs.writeFileSync(
      CREDENTIALS_FILE,
      JSON.stringify(Array.from(localStore.credentials.values()), null, 2),
      'utf-8'
    );
    fs.writeFileSync(
      OUTBOX_FILE,
      JSON.stringify(Array.from(localStore.outbox.values()), null, 2),
      'utf-8'
    );
    fs.writeFileSync(AUDIT_FILE, JSON.stringify(localStore.auditLogs, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save local store:', err);
  }
}

// Save initial seed if file doesn't exist
saveLocalStore();

// ====================================================================
// PostgreSQL Pool configuration
// ====================================================================
const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    'postgresql://postgres:postgres@localhost:5432/trustseal',
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

let isPostgresAvailable: boolean | null = null;

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
    isPostgresAvailable = false;
    return false;
  }
}

async function initializeTables() {
  try {
    const sql = `
      CREATE TABLE IF NOT EXISTS credentials (
        id VARCHAR(64) PRIMARY KEY,
        recipient_name VARCHAR(255) NOT NULL,
        recipient_email VARCHAR(255) NOT NULL,
        course_or_role VARCHAR(255) NOT NULL,
        issuing_org VARCHAR(255) NOT NULL DEFAULT 'TrustSeal Credential Authority',
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
 */
export async function createCredentialWithOutbox(data: {
  recipient_name: string;
  recipient_email: string;
  course_or_role: string;
  issuing_org?: string;
  expiry_date?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<{ credential: CredentialRecord; outboxEvent: OutboxEvent }> {
  const credentialId = `DEZI-2026-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  const now = new Date().toISOString();

  const payloadToHash = JSON.stringify({
    id: credentialId,
    recipient: data.recipient_name,
    email: data.recipient_email,
    role: data.course_or_role,
    org: data.issuing_org || 'TrustSeal Credential Authority',
    issuedAt: now,
  });
  const sha256_hash = crypto.createHash('sha256').update(payloadToHash).digest('hex');

  const digital_signature = crypto
    .createHmac('sha256', process.env.SIGNING_SECRET || 'dezinet-internship-secret-key-2026')
    .update(sha256_hash)
    .digest('hex');

  const credential: CredentialRecord = {
    id: credentialId,
    recipient_name: data.recipient_name,
    recipient_email: data.recipient_email,
    course_or_role: data.course_or_role,
    issuing_org: data.issuing_org || 'TrustSeal Credential Authority',
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
    // Persistent disk storage
    localStore.credentials.set(credential.id, credential);
    localStore.outbox.set(outboxEvent.id, outboxEvent);
    saveLocalStore();
  }

  return { credential, outboxEvent };
}

export async function getAllCredentials(): Promise<CredentialRecord[]> {
  const hasPostgres = await checkDatabaseConnection();
  if (hasPostgres) {
    const res = await pool.query('SELECT * FROM credentials ORDER BY created_at DESC');
    return res.rows;
  }
  return Array.from(localStore.credentials.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export async function getCredentialById(id: string): Promise<CredentialRecord | null> {
  const hasPostgres = await checkDatabaseConnection();
  if (hasPostgres) {
    const res = await pool.query('SELECT * FROM credentials WHERE id = $1', [id]);
    return res.rows[0] || null;
  }
  return localStore.credentials.get(id) || null;
}

export async function getPendingOutboxEvents(limit = 20): Promise<OutboxEvent[]> {
  const hasPostgres = await checkDatabaseConnection();
  if (hasPostgres) {
    const res = await pool.query(
      `SELECT * FROM outbox_events WHERE status = 'PENDING' ORDER BY created_at ASC LIMIT $1`,
      [limit]
    );
    return res.rows;
  }
  return Array.from(localStore.outbox.values())
    .filter((e) => e.status === 'PENDING')
    .slice(0, limit);
}

export async function markOutboxEventPublished(id: string): Promise<void> {
  const hasPostgres = await checkDatabaseConnection();
  const now = new Date().toISOString();
  if (hasPostgres) {
    await pool.query(
      `UPDATE outbox_events SET status = 'PUBLISHED', published_at = $1 WHERE id = $2`,
      [now, id]
    );
  } else {
    const event = localStore.outbox.get(id);
    if (event) {
      event.status = 'PUBLISHED';
      event.published_at = now;
      saveLocalStore();
    }
  }
}

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
    localStore.auditLogs.unshift(record);
    saveLocalStore();
  }
  return record;
}

export async function getAuditLogsForCredential(credentialId: string): Promise<AuditLog[]> {
  const hasPostgres = await checkDatabaseConnection();
  if (hasPostgres) {
    const res = await pool.query(
      `SELECT * FROM audit_logs WHERE credential_id = $1 ORDER BY created_at DESC`,
      [credentialId]
    );
    return res.rows;
  }
  return localStore.auditLogs.filter((l) => l.credential_id === credentialId);
}
