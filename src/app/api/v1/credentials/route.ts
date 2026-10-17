import { NextRequest, NextResponse } from 'next/server';
import { createCredentialWithOutbox, getAllCredentials } from '@/lib/db';
import { processOutboxQueue } from '@/lib/kafka/outbox-relay';

/**
 * GET /api/v1/credentials
 * Returns all issued credentials with their status and cryptographic metadata.
 * Includes no-store cache control headers to guarantee immediate refresh.
 */
export async function GET(request: NextRequest) {
  try {
    const credentials = await getAllCredentials();
    return NextResponse.json(
      {
        success: true,
        count: credentials.length,
        data: credentials,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          Pragma: 'no-cache',
        },
      }
    );
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
 * Saves credential, company customization preferences, and outbox event atomically.
 * Dispatches outbox events to Kafka via the Outbox Relay.
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

    // Build rich company customization metadata
    const metadata: Record<string, unknown> = {
      certificate_type: body.certificate_type || 'INTERNSHIP',
      certificate_title:
        body.certificate_title || 'Certificate of Achievement & Practical Engineering Completion',
      certificate_subtitle:
        body.certificate_subtitle || 'Recognized Practical Engineering Certification & Experience Verification',
      custom_description:
        body.custom_description ||
        `In recognition of outstanding performance and completion of the intensive software engineering program in ${body.course_or_role}. Demonstrating practical mastery in distributed architectures, transactional reliability, and secure cryptographic verification.`,
      department: body.department || 'Engineering & Technology',
      signatory_name: body.signatory_name || 'Director of Engineering',
      signatory_title: body.signatory_title || 'Authorized Credential Signatory',
      custom_fields: Array.isArray(body.custom_fields) ? body.custom_fields : [],
      ...(body.metadata || {}),
    };

    // 1. Atomic Transaction: PostgreSQL / Disk Store Credential + Outbox Event
    const { credential, outboxEvent } = await createCredentialWithOutbox({
      recipient_name: body.recipient_name,
      recipient_email: body.recipient_email,
      course_or_role: body.course_or_role,
      issuing_org: body.issuing_org || 'Dezinet Engineering Labs',
      metadata,
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
      {
        status: 201,
        headers: {
          'Cache-Control': 'no-store, no-cache, max-age=0',
        },
      }
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
