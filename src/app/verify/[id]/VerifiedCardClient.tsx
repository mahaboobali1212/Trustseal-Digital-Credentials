'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  Download,
  FileText,
  Printer,
  RefreshCw,
  Award,
} from 'lucide-react';

export interface CredentialRecord {
  id: string;
  recipient_name: string;
  recipient_email: string;
  course_or_role: string;
  issuing_org: string;
  issue_date: string;
  status: string;
  sha256_hash: string;
  digital_signature: string;
  metadata?: {
    certificate_type?: string;
    certificate_title?: string;
    certificate_subtitle?: string;
    custom_description?: string;
    department?: string;
    signatory_name?: string;
    signatory_title?: string;
    custom_fields?: Array<{ key: string; value: string }>;
  };
}

export interface VerificationPayload {
  credential: CredentialRecord;
  verification: {
    is_valid: boolean;
    tampered: boolean;
    computed_hash: string;
    message: string;
    transport?: string;
  };
  verifiedAt: string;
}

/**
 * TrustSeal Official Logo Component
 */
function TrustSealLogo({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center space-x-2.5 ${className}`}>
      <div className="w-10 h-10 rounded-xl bg-[#1C2E35] flex items-center justify-center shadow-xs text-white shrink-0">
        <ShieldCheck className="w-6 h-6 text-[#8DAEB6]" />
      </div>
      <div className="flex flex-col text-left">
        <div className="flex items-baseline">
          <span className="text-xl sm:text-2xl font-serif-title font-extrabold tracking-tight text-[#1C2E35]">
            Trust<span className="text-[#0284C7]">Seal</span>
          </span>
          <span className="text-[10px] font-bold text-[#0284C7] ml-0.5 relative -top-2">TM</span>
        </div>
        <span className="text-[9px] sm:text-[10px] font-medium tracking-wide text-[#64748B] -mt-1 font-sans uppercase">
          Tamper-Proof Credential Authority
        </span>
      </div>
    </div>
  );
}

export default function VerifiedCardClient({
  data,
  publicVerifyUrl,
}: {
  data: VerificationPayload;
  publicVerifyUrl: string;
}) {
  const [showCertificate, setShowCertificate] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const { credential, verification } = data;
  const meta = credential.metadata || {};
  const certTitle = meta.certificate_title || 'Certificate of Internship & Practical Completion';
  const certSubtitle = meta.certificate_subtitle || 'Recognized Practical Skill Verification & Professional Endorsement';
  const customDescription =
    meta.custom_description ||
    `In recognition of outstanding performance and completion of the intensive software engineering program in ${credential.course_or_role}. Demonstrating practical mastery in enterprise application engineering, API development, and secure cryptographic verification.`;
  const signatoryName = meta.signatory_name || 'Director of Engineering';
  const signatoryTitle = meta.signatory_title || 'TrustSeal Credential Authority';
  const customFields = Array.isArray(meta.custom_fields) ? meta.custom_fields : [];

  // Download high-resolution certificate PNG
  const handleDownloadCertificate = async () => {
    setIsDownloading(true);
    try {
      const QRCode = (await import('qrcode')).default;
      const qrDataUrl = await QRCode.toDataURL(publicVerifyUrl, {
        width: 360,
        margin: 2,
        errorCorrectionLevel: 'M',
      });

      const canvas = document.createElement('canvas');
      canvas.width = 2400;
      canvas.height = 1680;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Parchment background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Borders
      ctx.strokeStyle = '#1C2E35';
      ctx.lineWidth = 16;
      ctx.strokeRect(40, 40, canvas.width - 80, canvas.height - 80);

      ctx.lineWidth = 4;
      ctx.strokeRect(62, 62, canvas.width - 124, canvas.height - 124);

      ctx.strokeStyle = '#C5A059';
      ctx.lineWidth = 6;
      ctx.strokeRect(78, 78, canvas.width - 156, canvas.height - 156);

      // Header
      ctx.textAlign = 'center';
      ctx.fillStyle = '#1C2E35';
      ctx.font = 'bold 36px Georgia, serif';
      const headerOrg = (
        credential.issuing_org + (meta.department ? ` • ${meta.department}` : '')
      ).toUpperCase();
      ctx.fillText(headerOrg, canvas.width / 2, 175);

      ctx.strokeStyle = 'rgba(28, 46, 53, 0.2)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(350, 210);
      ctx.lineTo(canvas.width - 350, 210);
      ctx.stroke();

      ctx.font = 'bold 54px Georgia, serif';
      ctx.fillStyle = '#1C2E35';
      ctx.fillText(certTitle.toUpperCase(), canvas.width / 2, 290);

      ctx.font = 'italic 28px Georgia, serif';
      ctx.fillStyle = '#64748B';
      ctx.fillText(certSubtitle, canvas.width / 2, 345);

      ctx.font = '30px Georgia, serif';
      ctx.fillStyle = '#475569';
      ctx.fillText('This is to proudly certify that', canvas.width / 2, 450);

      ctx.font = 'bold 78px Arial, sans-serif';
      ctx.fillStyle = '#1C2E35';
      ctx.fillText(credential.recipient_name.toUpperCase(), canvas.width / 2, 565);

      ctx.strokeStyle = '#0284C7';
      ctx.lineWidth = 6;
      const nameWidth = ctx.measureText(credential.recipient_name.toUpperCase()).width;
      ctx.beginPath();
      ctx.moveTo((canvas.width - nameWidth) / 2 - 25, 590);
      ctx.lineTo((canvas.width + nameWidth) / 2 + 25, 590);
      ctx.stroke();

      ctx.font = 'bold 26px monospace';
      ctx.fillStyle = '#64748B';
      ctx.fillText(`Certificate Code: ${credential.id}`, canvas.width / 2, 650);

      ctx.font = '32px Arial, sans-serif';
      ctx.fillStyle = '#334155';
      const words = customDescription.split(' ');
      let line = '';
      let currentY = 735;
      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > 1800 && n > 0) {
          ctx.fillText(line, canvas.width / 2, currentY);
          line = words[n] + ' ';
          currentY += 46;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, canvas.width / 2, currentY);

      if (customFields.length > 0) {
        const fieldString = customFields.map((f) => `${f.key}: ${f.value}`).join('   •   ');
        ctx.font = 'bold 26px Arial, sans-serif';
        ctx.fillStyle = '#1C2E35';
        ctx.fillText(fieldString, canvas.width / 2, currentY + 60);
      }

      ctx.strokeStyle = 'rgba(28, 46, 53, 0.2)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(180, 1160);
      ctx.lineTo(canvas.width - 180, 1160);
      ctx.stroke();

      ctx.textAlign = 'left';
      ctx.font = '26px Georgia, serif';
      ctx.fillStyle = '#475569';
      ctx.fillText(`Certificate Code: ${credential.id}`, 220, 1240);
      ctx.fillText(
        `Issue Date: ${new Date(credential.issue_date).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}`,
        220,
        1290
      );
      ctx.fillStyle = '#059669';
      ctx.font = 'bold 26px Georgia, serif';
      ctx.fillText('Verification: Cryptographically Sealed', 220, 1340);

      ctx.textAlign = 'right';
      ctx.strokeStyle = '#1C2E35';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(canvas.width - 620, 1300);
      ctx.lineTo(canvas.width - 220, 1300);
      ctx.stroke();

      ctx.font = 'italic bold 36px Georgia, serif';
      ctx.fillStyle = '#1C2E35';
      ctx.fillText(signatoryName, canvas.width - 240, 1280);

      ctx.font = '26px Georgia, serif';
      ctx.fillStyle = '#64748B';
      ctx.fillText(signatoryTitle, canvas.width - 240, 1340);

      ctx.font = 'bold 20px Arial, sans-serif';
      ctx.fillStyle = '#0284C7';
      ctx.fillText('★ AUTHENTICATED SIGNATORY ★', canvas.width - 240, 1380);

      // Embed scannable QR Code
      const qrImg = new Image();
      qrImg.crossOrigin = 'anonymous';
      qrImg.onload = () => {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(canvas.width / 2 - 130, 1180, 260, 260);
        ctx.drawImage(qrImg, canvas.width / 2 - 120, 1190, 240, 240);
        ctx.textAlign = 'center';
        ctx.font = 'bold 18px Arial, sans-serif';
        ctx.fillStyle = '#64748B';
        ctx.fillText('Scan with Phone Camera to Verify', canvas.width / 2, 1460);

        const link = document.createElement('a');
        link.download = `TrustSeal_${credential.id}_Certificate.png`;
        link.href = canvas.toDataURL('image/png', 1.0);
        link.click();
        setIsDownloading(false);
      };
      qrImg.onerror = () => {
        const link = document.createElement('a');
        link.download = `TrustSeal_${credential.id}_Certificate.png`;
        link.href = canvas.toDataURL('image/png', 1.0);
        link.click();
        setIsDownloading(false);
      };
      qrImg.src = qrDataUrl;
    } catch (err) {
      console.error('Download error:', err);
      setIsDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F6F8] text-[#17262C] flex flex-col font-sans">
      {/* Top Header: Official TrustSeal Authority Branding Only (NO DASHBOARD LINKS) */}
      <header className="no-print border-b border-[#E2E8F0] bg-white/95 backdrop-blur-md px-4 sm:px-8 py-3.5 flex items-center justify-between sticky top-0 z-50 shadow-2xs">
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#1C2E35] flex items-center justify-center text-white shadow-xs shrink-0">
            <ShieldCheck className="w-5 h-5 text-[#8DAEB6]" />
          </div>
          <div className="flex flex-col">
            <span className="font-serif-title font-extrabold text-base text-[#1C2E35] leading-tight">
              Trust<span className="text-[#0284C7]">Seal</span>
            </span>
            <span className="text-[10px] text-[#64748B] uppercase tracking-wider font-semibold">
              Official Credential Verification
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center space-x-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Verified Authentic</span>
          </span>
        </div>
      </header>

      {/* Main Content: Verified Status Card */}
      <main className="flex-1 max-w-xl w-full mx-auto p-4 sm:p-6 md:p-8 flex flex-col justify-center space-y-6">
        {/* Outer Card with iridescent rainbow gradient border */}
        <div className="w-full p-[2.5px] rounded-2xl shadow-lg bg-gradient-to-tr from-[#3b82f6] via-[#8b5cf6] to-[#f59e0b] transition-all">
          <div className="bg-white rounded-[14px] p-6 sm:p-10 text-center">
            {/* 1. Header: TrustSeal App Logo & Name */}
            <TrustSealLogo className="mb-5 sm:mb-6" />

            {/* 2. Green Circular Checkmark Badge */}
            <div className="w-16 h-16 bg-[#16a34a] rounded-full flex items-center justify-center shadow-md mx-auto mb-4">
              <svg
                className="w-9 h-9 text-white"
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

            {/* 3. Verification Heading */}
            <h2 className="text-base sm:text-lg font-bold font-sans text-[#1D4ED8] mb-6">
              Your Certificate has been verified successfully
            </h2>

            {/* 4. Aligned Key-Value Verification Rows */}
            <div className="max-w-md mx-auto text-left bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4 sm:p-5">
              <div className="grid grid-cols-[120px_1fr] sm:grid-cols-[140px_1fr] gap-x-4 gap-y-3.5 text-xs sm:text-sm font-sans">
                <div className="font-bold text-[#1E293B]">Name:</div>
                <div className="font-semibold text-[#1E293B] uppercase tracking-wide">
                  {credential.recipient_name}
                </div>

                <div className="font-bold text-[#1E293B]">Domain:</div>
                <div className="font-semibold text-[#1E293B]">
                  {credential.course_or_role}
                </div>

                <div className="font-bold text-[#1E293B]">Certificate Code:</div>
                <div className="font-mono font-bold text-[#1E293B]">
                  {credential.id}
                </div>

                <div className="font-bold text-[#1E293B]">Issuing Org:</div>
                <div className="font-semibold text-[#1E293B]">
                  {credential.issuing_org}
                </div>

                <div className="font-bold text-[#1E293B]">Issue Date:</div>
                <div className="font-medium text-[#475569]">
                  {new Date(credential.issue_date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </div>

                <div className="font-bold text-[#1E293B]">Status:</div>
                <div className="inline-flex items-center text-xs font-bold text-emerald-800">
                  <ShieldCheck className="w-4 h-4 mr-1 text-emerald-600" />
                  <span>Authentic & Sealed</span>
                </div>
              </div>
            </div>

            {/* Authenticity Footer */}
            <div className="mt-6 pt-4 border-t border-[#F1F5F9] flex items-center justify-between text-[11px] text-[#64748B]">
              <span className="flex items-center space-x-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Cryptographically Sealed</span>
              </span>
              <span className="font-mono text-[10px]">
                {credential.sha256_hash ? credential.sha256_hash.substring(0, 14) + '...' : 'Intact'}
              </span>
            </div>
          </div>
        </div>

        {/* Clean Action Buttons */}
        <div className="w-full flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => setShowCertificate(!showCertificate)}
            className="flex-1 bg-white hover:bg-[#F8FAFC] text-[#1C2E35] border border-[#CBD5E1] text-xs font-semibold py-2.5 px-3 rounded-xl transition-all flex items-center justify-center space-x-1.5 shadow-2xs cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-[#0284C7]" />
            <span>{showCertificate ? 'Hide Certificate' : 'View Full Certificate'}</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadCertificate}
            disabled={isDownloading}
            className="flex-1 bg-[#1C2E35] hover:bg-[#2B454E] text-white text-xs font-semibold py-2.5 px-3 rounded-xl transition-all flex items-center justify-center space-x-1.5 shadow-xs cursor-pointer disabled:opacity-50"
          >
            {isDownloading ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#8DAEB6]" />
            ) : (
              <Download className="w-3.5 h-3.5 text-[#8DAEB6]" />
            )}
            <span>{isDownloading ? 'Downloading...' : 'Download Certificate'}</span>
          </button>
        </div>

        {/* Collapsible Formal Certificate View */}
        {showCertificate && (
          <div className="space-y-4 pt-2">
            <div className="bg-white text-[#1C2E35] rounded-2xl p-6 sm:p-10 shadow-xl border-8 border-double border-[#1C2E35] relative overflow-hidden flex flex-col justify-between">
              <div className="text-center space-y-3">
                <div className="flex items-center justify-center space-x-2 text-[#0284C7]">
                  <Award className="w-5 h-5" />
                  <span className="text-xs font-bold uppercase tracking-widest">
                    {credential.issuing_org}
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-serif font-bold text-[#1C2E35]">
                  {certTitle}
                </h3>
                <p className="text-xs font-serif italic text-[#64748B]">
                  {certSubtitle}
                </p>
                <p className="text-xs text-[#475569] pt-2">This is to proudly certify that</p>
                <div className="py-2">
                  <span className="font-serif font-bold text-2xl sm:text-3xl text-[#1C2E35] block border-b-2 border-[#0284C7] max-w-sm mx-auto pb-1 uppercase">
                    {credential.recipient_name}
                  </span>
                </div>
                <p className="text-xs text-[#334155] max-w-md mx-auto leading-relaxed pt-1 font-sans">
                  {customDescription}
                </p>
              </div>

              <div className="flex items-center justify-between border-t border-[#1C2E35]/15 pt-4 mt-6 text-[11px] text-[#475569]">
                <div>
                  <span className="block font-mono font-bold text-[#1C2E35]">{credential.id}</span>
                  <span>{new Date(credential.issue_date).toLocaleDateString()}</span>
                </div>
                <div className="text-right">
                  <span className="block font-serif italic font-bold text-[#1C2E35]">{signatoryName}</span>
                  <span className="text-[10px] text-[#64748B]">{signatoryTitle}</span>
                </div>
              </div>
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={() => window.print()}
                className="bg-white hover:bg-[#F8FAFC] text-[#1C2E35] border border-[#CBD5E1] text-xs font-semibold py-2 px-4 rounded-xl transition-all inline-flex items-center space-x-1.5 shadow-2xs cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-[#64748B]" />
                <span>Print Certificate</span>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Static Institutional Footer (NO NAVIGATION LINKS) */}
      <footer className="no-print border-t border-[#E2E8F0] bg-white py-5 text-center text-xs text-[#64748B]">
        TrustSeal Enterprise Credential Engine • Institutional Verification Platform
      </footer>
    </div>
  );
}
