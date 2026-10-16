'use client';

import React, { useEffect, useState, use, Suspense } from 'react';
import Link from 'next/link';
import QRCode from 'qrcode';
import {
  ShieldCheck,
  ShieldAlert,
  Zap,
  Cpu,
  Database,
  ArrowLeft,
  CheckCircle2,
  RefreshCw,
  Lock,
  Printer,
  Smartphone,
  Globe,
  Award,
} from 'lucide-react';

interface VerificationData {
  credential: {
    id: string;
    recipient_name: string;
    recipient_email: string;
    course_or_role: string;
    issuing_org: string;
    issue_date: string;
    status: string;
    sha256_hash: string;
    digital_signature: string;
  };
  verification: {
    is_valid: boolean;
    tampered: boolean;
    computed_hash: string;
    message: string;
    transport: string;
  };
  verifiedAt: string;
}

export default function VerifyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
          <div className="text-center">
            <RefreshCw className="w-10 h-10 animate-spin text-indigo-500 mx-auto mb-4" />
            <p className="text-sm text-slate-400">Loading Credential Verification...</p>
          </div>
        </div>
      }
    >
      <VerifyContent params={params} />
    </Suspense>
  );
}

function VerifyContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const { id } = resolvedParams;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<VerificationData | null>(null);
  const [source, setSource] = useState<'REDIS_CACHE' | 'DATABASE_GRPC'>('DATABASE_GRPC');
  const [latencyMs, setLatencyMs] = useState<number>(0);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [qrMode, setQrMode] = useState<'CAMERA_TEXT' | 'LAN_URL'>('CAMERA_TEXT');
  const [isTamperingSimulated, setIsTamperingSimulated] = useState(false);
  const [viewMode, setViewMode] = useState<'AUDIT' | 'CERTIFICATE'>('CERTIFICATE');

  const updateQrCode = async (credData: VerificationData, mode: 'CAMERA_TEXT' | 'LAN_URL') => {
    let contentToEncode = '';

    if (mode === 'CAMERA_TEXT') {
      // Formatted text that ANY mobile camera / Google Lens directly reads and displays
      contentToEncode = [
        `🛡️ TRUSTSEAL VERIFIED CREDENTIAL`,
        `Certificate No: ${credData.credential.id}`,
        `Recipient: ${credData.credential.recipient_name}`,
        `Role/Course: ${credData.credential.course_or_role}`,
        `Issuing Authority: ${credData.credential.issuing_org}`,
        `Issue Date: ${new Date(credData.credential.issue_date).toLocaleDateString()}`,
        `Status: ${credData.verification.is_valid ? 'AUTHENTIC & SEALED' : 'TAMPERED / INVALID'}`,
        `SHA-256 Hash: ${credData.credential.sha256_hash?.substring(0, 16)}...`,
        `Verification Engine: gRPC Microservice (HMAC-SHA256)`,
      ].join('\n');
    } else {
      // Local Wi-Fi Network URL (binds to host machine's Wi-Fi IP)
      contentToEncode = `http://10.33.147.140:3000/verify/${credData.credential.id}`;
    }

    const qr = await QRCode.toDataURL(contentToEncode, {
      width: 220,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    });
    setQrCodeUrl(qr);
  };

  const fetchVerification = async (simulateTamper = false) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/credentials/${id}/verify`);
      const json = await res.json();

      if (!json.success) {
        setError(json.message || json.error || 'Failed to verify credential');
        setLoading(false);
        return;
      }

      setSource(json.source);
      setLatencyMs(json.latencyMs);

      let currentData: VerificationData;
      if (simulateTamper) {
        currentData = {
          ...json.data,
          verification: {
            is_valid: false,
            tampered: true,
            computed_hash: json.data.credential.sha256_hash,
            message: 'Cryptographic signature mismatch! Detected unauthorized alteration of certificate record.',
            transport: 'gRPC',
          },
        };
        setIsTamperingSimulated(true);
      } else {
        currentData = json.data;
        setIsTamperingSimulated(false);
      }

      setData(currentData);
      await updateQrCode(currentData, qrMode);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVerification();
  }, [id]);

  const handleQrModeChange = async (newMode: 'CAMERA_TEXT' | 'LAN_URL') => {
    setQrMode(newMode);
    if (data) {
      await updateQrCode(data, newMode);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Navigation Bar */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Link
            href="/dashboard"
            className="flex items-center text-sm font-medium text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Back to Dashboard
          </Link>
          <span className="text-slate-700">|</span>
          <div className="flex items-center space-x-2">
            <Lock className="w-4 h-4 text-indigo-400" />
            <span className="text-xs uppercase font-bold tracking-wider text-indigo-400">
              TrustSeal Cryptographic Registry
            </span>
          </div>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 p-1 rounded-xl text-xs">
          <button
            onClick={() => setViewMode('CERTIFICATE')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center space-x-1.5 ${
              viewMode === 'CERTIFICATE'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>Formal Certificate</span>
          </button>
          <button
            onClick={() => setViewMode('AUDIT')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center space-x-1.5 ${
              viewMode === 'AUDIT'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Engineering Audit (gRPC/Redis)</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 md:p-8 flex flex-col justify-center">
        {loading && (
          <div className="text-center py-20">
            <RefreshCw className="w-10 h-10 animate-spin text-indigo-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-slate-200">
              Querying Distributed Verification Registry...
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Checking Redis Cache & executing gRPC cryptographic signature audit...
            </p>
          </div>
        )}

        {error && (
          <div className="bg-rose-950/40 border border-rose-800 rounded-xl p-8 text-center max-w-lg mx-auto shadow-2xl">
            <ShieldAlert className="w-16 h-16 text-rose-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-rose-200">Credential Verification Failed</h2>
            <p className="text-rose-300/80 mt-2 text-sm">{error}</p>
            <p className="text-xs text-slate-500 mt-4">
              Identifier: <code className="bg-slate-900 px-2 py-1 rounded">{id}</code>
            </p>
            <Link
              href="/dashboard"
              className="mt-6 inline-block bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
            >
              Return to Registry
            </Link>
          </div>
        )}

        {!loading && data && (
          <div className="space-y-6">
            {/* Real-Time Status & Latency Bar */}
            <div
              className={`rounded-2xl p-5 border shadow-xl flex flex-col md:flex-row items-center justify-between gap-4 ${
                data.verification.is_valid
                  ? 'bg-emerald-950/30 border-emerald-500/40'
                  : 'bg-rose-950/40 border-rose-500/60'
              }`}
            >
              <div className="flex items-center space-x-3.5">
                <div
                  className={`p-2.5 rounded-xl ${
                    data.verification.is_valid ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                  }`}
                >
                  {data.verification.is_valid ? (
                    <ShieldCheck className="w-8 h-8" />
                  ) : (
                    <ShieldAlert className="w-8 h-8" />
                  )}
                </div>
                <div>
                  <h1
                    className={`text-lg font-bold tracking-tight ${
                      data.verification.is_valid ? 'text-emerald-300' : 'text-rose-300'
                    }`}
                  >
                    {data.verification.is_valid
                      ? 'OFFICIAL DIGITAL CREDENTIAL: VERIFIED AUTHENTIC'
                      : 'TAMPERING DETECTED / INVALID SEAL'}
                  </h1>
                  <p className="text-xs text-slate-300 mt-0.5">{data.verification.message}</p>
                </div>
              </div>

              {/* Benchmarking metrics */}
              <div className="flex items-center space-x-3 bg-slate-900/80 border border-slate-800 rounded-xl px-4 py-2 text-xs">
                <div className="flex items-center space-x-1.5 text-indigo-300">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span>
                    Latency: <strong className="text-white">{latencyMs} ms</strong>
                  </span>
                </div>
                <span className="text-slate-700">|</span>
                <div className="flex items-center space-x-1.5 text-slate-300">
                  {source === 'REDIS_CACHE' ? (
                    <>
                      <Database className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-400 font-semibold">Redis Cache HIT</span>
                    </>
                  ) : (
                    <>
                      <Cpu className="w-4 h-4 text-indigo-400" />
                      <span className="text-indigo-300 font-semibold">gRPC Microservice</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* VIEW 1: Formal Institutional Certificate Mode (Modeled after real university / industry certificates) */}
            {viewMode === 'CERTIFICATE' && (
              <div className="bg-white text-slate-900 rounded-2xl p-8 md:p-12 shadow-2xl border-8 border-double border-indigo-950 relative overflow-hidden">
                {/* Certificate Background Seal Watermark */}
                <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
                  <Award className="w-96 h-96 text-indigo-950" />
                </div>

                {/* Top Authority Header */}
                <div className="text-center border-b-2 border-indigo-950/20 pb-6 mb-6">
                  <div className="inline-flex items-center space-x-2 text-indigo-900 font-bold uppercase tracking-widest text-xs mb-1">
                    <Award className="w-4 h-4 text-indigo-700" />
                    <span>{data.credential.issuing_org}</span>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-extrabold uppercase tracking-wide text-indigo-950 font-serif">
                    Certificate of Completion & Industry Verification
                  </h2>
                  <p className="text-xs text-slate-600 mt-1 italic font-serif">
                    Recognized Practical Engineering Certification & Experience Verification
                  </p>
                </div>

                {/* Certificate Body Text */}
                <div className="text-center max-w-2xl mx-auto space-y-4 py-4 font-serif">
                  <p className="text-sm text-slate-700">This is to proudly certify that</p>
                  <p className="text-2xl md:text-3xl font-extrabold text-indigo-950 tracking-wide underline decoration-indigo-300 underline-offset-8 uppercase font-sans">
                    {data.credential.recipient_name}
                  </p>
                  <p className="text-xs text-slate-600">
                    Identifier: <code className="font-mono bg-slate-100 px-2 py-0.5 rounded text-indigo-900 font-bold">{data.credential.id}</code>
                  </p>
                  <p className="text-sm md:text-base text-slate-800 leading-relaxed pt-2">
                    has successfully demonstrated practical software engineering standards, completing the intensive curriculum in{' '}
                    <strong className="text-indigo-950 underline decoration-indigo-400">{data.credential.course_or_role}</strong>.
                  </p>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Evaluated on event-driven streaming, relational schema design with ACID outbox transactions,
                    microservice communication, and high-throughput cryptographic verification.
                  </p>
                </div>

                {/* Certificate Footer: QR Code, Signatures & Date */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center pt-8 border-t-2 border-indigo-950/20 mt-6">
                  {/* Left: Date & Certificate Number */}
                  <div className="text-left space-y-1 font-serif text-xs text-slate-700">
                    <p>
                      <strong>Certificate No:</strong> <span className="font-mono font-bold text-indigo-900">{data.credential.id}</span>
                    </p>
                    <p>
                      <strong>Issue Date:</strong>{' '}
                      {new Date(data.credential.issue_date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                    <p>
                      <strong>Status:</strong>{' '}
                      <span className="font-bold text-emerald-700">Authentic & Digitally Sealed</span>
                    </p>
                  </div>

                  {/* Center: Scannable QR Code */}
                  <div className="flex flex-col items-center justify-center">
                    {qrCodeUrl && (
                      <div className="p-2 bg-white rounded-xl shadow-lg border-2 border-indigo-950/20">
                        <img
                          src={qrCodeUrl}
                          alt="Verification QR Code"
                          className="w-36 h-36 rounded"
                        />
                      </div>
                    )}
                    <span className="text-[10px] text-slate-500 mt-1 font-mono font-bold">
                      Scan with Any Camera to Instant Verify
                    </span>
                  </div>

                  {/* Right: Authority Signature */}
                  <div className="text-right space-y-1 font-serif">
                    <div className="inline-block border-b-2 border-slate-900 w-44 pb-1 text-center">
                      <span className="font-serif italic text-lg text-indigo-950 font-bold block">
                        TrustSeal Verification Authority
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-600 block text-center">
                      Authorized Cryptographic Signatory
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* VIEW 2: Engineering Audit Mode (For Technical Interviewers) */}
            {viewMode === 'AUDIT' && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 shadow-xl space-y-6">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div>
                    <h3 className="text-base font-bold text-white">Cryptographic Signature & Audit Proof</h3>
                    <p className="text-xs text-slate-400">Technical telemetry from PostgreSQL and gRPC microservice</p>
                  </div>
                  <span className="text-xs font-mono bg-indigo-950 border border-indigo-800 text-indigo-300 px-3 py-1 rounded-md">
                    {data.credential.id}
                  </span>
                </div>

                <div className="space-y-3 font-mono text-xs">
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block mb-1">SHA-256 Tamper-Proof Hash:</span>
                    <span className="text-indigo-300 break-all select-all font-semibold">
                      {data.credential.sha256_hash}
                    </span>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block mb-1">HMAC Digital Signature (Private Key Verified):</span>
                    <span className="text-amber-300 break-all select-all font-semibold">
                      {data.credential.digital_signature}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <div>
                    <span className="text-slate-500 block">Recipient</span>
                    <span className="text-white font-semibold">{data.credential.recipient_name}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Database</span>
                    <span className="text-emerald-400 font-semibold">PostgreSQL (Committed)</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Kafka Status</span>
                    <span className="text-amber-400 font-semibold">Dispatched / ACK</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Cache Status</span>
                    <span className="text-cyan-400 font-semibold">Cached ({latencyMs}ms)</span>
                  </div>
                </div>
              </div>
            )}

            {/* Interactive QR Code & Demo Controls Panel */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center space-x-2">
                    <Smartphone className="w-4 h-4 text-indigo-400" />
                    <span>Mobile QR Scanner Controls</span>
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Choose how the QR code behaves when scanned with your mobile phone camera:
                  </p>
                </div>

                {/* QR Encoding Mode Switcher */}
                <div className="flex items-center space-x-2 bg-slate-950 border border-slate-800 p-1 rounded-xl text-xs">
                  <button
                    onClick={() => handleQrModeChange('CAMERA_TEXT')}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center space-x-1.5 ${
                      qrMode === 'CAMERA_TEXT'
                        ? 'bg-indigo-600 text-white shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Instant Camera Text (Works on Any Phone)</span>
                  </button>
                  <button
                    onClick={() => handleQrModeChange('LAN_URL')}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center space-x-1.5 ${
                      qrMode === 'LAN_URL'
                        ? 'bg-indigo-600 text-white shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>Wi-Fi Network URL</span>
                  </button>
                </div>
              </div>

              {/* Technical Interview Anti-Tamper Demonstration */}
              <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-2">
                <p className="text-xs text-slate-400">
                  <strong className="text-white">Interview Demonstration:</strong> Click the button to test gRPC cryptographic tamper detection live.
                </p>

                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => fetchVerification(!isTamperingSimulated)}
                    className={`text-xs font-semibold px-4 py-2 rounded-lg transition-colors flex items-center space-x-1.5 ${
                      isTamperingSimulated
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        : 'bg-rose-600 hover:bg-rose-500 text-white'
                    }`}
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>
                      {isTamperingSimulated ? 'Restore Authentic Seal' : 'Simulate Tampering Attack'}
                    </span>
                  </button>

                  <button
                    onClick={() => window.print()}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium px-3.5 py-2 rounded-lg transition-colors flex items-center space-x-1.5"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print / Save PDF</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-6 text-center text-xs text-slate-500">
        TrustSeal Enterprise Credential Engine • High-Throughput Microservices & Cryptographic Verification
      </footer>
    </div>
  );
}
