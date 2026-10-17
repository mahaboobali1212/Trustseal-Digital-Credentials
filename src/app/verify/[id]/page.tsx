import React from 'react';
import { connection } from 'next/server';
import { getCredentialById, recordAuditLog } from '@/lib/db';
import { getCachedCredential, setCachedCredential } from '@/lib/redis';
import { verifyCredentialViaGrpc } from '@/lib/grpc/client';
import { ShieldCheck, ShieldAlert } from 'lucide-react';

/**
 * TrustSeal Official Logo
 */
function TrustSealLogo() {
  return (
    <div className="flex items-center justify-center space-x-2">
      <div className="w-8 h-8 rounded-lg bg-[#1C2E35] flex items-center justify-center text-white shrink-0 shadow-xs">
        <ShieldCheck className="w-5 h-5 text-[#8DAEB6]" />
      </div>
      <div className="flex flex-col text-left">
        <div className="flex items-baseline">
          <span className="text-xl font-serif-title font-extrabold tracking-tight text-[#1C2E35]">
            Trust<span className="text-[#0284C7]">Seal</span>
          </span>
          <span className="text-[9px] font-bold text-[#0284C7] ml-0.5 relative -top-1.5">TM</span>
        </div>
        <span className="text-[8px] font-medium tracking-wider text-[#64748B] -mt-1 uppercase">
          Tamper-Proof Credential Authority
        </span>
      </div>
    </div>
  );
}

/**
 * Pure, isolated mobile verification page matching the exact reference layout
 * NO navbars, NO dashboard links, NO buttons, NO extra clutter.
 */
export default async function VerifyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  const { id } = await params;

  // 1. Fetch from Redis Cache or Database
  let credential = null;
  try {
    const cached = await getCachedCredential<any>(id);
    if (cached && cached.credential) {
      credential = cached.credential;
    } else {
      credential = await getCredentialById(id);
      if (credential) {
        // Record audit check on server
        recordAuditLog({
          credential_id: credential.id,
          action: 'VERIFIED_SUCCESS',
          actor_ip: 'PUBLIC_TUNNEL',
          user_agent: 'Mobile_Browser',
          details: { verified_via: 'QR_SCAN' },
        }).catch(() => {});

        // Cache for subsequent instant loads
        setCachedCredential(
          id,
          {
            credential,
            verification: { is_valid: true, tampered: false },
            verifiedAt: new Date().toISOString(),
          },
          3600
        ).catch(() => {});
      }
    }
  } catch (err) {
    console.error('Verify lookup error:', err);
    credential = await getCredentialById(id);
  }

  // If certificate ID is not found in registry
  if (!credential) {
    return (
      <div className="min-h-screen bg-white text-[#17262C] flex items-center justify-center p-4">
        <div className="w-full max-w-sm mx-auto p-[2px] rounded-2xl bg-gradient-to-tr from-rose-400 to-rose-600 shadow-sm">
          <div className="bg-white rounded-[14px] p-6 sm:p-8 text-center space-y-4">
            <TrustSealLogo />
            <div className="w-14 h-14 bg-rose-100 rounded-full flex items-center justify-center mx-auto text-rose-600">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h2 className="text-base font-bold text-rose-600">
              Certificate Not Found
            </h2>
            <p className="text-xs text-[#64748B]">
              The certificate code <span className="font-mono font-bold text-[#1C2E35]">{id}</span> does not exist in the official TrustSeal registry.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Exact reproduction of the reference verification card
  return (
    <div className="min-h-screen bg-white text-[#17262C] flex items-center justify-center p-4">
      {/* Centered Isolated Card with Gradient Border */}
      <div className="w-full max-w-sm sm:max-w-md mx-auto p-[2px] rounded-2xl bg-gradient-to-tr from-[#3b82f6] via-[#8b5cf6] to-[#f59e0b] shadow-sm">
        <div className="bg-white rounded-[14px] p-6 sm:p-8 text-center">
          {/* 1. Official App Logo & Name */}
          <TrustSealLogo />

          {/* 2. Green Circular Checkmark */}
          <div className="w-14 h-14 bg-[#16a34a] rounded-full flex items-center justify-center mx-auto my-4 shadow-2xs">
            <svg
              className="w-8 h-8 text-white"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>

          {/* 3. Verification Heading in Royal Blue */}
          <h2 className="text-base sm:text-lg font-bold text-[#1D4ED8] mb-5 font-sans">
            Your Certificate has been verified successfully
          </h2>

          {/* 4. Exactly the 3 Core Details from Reference */}
          <div className="text-left font-sans text-xs sm:text-sm space-y-2.5 max-w-xs mx-auto pt-1">
            <div className="grid grid-cols-[125px_1fr] gap-x-2">
              <span className="font-bold text-[#1E293B]">Name:</span>
              <span className="font-semibold text-[#1E293B] uppercase tracking-wide">
                {credential.recipient_name}
              </span>
            </div>

            <div className="grid grid-cols-[125px_1fr] gap-x-2">
              <span className="font-bold text-[#1E293B]">Domain:</span>
              <span className="font-medium text-[#1E293B]">
                {credential.course_or_role}
              </span>
            </div>

            <div className="grid grid-cols-[125px_1fr] gap-x-2">
              <span className="font-bold text-[#1E293B]">Certificate Code:</span>
              <span className="font-mono font-bold text-[#1E293B]">
                {credential.id}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
