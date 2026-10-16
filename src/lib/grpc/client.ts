/**
 * TrustSeal gRPC Client
 * Core Pillar 04: gRPC Inter-Service Communication
 *
 * Connects Next.js API Gateway to the internal gRPC Cryptographic Microservice.
 */

import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';
import crypto from 'crypto';

const PROTO_PATH = path.resolve(process.cwd(), 'proto/credential_verification.proto');

export interface VerifyCredentialRPCParams {
  credential_id: string;
  recipient_name: string;
  course_or_role: string;
  issuing_org: string;
  sha256_hash: string;
  digital_signature: string;
}

export interface VerifyCredentialRPCResult {
  is_valid: boolean;
  tampered: boolean;
  computed_hash: string;
  verification_timestamp: string;
  message: string;
  transport: 'gRPC' | 'IN_PROCESS';
}

let grpcClient: any = null;

function getGrpcClient() {
  if (grpcClient) return grpcClient;
  try {
    const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const proto = grpc.loadPackageDefinition(packageDefinition) as any;
    const target = process.env.GRPC_SERVER_TARGET || 'localhost:50051';
    grpcClient = new proto.trustseal.crypto.CredentialVerificationService(
      target,
      grpc.credentials.createInsecure()
    );
    return grpcClient;
  } catch (err) {
    console.warn('gRPC proto load failed, fallback will be used:', err);
    return null;
  }
}

/**
 * Executes VerifyCredential RPC call to the gRPC microservice.
 */
export async function verifyCredentialViaGrpc(
  params: VerifyCredentialRPCParams
): Promise<VerifyCredentialRPCResult> {
  const client = getGrpcClient();

  if (client) {
    try {
      const result = await new Promise<any>((resolve, reject) => {
        const deadline = new Date(Date.now() + 1500); // 1.5s timeout
        client.VerifyCredential(params, { deadline }, (err: any, response: any) => {
          if (err) return reject(err);
          resolve(response);
        });
      });

      return {
        ...result,
        transport: 'gRPC',
      };
    } catch (grpcErr) {
      console.warn(`[gRPC Client] Connection to gRPC microservice timed out, using fallback.`);
    }
  }

  // Graceful in-process cryptographic fallback (identic logic)
  const SIGNING_SECRET = process.env.SIGNING_SECRET || 'dezinet-internship-secret-key-2026';
  const expectedSig = crypto
    .createHmac('sha256', SIGNING_SECRET)
    .update(params.sha256_hash || '')
    .digest('hex');

  const isValid = params.digital_signature === expectedSig;
  return {
    is_valid: isValid,
    tampered: !isValid,
    computed_hash: params.sha256_hash,
    verification_timestamp: new Date().toISOString(),
    message: isValid
      ? 'Authenticity verified via cryptographic seal.'
      : 'Cryptographic signature mismatch. Potential certificate tampering.',
    transport: 'IN_PROCESS',
  };
}
