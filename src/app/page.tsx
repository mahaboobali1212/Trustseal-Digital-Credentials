'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  Search,
  ArrowRight,
  Award,
  CheckCircle2,
  Lock,
  Cpu,
  Zap,
  Building,
} from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const [searchId, setSearchId] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchId.trim()) return;
    router.push(`/verify/${searchId.trim()}`);
  };

  const handleQuickTest = (id: string) => {
    setSearchId(id);
    router.push(`/verify/${id}`);
  };

  return (
    <div className="min-h-screen bg-[#EAF1F3] text-[#17262C] flex flex-col">
      {/* Top Navigation */}
      <header className="border-b border-[#D5E3E6] bg-white/80 backdrop-blur-md px-6 md:px-12 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center space-x-3">
          <div className="bg-[#1C2E35] p-2.5 rounded-xl text-white shadow-sm">
            <ShieldCheck className="w-5 h-5 text-[#8DAEB6]" />
          </div>
          <div>
            <span className="font-serif-title font-bold text-xl tracking-tight text-[#1C2E35]">TrustSeal</span>
            <span className="hidden sm:inline-block ml-2 text-[11px] font-sans text-[#64748B] uppercase tracking-wider">
              Verification Engine
            </span>
          </div>
        </div>

        <nav className="flex items-center space-x-6 text-sm font-medium">
          <Link href="/" className="text-[#1C2E35] font-semibold">
            Public Verifier
          </Link>
          <Link href="/dashboard" className="text-[#64748B] hover:text-[#1C2E35] transition-colors">
            Issuer Dashboard
          </Link>
          <Link
            href="/dashboard"
            className="bg-[#1C2E35] hover:bg-[#2B454E] text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-all shadow-sm"
          >
            Launch Dashboard
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-12 md:py-20 space-y-16">
        <div className="text-center space-y-6 max-w-3xl mx-auto">
          <div className="inline-flex items-center space-x-2 bg-white border border-[#D5E3E6] text-[#2B454E] text-xs px-4 py-1.5 rounded-full shadow-xs">
            <Lock className="w-3.5 h-3.5 text-[#8DAEB6]" />
            <span>Tamper-Proof Digital Credential Authority</span>
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif-title font-bold tracking-tight text-[#1C2E35] leading-tight">
            Verify Digital Credentials with Cryptographic Certainty
          </h1>

          <p className="text-base md:text-lg text-[#475569] leading-relaxed max-w-2xl mx-auto font-sans">
            Issue and verify authentic offer letters, internship certificates, and university credentials.
            Equipped with company customization, instant mobile QR code scanning, and cryptographic anti-tamper sealing.
          </p>

          {/* Search Verification Bar */}
          <div className="pt-4 max-w-2xl mx-auto">
            <form
              onSubmit={handleSearch}
              className="bg-white border border-[#C5D7DC] p-2 rounded-2xl shadow-md hover:border-[#8DAEB6] flex flex-col sm:flex-row items-center gap-2 transition-all"
            >
              <div className="flex items-center space-x-3 px-3 flex-1 w-full">
                <Search className="w-5 h-5 text-[#8DAEB6] shrink-0" />
                <input
                  type="text"
                  placeholder="Enter Certificate ID (e.g. DEZI-2026-A80B3C)..."
                  value={searchId}
                  onChange={(e) => setSearchId(e.target.value)}
                  className="bg-transparent border-none text-[#1C2E35] text-sm w-full placeholder-[#94A3B8] focus:outline-none py-2"
                />
              </div>

              <button
                type="submit"
                className="w-full sm:w-auto bg-[#1C2E35] hover:bg-[#2B454E] text-white text-xs font-semibold px-6 py-3 rounded-xl transition-colors shrink-0 flex items-center justify-center space-x-2 shadow-sm"
              >
                <span>Verify Credential</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Quick Demo Previews */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-[#64748B]">
              <span>Sample Demonstrations:</span>
              <button
                type="button"
                onClick={() => handleQuickTest('RNGD4AEG1CBG')}
                className="bg-white hover:bg-[#F1F5F7] text-[#1C2E35] border border-[#CBD5E1] px-3 py-1 rounded-lg transition-colors font-semibold flex items-center space-x-1 cursor-pointer"
              >
                <span>TrustSeal Verified (RNGD4AEG1CBG)</span>
                <ArrowRight className="w-3 h-3 text-[#0284C7]" />
              </button>
              <button
                type="button"
                onClick={() => handleQuickTest('DEZI-2026-A80B3C')}
                className="bg-white hover:bg-[#F1F5F7] text-[#1C2E35] border border-[#D5E3E6] px-3 py-1 rounded-lg transition-colors font-medium flex items-center space-x-1 cursor-pointer"
              >
                <span>Shaik Mahaboob Ali (DEZI-2026-A80B3C)</span>
                <ArrowRight className="w-3 h-3 text-[#8DAEB6]" />
              </button>
            </div>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
          <div className="bg-white border border-[#D5E3E6] rounded-2xl p-6 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#EAF1F3] text-[#1C2E35] flex items-center justify-center">
              <Building className="w-5 h-5 text-[#2B454E]" />
            </div>
            <h3 className="font-serif-title font-bold text-lg text-[#1C2E35]">Company Customization</h3>
            <p className="text-xs text-[#64748B] leading-relaxed">
              Every organization defines their own certificate type, custom descriptions, tenure, fields, and authorized signatories.
            </p>
          </div>

          <div className="bg-white border border-[#D5E3E6] rounded-2xl p-6 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#EAF1F3] text-[#1C2E35] flex items-center justify-center">
              <Award className="w-5 h-5 text-[#2B454E]" />
            </div>
            <h3 className="font-serif-title font-bold text-lg text-[#1C2E35]">Executive Formal Certificates</h3>
            <p className="text-xs text-[#64748B] leading-relaxed">
              Pristine certificates with Guilloche ornamental frames, gold embossed authority seal, and print-isolated single-page PDF generation.
            </p>
          </div>

          <div className="bg-white border border-[#D5E3E6] rounded-2xl p-6 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#EAF1F3] text-[#1C2E35] flex items-center justify-center">
              <Cpu className="w-5 h-5 text-[#2B454E]" />
            </div>
            <h3 className="font-serif-title font-bold text-lg text-[#1C2E35]">Cryptographic Anti-Tamper Seal</h3>
            <p className="text-xs text-[#64748B] leading-relaxed">
              SHA-256 payload hashing and HMAC signatures validate certificate integrity in real-time, preventing unauthorized modifications.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#D5E3E6] bg-white py-6 text-center text-xs text-[#64748B]">
        TrustSeal Credential Engine • Institutional Verification Platform
      </footer>
    </div>
  );
}
