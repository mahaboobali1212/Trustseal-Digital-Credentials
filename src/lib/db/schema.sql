-- ====================================================================
-- TrustSeal: PostgreSQL Relational Schema & ACID Outbox
-- Core Pillar 05: PostgreSQL Relational Schema Design & ACID Outbox
-- ====================================================================

-- 1. Credentials Table: Source of Truth for Issued Certificates
CREATE TABLE IF NOT EXISTS credentials (
    id VARCHAR(64) PRIMARY KEY,
    recipient_name VARCHAR(255) NOT NULL,
    recipient_email VARCHAR(255) NOT NULL,
    course_or_role VARCHAR(255) NOT NULL,
    issuing_org VARCHAR(255) NOT NULL DEFAULT 'Dezinet Engineering Labs',
    issue_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expiry_date TIMESTAMPTZ,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING', -- PENDING, SEALED, REVOKED
    sha256_hash VARCHAR(64),
    digital_signature TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast recipient search and status filtering
CREATE INDEX IF NOT EXISTS idx_credentials_recipient_email ON credentials(recipient_email);
CREATE INDEX IF NOT EXISTS idx_credentials_status ON credentials(status);
CREATE INDEX IF NOT EXISTS idx_credentials_created_at ON credentials(created_at DESC);

-- 2. Transactional Outbox Table: Guarantees Zero Lost Events
-- Written within the SAME database transaction as the credential insert.
CREATE TABLE IF NOT EXISTS outbox_events (
    id VARCHAR(64) PRIMARY KEY,
    aggregate_type VARCHAR(64) NOT NULL DEFAULT 'CREDENTIAL',
    aggregate_id VARCHAR(64) NOT NULL,
    event_type VARCHAR(64) NOT NULL, -- CredentialIssued, CredentialRevoked, CredentialVerified
    payload JSONB NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING', -- PENDING, PUBLISHED, FAILED
    retry_count INT NOT NULL DEFAULT 0,
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    published_at TIMESTAMPTZ
);

-- Index for the outbox polling worker (FIFO queue)
CREATE INDEX IF NOT EXISTS idx_outbox_status_created ON outbox_events(status, created_at ASC);

-- 3. Audit Logs Table: Immutability & Compliance Trail
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(64) PRIMARY KEY,
    credential_id VARCHAR(64) NOT NULL REFERENCES credentials(id) ON DELETE CASCADE,
    action VARCHAR(64) NOT NULL, -- ISSUED, VERIFIED_SUCCESS, VERIFIED_TAMPERED, REVOKED
    actor_ip VARCHAR(64),
    user_agent TEXT,
    details JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_credential_id ON audit_logs(credential_id);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_logs(created_at DESC);
