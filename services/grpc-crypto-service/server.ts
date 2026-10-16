/**
 * TrustSeal Cryptographic & Verification Microservice
 * Core Pillar 04: gRPC Microservice & Protocol Buffers
 *
 * Dedicated internal RPC service for high-performance cryptographic
 * hashing, signature signing, and tamper detection.
 */

import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';
import crypto from 'crypto';

const PROTO_PATH = path.resolve(__dirname, '../../proto/credential_verification.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const protoDescriptor = grpc.loadPackageDefinition(packageDefinition) as any;
const cryptoPackage = protoDescriptor.trustseal.crypto;

const SIGNING_SECRET = process.env.SIGNING_SECRET || 'dezinet-internship-secret-key-2026';

/**
 * gRPC Handler: VerifyCredential
 * Computes the cryptographic checksum and checks signature authenticity
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function verifyCredential(call: any, callback: any) {
  const req = call.request;
  const now = new Date().toISOString();

  console.log(`🔒 [gRPC Crypto Service] Received VerifyCredential for [${req.credential_id}]`);

  // Verify HMAC signature
  const expectedSignature = crypto
    .createHmac('sha256', SIGNING_SECRET)
    .update(req.sha256_hash || '')
    .digest('hex');

  const isSignatureValid = req.digital_signature === expectedSignature;

  if (!isSignatureValid) {
    console.warn(`⚠️ [gRPC Crypto Service] Tampering detected on [${req.credential_id}]!`);
    return callback(null, {
      is_valid: false,
      tampered: true,
      computed_hash: req.sha256_hash,
      verification_timestamp: now,
      message: 'Cryptographic signature mismatch. Potential certificate tampering detected.',
    });
  }

  callback(null, {
    is_valid: true,
    tampered: false,
    computed_hash: req.sha256_hash,
    verification_timestamp: now,
    message: 'Certificate authenticity verified. Cryptographic seal is intact.',
  });
}

/**
 * gRPC Handler: GenerateSeal
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function generateSeal(call: any, callback: any) {
  const req = call.request;
  const now = new Date().toISOString();

  console.log(`✍️ [gRPC Crypto Service] Generating seal for [${req.credential_id}]`);

  const payload = JSON.stringify({
    id: req.credential_id,
    recipient: req.recipient_name,
    email: req.recipient_email,
    role: req.course_or_role,
    org: req.issuing_org,
    issuedAt: req.issue_date || now,
  });

  const sha256_hash = crypto.createHash('sha256').update(payload).digest('hex');
  const digital_signature = crypto
    .createHmac('sha256', SIGNING_SECRET)
    .update(sha256_hash)
    .digest('hex');

  callback(null, {
    sha256_hash,
    digital_signature,
    algorithm: 'HMAC-SHA256',
    created_at: now,
  });
}

export function startGrpcServer(port = process.env.GRPC_PORT || '50051') {
  const server = new grpc.Server();

  server.addService(cryptoPackage.CredentialVerificationService.service, {
    VerifyCredential: verifyCredential,
    GenerateSeal: generateSeal,
  });

  const bindAddress = `0.0.0.0:${port}`;
  server.bindAsync(bindAddress, grpc.ServerCredentials.createInsecure(), (err, boundPort) => {
    if (err) {
      console.error('Failed to bind gRPC server:', err);
      return;
    }
    console.log(`⚡ [gRPC Microservice] Running on ${bindAddress} (Port ${boundPort})`);
  });

  return server;
}

if (require.main === module) {
  startGrpcServer();
}
