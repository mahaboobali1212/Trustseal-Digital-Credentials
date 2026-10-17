import React from 'react';
import fs from 'fs';
import path from 'path';
import Link from 'next/link';
import { connection } from 'next/server';
import QRCode from 'qrcode';
import { getCredentialById } from '@/lib/db';
import { ArrowLeft } from 'lucide-react';
import CertificatePrintButton from './CertificatePrintButton';

function getActivePublicBaseUrl(): string {
  try {
    const tunnelFile = path.join(process.cwd(), 'data', 'tunnel-url.txt');
    if (fs.existsSync(tunnelFile)) {
      const content = fs.readFileSync(tunnelFile, 'utf-8').trim();
      if (content.startsWith('http://') || content.startsWith('https://')) {
        return content;
      }
    }
  } catch {
    // Fallback
  }
  return process.env.NEXT_PUBLIC_BASE_URL || 'https://parish-investments-instances-email.trycloudflare.com';
}

export default async function CertificatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  const { id } = await params;
  const credential = await getCredentialById(id);

  if (!credential) {
    return (
      <div className="min-h-screen bg-[#F4F6F8] flex items-center justify-center p-4">
        <div className="bg-white border border-rose-200 rounded-2xl p-8 text-center max-w-md shadow-md">
          <h2 className="text-xl font-bold text-[#1C2E35] mb-2">Certificate Not Found</h2>
          <p className="text-xs text-[#64748B] mb-4">
            No certificate found matching code <span className="font-mono font-bold">{id}</span>.
          </p>
          <Link
            href="/dashboard"
            className="inline-block bg-[#1C2E35] text-white text-xs font-semibold px-4 py-2 rounded-xl"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Generate real scannable QR Code pointing to mobile verification card
  const baseUrl = getActivePublicBaseUrl();
  const verifyUrl = `${baseUrl}/verify/${credential.id}`;
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
    width: 320,
    margin: 1,
    errorCorrectionLevel: 'M',
    color: {
      dark: '#1C2E35',
      light: '#ffffff',
    },
  });

  const meta = (credential.metadata || {}) as Record<string, any>;

  const recipientName = credential.recipient_name || 'Recipient Name';
  const issuingOrg = credential.issuing_org || 'TrustSeal Credential Authority';
  const certTitle = meta.certificate_title || 'Certificate of Internship & Practical Completion';
  const certSubtitle = meta.certificate_subtitle || 'Recognized Practical Skill Verification & Professional Endorsement';
  const customDescription =
    meta.custom_description ||
    `In recognition of outstanding performance and completion of the intensive software engineering program in ${credential.course_or_role}. Demonstrating practical mastery in enterprise application engineering, API development, and secure cryptographic verification.`;

  const signatoryName = meta.signatory_name || 'Director of Engineering';
  const signatoryTitle = meta.signatory_title || 'Authorized Credential Signatory';

  const issueDateStr = new Date(credential.issue_date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="min-h-screen bg-[#EAF1F3] text-[#17262C] flex flex-col font-sans py-6 px-4 print:p-0 print:bg-white">
      {/* Top Issuer Navigation Toolbar (Hidden during print) */}
      <div className="no-print max-w-4xl mx-auto w-full mb-6 flex items-center justify-between bg-white border border-[#D5E3E6] rounded-2xl px-5 py-3 shadow-xs">
        <Link
          href="/dashboard"
          className="inline-flex items-center text-xs font-bold text-[#1C2E35] hover:text-[#0284C7] bg-[#F8FAFB] hover:bg-[#EAF1F3] border border-[#D5E3E6] px-4 py-2 rounded-xl transition-all shadow-xs"
        >
          <ArrowLeft className="w-4 h-4 mr-2 text-[#0284C7]" />
          <span>← Return to Issuer Dashboard</span>
        </Link>

        <div className="flex items-center space-x-3">
          <span className="font-mono text-xs font-semibold text-[#64748B] hidden sm:inline">
            Certificate ID: <strong className="text-[#1C2E35]">{credential.id}</strong>
          </span>
          <CertificatePrintButton
            credentialId={credential.id}
            recipientName={recipientName}
          />
        </div>
      </div>

      {/* Official Certificate Layout (Matches Exact User Reference Image) */}
      <main
        id="certificate-document"
        className="max-w-4xl mx-auto w-full bg-white border-2 border-[#1C2E35] rounded-3xl p-8 sm:p-14 shadow-2xl text-center relative print:border-2 print:p-10 print:shadow-none print:rounded-none"
      >
        {/* Certificate Header */}
        <div className="space-y-1">
          <p className="text-[11px] sm:text-xs tracking-[0.2em] uppercase font-semibold text-[#64748B] font-sans">
            {issuingOrg}
          </p>
          <h1 className="font-serif-title font-extrabold text-2xl sm:text-3xl text-[#1C2E35] uppercase tracking-wide leading-snug">
            {certTitle}
          </h1>
          <p className="text-xs sm:text-sm text-[#64748B] italic font-serif">
            {certSubtitle}
          </p>
        </div>

        {/* Top Horizontal Divider Line */}
        <div className="w-full border-b border-[#D5E3E6] my-6 sm:my-8" />

        {/* Certificate Body */}
        <div className="py-2 space-y-3">
          <p className="text-xs sm:text-sm text-[#64748B] font-sans">
            This is to officially certify that
          </p>
          <h2 className="text-2xl sm:text-4xl font-extrabold font-serif-title text-[#1C2E35] tracking-wide uppercase underline decoration-[#8DAEB6] underline-offset-8 decoration-2">
            {recipientName}
          </h2>
          <p className="text-xs sm:text-sm text-[#1C2E35] font-sans max-w-2xl mx-auto leading-relaxed pt-2">
            {customDescription}
          </p>
        </div>

        {/* Bottom Horizontal Divider Line */}
        <div className="w-full border-t border-[#D5E3E6] pt-6 sm:pt-8 mt-8 sm:mt-12" />

        {/* Certificate Footer: 3 Columns (Status, Scannable QR Seal, Signatory) */}
        <div className="grid grid-cols-3 gap-4 items-center text-left text-xs font-sans">
          {/* Left: Validation Status */}
          <div>
            <p className="font-bold text-[#1C2E35]">Status:</p>
            <p className="text-emerald-700 font-semibold text-xs sm:text-sm mt-0.5">
              Authentic & Sealed
            </p>
            <p className="text-[10px] text-[#94A3B8] mt-0.5">
              SHA-256 Validated
            </p>
            <p className="text-[9px] font-mono text-[#64748B] mt-1">
              {credential.id}
            </p>
          </div>

          {/* Center: THE SCANNABLE QR SEAL */}
          <div className="text-center flex flex-col items-center justify-center">
            <div className="inline-block p-1.5 border border-[#D5E3E6] rounded-xl bg-white shadow-xs">
              <img
                src={qrDataUrl}
                alt="Cryptographic QR Seal"
                className="w-20 h-20 sm:w-24 sm:h-24"
              />
            </div>
            <span className="text-[9px] font-mono font-bold text-[#64748B] mt-1.5 uppercase tracking-wider block">
              QR SEAL
            </span>
          </div>

          {/* Right: Authorized Signatory & Date */}
          <div className="text-right">
            <p className="font-serif-title italic font-bold text-base sm:text-lg text-[#1C2E35]">
              {signatoryName}
            </p>
            <p className="text-[10px] sm:text-xs text-[#64748B] mt-0.5">
              {signatoryTitle}
            </p>
            <p className="text-[9px] text-[#94A3B8] mt-0.5 font-sans">
              {issueDateStr}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
