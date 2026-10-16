import { NextRequest, NextResponse } from 'next/server';
import { createCredentialWithOutbox, getAllCredentials } from '@/lib/db';
import { processOutboxQueue } from '@/lib/kafka/outbox-relay';

/**
 * GET /api/v1/credentials
 * Returns all issued credentials with their status and cryptographic metadata.
 */
export async function GET() {
  try {
    const credentials = await getAllCredentials();
    return NextResponse.json({
      success: true,
      count: credentials.length,
      data: credentials,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch credentials', details: message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/credentials
 * Core Pillar 05: Transactional Outbox Pattern
 *
 * Saves credential and outbox event atomically.
 * Automatically dispatches outbox events to Kafka via the Outbox Relay.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.recipient_name || !body.recipient_email || !body.course_or_role) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed: recipient_name, recipient_email, and course_or_role are required',
        },
        { status: 400 }
      );
    }

    // 1. Atomic Transaction: PostgreSQL Credential + Outbox Event
    const { credential, outboxEvent } = await createCredentialWithOutbox({
      recipient_name: body.recipient_name,
      recipient_email: body.recipient_email,
      course_or_role: body.course_or_role,
      issuing_org: body.issuing_org || 'Dezinet Engineering Labs',
      metadata: body.metadata,
    });

    // 2. Trigger asynchronous outbox relay to deliver event to Kafka
    processOutboxQueue().catch((err) => {
      console.warn('Background outbox sweep deferred:', err);
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Credential created and outbox event queued atomically.',
        data: {
          credential,
          outboxEventId: outboxEvent.id,
          verificationUrl: `/verify/${credential.id}`,
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Error in POST /api/v1/credentials:', error);
    return NextResponse.json(
      { success: false, error: 'Database transaction failed', details: message },
      { status: 500 }
    );
  }
}
