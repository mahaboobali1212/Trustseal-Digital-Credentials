/**
 * TrustSeal GraphQL Gateway
 * Core Pillar 04: GraphQL Flexible Client Queries
 *
 * Exposes a typed GraphQL API for flexible querying of credentials,
 * tamper-verification audit logs, and outbox pipeline health.
 */

import { NextRequest, NextResponse } from 'next/server';
import { graphql, buildSchema } from 'graphql';
import {
  getAllCredentials,
  getCredentialById,
  getAuditLogsForCredential,
  createCredentialWithOutbox,
  getPendingOutboxEvents,
} from '@/lib/db';
import { processOutboxQueue } from '@/lib/kafka/outbox-relay';

const schema = buildSchema(`
  type Credential {
    id: ID!
    recipient_name: String!
    recipient_email: String!
    course_or_role: String!
    issuing_org: String!
    issue_date: String!
    expiry_date: String
    status: String!
    sha256_hash: String
    digital_signature: String
    created_at: String!
    auditLogs: [AuditLog!]!
  }

  type AuditLog {
    id: ID!
    credential_id: String!
    action: String!
    actor_ip: String
    created_at: String!
  }

  type OutboxHealth {
    pendingEventsCount: Int!
    status: String!
  }

  input IssueCredentialInput {
    recipient_name: String!
    recipient_email: String!
    course_or_role: String!
    issuing_org: String
  }

  type Query {
    credentials: [Credential!]!
    credential(id: ID!): Credential
    auditLogs(credentialId: ID!): [AuditLog!]!
    outboxHealth: OutboxHealth!
  }

  type Mutation {
    issueCredential(input: IssueCredentialInput!): Credential!
  }
`);

const root = {
  credentials: async () => {
    const list = await getAllCredentials();
    return list.map((c) => ({
      ...c,
      auditLogs: async () => await getAuditLogsForCredential(c.id),
    }));
  },
  credential: async ({ id }: { id: string }) => {
    const c = await getCredentialById(id);
    if (!c) return null;
    return {
      ...c,
      auditLogs: async () => await getAuditLogsForCredential(c.id),
    };
  },
  auditLogs: async ({ credentialId }: { credentialId: string }) => {
    return await getAuditLogsForCredential(credentialId);
  },
  outboxHealth: async () => {
    const pending = await getPendingOutboxEvents(100);
    return {
      pendingEventsCount: pending.length,
      status: pending.length === 0 ? 'HEALTHY_SYNCED' : 'PROCESSING_QUEUE',
    };
  },
  issueCredential: async ({ input }: { input: any }) => {
    const { credential } = await createCredentialWithOutbox(input);
    processOutboxQueue().catch(console.error);
    return {
      ...credential,
      auditLogs: async () => await getAuditLogsForCredential(credential.id),
    };
  },
};

export async function POST(request: NextRequest) {
  try {
    const { query, variables } = await request.json();
    const result = await graphql({
      schema,
      source: query,
      rootValue: root,
      variableValues: variables,
    });
    return NextResponse.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ errors: [{ message: msg }] }, { status: 500 });
  }
}

export async function GET() {
  // Returns GraphQL introspection query help or simple schema description
  return NextResponse.json({
    status: 'TrustSeal GraphQL Engine Active',
    endpoints: {
      post: '/api/graphql',
      exampleQuery: `{ credentials { id recipient_name course_or_role status sha256_hash } }`,
    },
  });
}
