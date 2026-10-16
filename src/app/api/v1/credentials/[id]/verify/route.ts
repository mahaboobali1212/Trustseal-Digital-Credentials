import { NextRequest, NextResponse } from 'next/server';
import { getCredentialById, recordAuditLog } from '@/lib/db';
import { getCachedCredential, setCachedCredential } from '@/lib/redis';
import { verifyCredentialViaGrpc } from '@/lib/grpc/client';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = performance.now();
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ success: false, error: 'Missing credential ID' }, { status: 400 });
  }

  try {
    // 1. Core Pillar 06: Redis Cache-Aside Lookup (Sub-2ms target)
    const cached = await getCachedCredential<any>(id);
    if (cached) {
      const latencyMs = Number((performance.now() - startTime).toFixed(2));
      return NextResponse.json({
        success: true,
        source: 'REDIS_CACHE',
        latencyMs,
        data: cached,
      });
    }

    // 2. Core Pillar 05: Database Lookup
    const credential = await getCredentialById(id);
    if (!credential) {
      return NextResponse.json(
        {
          success: false,
          error: 'Credential not found',
          message: 'The requested certificate ID does not exist in the registry.',
        },
        { status: 404 }
      );
    }

    // 3. Core Pillar 04: Inter-Service gRPC Cryptographic Verification
    const grpcResult = await verifyCredentialViaGrpc({
      credential_id: credential.id,
      recipient_name: credential.recipient_name,
      course_or_role: credential.course_or_role,
      issuing_org: credential.issuing_org,
      sha256_hash: credential.sha256_hash || '',
      digital_signature: credential.digital_signature || '',
    });

    const verificationPayload = {
      credential,
      verification: grpcResult,
      verifiedAt: new Date().toISOString(),
    };

    // 4. Populate Redis Cache (1 Hour TTL)
    await setCachedCredential(id, verificationPayload, 3600);

    // 5. Asynchronous Audit Logging
    const clientIp = request.headers.get('x-forwarded-for') || '127.0.0.1';
    recordAuditLog({
      credential_id: id,
      action: grpcResult.is_valid ? 'VERIFIED_SUCCESS' : 'VERIFIED_TAMPERED',
      actor_ip: clientIp,
      user_agent: request.headers.get('user-agent') || 'Browser',
      details: {
        latencyMs: Number((performance.now() - startTime).toFixed(2)),
        transport: grpcResult.transport,
      },
    }).catch(console.error);

    const latencyMs = Number((performance.now() - startTime).toFixed(2));

    return NextResponse.json({
      success: true,
      source: 'DATABASE_GRPC',
      latencyMs,
      data: verificationPayload,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, error: 'Verification failed', details: msg },
      { status: 500 }
    );
  }
}
