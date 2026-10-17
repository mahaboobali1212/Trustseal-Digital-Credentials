'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  RefreshCw,
  Search,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Award,
  Layers,
  ChevronDown,
  ChevronUp,
  FileText,
  Briefcase,
  GraduationCap,
  Sparkles,
  Printer,
  Copy,
  ExternalLink,
  QrCode,
} from 'lucide-react';

interface CustomField {
  key: string;
  value: string;
}

interface CredentialItem {
  id: string;
  recipient_name: string;
  recipient_email: string;
  course_or_role: string;
  issuing_org: string;
  issue_date: string;
  status: string;
  sha256_hash?: string;
  metadata?: {
    certificate_type?: string;
    certificate_title?: string;
    certificate_subtitle?: string;
    custom_description?: string;
    department?: string;
    signatory_name?: string;
    signatory_title?: string;
    custom_fields?: CustomField[];
  };
}

const TEMPLATE_PRESETS = [
  {
    id: 'INTERNSHIP',
    label: 'Internship Certificate',
    icon: Briefcase,
    title: 'Certificate of Internship & Practical Completion',
    subtitle: 'Recognized Practical Skill Verification & Professional Endorsement',
    role: 'Java Full Stack Developer',
    org: 'TrustSeal Credential Authority',
    dept: 'Software Engineering Division',
    signatoryName: 'Director of Engineering',
    signatoryTitle: 'Authorized Credential Signatory',
    desc: 'In recognition of outstanding performance and completion of the intensive software engineering program in Java Full Stack Development. Demonstrating practical mastery in enterprise application engineering, API development, and secure cryptographic verification.',
    fields: [
      { key: 'Program Duration', value: '120 Hours' },
      { key: 'Performance Grade', value: 'Exemplary / Distinction' },
    ],
  },
  {
    id: 'DEZINET_LABS',
    label: 'Dezinet Labs',
    icon: Briefcase,
    title: 'Certificate of Achievement & Practical Engineering Completion',
    subtitle: 'Recognized Practical Engineering Certification & Experience Verification',
    role: 'Java Full Stack Developer Intern',
    org: 'Dezinet Engineering Labs',
    dept: 'Software Engineering Division',
    signatoryName: 'Director of Engineering',
    signatoryTitle: 'Authorized Credential Signatory',
    desc: 'In recognition of outstanding performance and completion of the intensive software engineering internship in Java Full Stack Development & Distributed Systems. Demonstrating mastery in event streaming, ACID transactional reliability, and cryptographic verification.',
    fields: [
      { key: 'Program Duration', value: '120 Hours (Intensive)' },
      { key: 'Performance Grade', value: 'Exemplary / O-Grade' },
    ],
  },
  {
    id: 'OFFER_LETTER',
    label: 'Job Offer Letter',
    icon: FileText,
    title: 'Formal Letter of Employment & Appointment',
    subtitle: 'Official Offer of Full-Time Employment',
    role: 'Associate Software Engineer',
    org: 'Dezinet Technologies',
    dept: 'Platform Architecture & Cloud Systems',
    signatoryName: 'Head of Human Resources',
    signatoryTitle: 'Director of Talent Acquisition',
    desc: 'We are pleased to extend this formal offer of appointment for the position of Associate Software Engineer. This digitally sealed credential confirms terms of employment, compensation package, and departmental assignment with full tamper-proof cryptographic backing.',
    fields: [
      { key: 'Employment Type', value: 'Full-Time Permanent' },
      { key: 'Work Location', value: 'Bangalore / Hybrid' },
    ],
  },
  {
    id: 'ACADEMIC',
    label: 'Course Credential',
    icon: GraduationCap,
    title: 'Academic Certificate of Mastery & Excellence',
    subtitle: 'Accredited Higher Education & Skill Verification',
    role: 'Advanced Distributed Systems & Microservices',
    org: 'EduSkills & APSCHE Authority',
    dept: 'Faculty of Computer Science',
    signatoryName: 'Dean of Academic Affairs',
    signatoryTitle: 'Principal University Signatory',
    desc: 'This certifies that the recipient has satisfactorily completed the rigorous academic curriculum and laboratory evaluations in Advanced Distributed Systems, achieving highest distinction in theoretical and practical coursework.',
    fields: [
      { key: 'Credit Units', value: '4 Academic Credits' },
      { key: 'Graduation Year', value: 'Class of 2026' },
    ],
  },
  {
    id: 'CUSTOM',
    label: 'Custom Credential',
    icon: Sparkles,
    title: 'Certificate of Recognition & Professional Seal',
    subtitle: 'Official Corporate Endorsement & Credential Record',
    role: 'Technical Contributor',
    org: 'Enterprise Partner Labs',
    dept: 'Innovation Hub',
    signatoryName: 'Managing Director',
    signatoryTitle: 'Executive Authority',
    desc: 'Awarded in recognition of exceptional service, professional integrity, and significant contributions toward the development and deployment of mission-critical systems.',
    fields: [
      { key: 'Authorization Code', value: 'AUTH-2026-SEAL' },
      { key: 'Verification Status', value: 'Cryptographically Sealed' },
    ],
  },
];

export default function DashboardPage() {
  const router = useRouter();
  const [credentials, setCredentials] = useState<CredentialItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Search Filter
  const [searchQuery, setSearchQuery] = useState('');

  // Template selection
  const [selectedPreset, setSelectedPreset] = useState('INTERNSHIP');

  // Form State: Company Preferences & Credential Details
  const [recipientName, setRecipientName] = useState('SHAIK MAHABOOB ALI');
  const [recipientEmail, setRecipientEmail] = useState('mahaboob@college.edu');
  const [role, setRole] = useState(TEMPLATE_PRESETS[0].role);
  const [issuingOrg, setIssuingOrg] = useState(TEMPLATE_PRESETS[0].org);
  const [department, setDepartment] = useState(TEMPLATE_PRESETS[0].dept);
  const [certTitle, setCertTitle] = useState(TEMPLATE_PRESETS[0].title);
  const [certSubtitle, setCertSubtitle] = useState(TEMPLATE_PRESETS[0].subtitle);
  const [customDescription, setCustomDescription] = useState(TEMPLATE_PRESETS[0].desc);
  const [signatoryName, setSignatoryName] = useState(TEMPLATE_PRESETS[0].signatoryName);
  const [signatoryTitle, setSignatoryTitle] = useState(TEMPLATE_PRESETS[0].signatoryTitle);
  const [customFields, setCustomFields] = useState<CustomField[]>(TEMPLATE_PRESETS[0].fields);

  const [showAdvancedContent, setShowAdvancedContent] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [lastIssuedId, setLastIssuedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Handle Preset Switching
  const handleApplyPreset = (presetId: string) => {
    setSelectedPreset(presetId);
    const p = TEMPLATE_PRESETS.find((t) => t.id === presetId);
    if (p) {
      setRole(p.role);
      setIssuingOrg(p.org);
      setDepartment(p.dept);
      setCertTitle(p.title);
      setCertSubtitle(p.subtitle);
      setCustomDescription(p.desc);
      setSignatoryName(p.signatoryName);
      setSignatoryTitle(p.signatoryTitle);
      setCustomFields([...p.fields]);
    }
  };

  // Fetch credentials list with strict cache-busting
  const loadCredentials = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch(`/api/v1/credentials?t=${Date.now()}`, {
        cache: 'no-store',
        headers: { Pragma: 'no-cache', 'Cache-Control': 'no-cache' },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setCredentials(data.data);
      }
    } catch (err) {
      console.error('Failed to load credentials:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadCredentials();
  }, []);

  const handleIssueCredential = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientName.trim() || !recipientEmail.trim() || !role.trim()) {
      alert('Recipient Name, Email, and Role are required.');
      return;
    }

    setSubmitting(true);
    setSuccessMessage(null);

    try {
      const res = await fetch('/api/v1/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient_name: recipientName.trim(),
          recipient_email: recipientEmail.trim(),
          course_or_role: role.trim(),
          issuing_org: issuingOrg.trim() || 'TrustSeal Authority',
          certificate_type: selectedPreset,
          certificate_title: certTitle,
          certificate_subtitle: certSubtitle,
          custom_description: customDescription,
          department,
          signatory_name: signatoryName,
          signatory_title: signatoryTitle,
          custom_fields: customFields,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setSuccessMessage(`Successfully issued and cryptographically sealed! Certificate ID: ${json.data.credential.id}`);
        setLastIssuedId(json.data.credential.id);
        await loadCredentials();
      } else {
        alert(json.error || 'Failed to issue credential');
      }
    } catch {
      alert('Network error while issuing credential');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filtered credentials list based on search bar
  const filteredCredentials = credentials.filter((cred) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      cred.id.toLowerCase().includes(q) ||
      cred.recipient_name.toLowerCase().includes(q) ||
      cred.course_or_role.toLowerCase().includes(q) ||
      cred.issuing_org.toLowerCase().includes(q) ||
      cred.recipient_email.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-[#EAF1F3] text-[#17262C] flex flex-col">
      {/* Clean Top Navigation Bar (Zero Green Dots, Pure Executive Style) */}
      <header className="border-b border-[#D5E3E6] bg-white/90 backdrop-blur-md px-6 md:px-10 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center space-x-3">
          <div className="bg-[#1C2E35] p-2 rounded-xl text-white shadow-xs">
            <ShieldCheck className="w-5 h-5 text-[#8DAEB6]" />
          </div>
          <div>
            <h1 className="font-serif-title font-bold text-lg text-[#1C2E35] leading-tight">TrustSeal</h1>
            <p className="text-xs text-[#64748B]">Enterprise Credential Control Plane</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <Link
            href="/"
            className="text-xs font-semibold text-[#1C2E35] hover:text-[#2B454E] flex items-center space-x-1.5 bg-white border border-[#D5E3E6] hover:border-[#8DAEB6] px-3.5 py-2 rounded-xl transition-all shadow-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Home / Public Verifier</span>
          </Link>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 space-y-8">
        {/* Top Split Layout: Preferences Form (Left) & Real-Time Certificate Preview (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT: Issuance & Company Preferences Panel */}
          <div className="lg:col-span-6 bg-white border border-[#D5E3E6] rounded-2xl p-6 shadow-sm space-y-6">
            <div className="border-b border-[#EAF1F3] pb-4">
              <h2 className="font-serif-title font-bold text-xl text-[#1C2E35]">
                Certificate Issuance & Company Preferences
              </h2>
              <p className="text-xs text-[#64748B] mt-1">
                Customize titles, descriptions, and signatories to match your organization's official requirements.
              </p>
            </div>

            {/* Template Presets Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
                Template Presets
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {TEMPLATE_PRESETS.map((preset) => {
                  const Icon = preset.icon;
                  const isSelected = selectedPreset === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleApplyPreset(preset.id)}
                      className={`px-3 py-2.5 rounded-xl text-xs font-medium transition-all flex flex-col items-center justify-center space-y-1.5 border text-center ${
                        isSelected
                          ? 'bg-[#1C2E35] text-white border-[#1C2E35] shadow-sm'
                          : 'bg-white text-[#475569] border-[#D5E3E6] hover:border-[#8DAEB6]'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isSelected ? 'text-[#8DAEB6]' : 'text-[#64748B]'}`} />
                      <span className="truncate w-full">{preset.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Issuance Form */}
            <form onSubmit={handleIssueCredential} className="space-y-4">
              {/* Recipient Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#1C2E35]">Recipient Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Shaik Mahaboob Ali"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    className="w-full bg-[#F8FAFB] border border-[#D5E3E6] focus:border-[#8DAEB6] focus:bg-white rounded-xl px-3.5 py-2 text-xs text-[#1C2E35] focus:outline-none transition-colors"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#1C2E35]">Recipient Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="recipient@example.com"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    className="w-full bg-[#F8FAFB] border border-[#D5E3E6] focus:border-[#8DAEB6] focus:bg-white rounded-xl px-3.5 py-2 text-xs text-[#1C2E35] focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Organization & Department */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#1C2E35]">Issuing Organization</label>
                  <input
                    type="text"
                    placeholder="e.g. EduSkills & APSCHE"
                    value={issuingOrg}
                    onChange={(e) => setIssuingOrg(e.target.value)}
                    className="w-full bg-[#F8FAFB] border border-[#D5E3E6] focus:border-[#8DAEB6] focus:bg-white rounded-xl px-3.5 py-2 text-xs text-[#1C2E35] focus:outline-none transition-colors"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#1C2E35]">Department / Division</label>
                  <input
                    type="text"
                    placeholder="e.g. Software Engineering"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full bg-[#F8FAFB] border border-[#D5E3E6] focus:border-[#8DAEB6] focus:bg-white rounded-xl px-3.5 py-2 text-xs text-[#1C2E35] focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Role / Program */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#1C2E35]">Designation / Program / Course *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Java Full Stack Developer"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-[#F8FAFB] border border-[#D5E3E6] focus:border-[#8DAEB6] focus:bg-white rounded-xl px-3.5 py-2 text-xs text-[#1C2E35] focus:outline-none transition-colors"
                />
              </div>

              {/* Expandable Custom Certificate Content */}
              <div className="border border-[#D5E3E6] rounded-xl overflow-hidden bg-[#F8FAFB]">
                <button
                  type="button"
                  onClick={() => setShowAdvancedContent(!showAdvancedContent)}
                  className="w-full px-4 py-3 flex items-center justify-between text-xs font-semibold text-[#1C2E35] hover:bg-[#F1F5F7] transition-colors"
                >
                  <span className="flex items-center space-x-2">
                    <Award className="w-4 h-4 text-[#8DAEB6]" />
                    <span>Company Custom Content & Signatory Settings</span>
                  </span>
                  {showAdvancedContent ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {showAdvancedContent && (
                  <div className="p-4 space-y-4 border-t border-[#D5E3E6] bg-white text-xs">
                    <div className="space-y-1">
                      <label className="font-semibold text-[#1C2E35]">Certificate Title</label>
                      <input
                        type="text"
                        value={certTitle}
                        onChange={(e) => setCertTitle(e.target.value)}
                        className="w-full bg-[#F8FAFB] border border-[#D5E3E6] focus:border-[#8DAEB6] rounded-xl px-3 py-2 text-xs text-[#1C2E35]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-semibold text-[#1C2E35]">Certificate Subtitle / Citation</label>
                      <input
                        type="text"
                        value={certSubtitle}
                        onChange={(e) => setCertSubtitle(e.target.value)}
                        className="w-full bg-[#F8FAFB] border border-[#D5E3E6] focus:border-[#8DAEB6] rounded-xl px-3 py-2 text-xs text-[#1C2E35]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-semibold text-[#1C2E35]">Custom Certificate Description</label>
                      <textarea
                        rows={3}
                        value={customDescription}
                        onChange={(e) => setCustomDescription(e.target.value)}
                        placeholder="Write whatever description or accomplishments you want on the certificate..."
                        className="w-full bg-[#F8FAFB] border border-[#D5E3E6] focus:border-[#8DAEB6] rounded-xl p-3 text-xs text-[#1C2E35] leading-relaxed"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="font-semibold text-[#1C2E35]">Authorized Signatory Name</label>
                        <input
                          type="text"
                          value={signatoryName}
                          onChange={(e) => setSignatoryName(e.target.value)}
                          className="w-full bg-[#F8FAFB] border border-[#D5E3E6] focus:border-[#8DAEB6] rounded-xl px-3 py-2 text-xs text-[#1C2E35]"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="font-semibold text-[#1C2E35]">Signatory Title / Designation</label>
                        <input
                          type="text"
                          value={signatoryTitle}
                          onChange={(e) => setSignatoryTitle(e.target.value)}
                          className="w-full bg-[#F8FAFB] border border-[#D5E3E6] focus:border-[#8DAEB6] rounded-xl px-3 py-2 text-xs text-[#1C2E35]"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Success Notification */}
              {successMessage && (
                <div className="bg-[#EAF1F3] border border-[#8DAEB6] rounded-xl p-4 text-xs text-[#1C2E35] space-y-2">
                  <div className="flex items-center space-x-2 font-bold text-emerald-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>{successMessage}</span>
                  </div>
                  {lastIssuedId && (
                    <div className="flex items-center space-x-3 pt-1">
                      <Link
                        href={`/certificate/${lastIssuedId}`}
                        className="text-xs font-semibold text-[#1C2E35] underline hover:text-[#2B454E]"
                      >
                        View & Print Official Certificate →
                      </Link>
                    </div>
                  )}
                </div>
              )}

              {/* Primary Action Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-[#1C2E35] hover:bg-[#2B454E] text-white font-semibold py-3 px-4 rounded-xl transition-all flex items-center justify-center space-x-2 shadow-xs cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-[#8DAEB6]" />
                    <span>Sealing & Committing Outbox...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-[#8DAEB6]" />
                    <span>Issue Certificate & Commit Cryptographic Seal</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* RIGHT: Real-Time Certificate Live Preview */}
          <div className="lg:col-span-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-serif-title font-bold text-lg text-[#1C2E35]">Live Certificate Preview</h3>
                <p className="text-xs text-[#64748B]">Real-time preview as you adjust preferences</p>
              </div>
              <span className="text-[11px] font-sans bg-white border border-[#D5E3E6] text-[#475569] px-2.5 py-1 rounded-full">
                Interactive Preview
              </span>
            </div>

            {/* Certificate Preview Card */}
            <div className="bg-white rounded-2xl p-6 sm:p-8 border-4 border-double border-[#1C2E35] shadow-md space-y-4 text-center font-serif-title relative overflow-hidden">
              <div className="border-b border-[#D5E3E6] pb-3">
                <span className="text-[10px] font-sans font-bold uppercase tracking-widest text-[#8DAEB6] block mb-1">
                  {issuingOrg || 'TrustSeal Credential Authority'}
                </span>
                <h4 className="text-lg sm:text-xl font-bold text-[#1C2E35] tracking-wide uppercase">
                  {certTitle || 'Certificate of Completion'}
                </h4>
                <p className="text-[11px] text-[#64748B] italic mt-0.5 font-sans">
                  {certSubtitle}
                </p>
              </div>

              <div className="py-2 space-y-2">
                <p className="text-xs text-[#64748B] font-sans">This is to officially certify that</p>
                <p className="text-xl sm:text-2xl font-bold font-sans text-[#1C2E35] tracking-wide uppercase underline decoration-[#8DAEB6] underline-offset-4">
                  {recipientName || 'Recipient Name'}
                </p>
                <p className="text-xs text-[#1C2E35] font-sans max-w-md mx-auto leading-relaxed pt-1">
                  {customDescription}
                </p>
              </div>

              {/* Preview Footer */}
              <div className="grid grid-cols-3 gap-2 pt-4 border-t border-[#D5E3E6] items-center text-left text-[10px] font-sans text-[#64748B]">
                <div>
                  <p className="font-bold text-[#1C2E35]">Status:</p>
                  <p className="text-emerald-700 font-semibold">Authentic & Sealed</p>
                  <p className="text-[9px] text-[#94A3B8] mt-0.5">SHA-256 Validated</p>
                </div>

                <div className="text-center">
                  <div className="inline-block p-1 border border-[#D5E3E6] rounded-lg bg-[#F8FAFB]">
                    <div className="w-12 h-12 bg-[#1C2E35] rounded flex items-center justify-center text-white text-[9px] font-mono">
                      QR SEAL
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <p className="font-serif-title italic font-bold text-xs text-[#1C2E35]">
                    {signatoryName || 'Authorized Signatory'}
                  </p>
                  <p className="text-[9px] text-[#64748B]">{signatoryTitle}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM: Credential Registry Table (Full-Width) */}
        <div className="bg-white border border-[#D5E3E6] rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EAF1F3] pb-4">
            <div>
              <h2 className="font-serif-title font-bold text-xl text-[#1C2E35]">Digital Credential Registry</h2>
              <p className="text-xs text-[#64748B]">
                All issued credentials stored with cryptographic hash proofs ({filteredCredentials.length} records)
              </p>
            </div>

            <div className="flex items-center space-x-3">
              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-[#8DAEB6] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter by name, ID, or role..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-[#F8FAFB] border border-[#D5E3E6] focus:border-[#8DAEB6] focus:bg-white rounded-xl pl-9 pr-3 py-1.5 text-xs text-[#1C2E35] focus:outline-none w-56 sm:w-64"
                />
              </div>

              {/* Working Refresh Button with spinner feedback */}
              <button
                type="button"
                onClick={loadCredentials}
                disabled={isRefreshing}
                className="text-xs font-semibold text-[#1C2E35] hover:text-[#2B454E] flex items-center space-x-1.5 bg-[#F8FAFB] hover:bg-[#EAF1F3] border border-[#D5E3E6] px-3.5 py-1.5 rounded-xl transition-all cursor-pointer shadow-2xs"
                title="Refresh table from server"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-[#1C2E35] ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>{isRefreshing ? 'Refreshing...' : 'Refresh Table'}</span>
              </button>
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFB] text-[#64748B] border-b border-[#D5E3E6]">
                <tr>
                  <th className="py-3 px-4 font-semibold">Certificate ID</th>
                  <th className="py-3 px-4 font-semibold">Recipient</th>
                  <th className="py-3 px-4 font-semibold">Role / Course</th>
                  <th className="py-3 px-4 font-semibold">Organization</th>
                  <th className="py-3 px-4 font-semibold">Issue Date</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAF1F3]">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-[#64748B]">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#8DAEB6]" />
                      <span>Loading registry data...</span>
                    </td>
                  </tr>
                ) : filteredCredentials.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-[#64748B]">
                      {searchQuery ? 'No credentials match your search query.' : 'No credentials issued yet.'}
                    </td>
                  </tr>
                ) : (
                  filteredCredentials.map((cred) => (
                    <tr key={cred.id} className="hover:bg-[#F8FAFB] transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-[#1C2E35]">
                        <div className="flex items-center space-x-1.5">
                          <Link
                            href={`/certificate/${cred.id}`}
                            className="hover:underline text-[#0284C7] hover:text-[#0369A1] transition-colors"
                            title="View Official Certificate with QR Code"
                          >
                            {cred.id}
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleCopy(cred.id)}
                            className="text-[#94A3B8] hover:text-[#1C2E35] transition-colors"
                            title="Copy ID"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                          {copiedId === cred.id && (
                            <span className="text-[10px] text-emerald-600 font-sans">Copied!</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-medium text-[#1C2E35]">
                        <Link
                          href={`/certificate/${cred.id}`}
                          className="hover:underline hover:text-[#0284C7] transition-colors"
                          title="Open official certificate document with QR seal"
                        >
                          {cred.recipient_name}
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-[#475569]">{cred.course_or_role}</td>
                      <td className="py-3 px-4 text-[#64748B]">{cred.issuing_org}</td>
                      <td className="py-3 px-4 text-[#64748B]">
                        {new Date(cred.issue_date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
                          {cred.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center space-x-2">
                          <Link
                            href={`/certificate/${cred.id}`}
                            className="bg-[#1C2E35] hover:bg-[#2B454E] text-white text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-colors inline-flex items-center space-x-1.5 shadow-xs"
                            title="Open certificate with embedded QR seal"
                          >
                            <QrCode className="w-3.5 h-3.5 text-[#8DAEB6]" />
                            <span>Verify QR</span>
                          </Link>
                          <Link
                            href={`/certificate/${cred.id}?download=true`}
                            className="bg-white hover:bg-[#EAF1F3] text-[#1C2E35] border border-[#D5E3E6] text-[11px] font-medium px-3 py-1.5 rounded-lg transition-colors inline-flex items-center space-x-1"
                            title="Download Certificate as PDF"
                          >
                            <Printer className="w-3 h-3 text-[#64748B]" />
                            <span>Print</span>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Clean Footer */}
      <footer className="border-t border-[#D5E3E6] bg-white py-6 text-center text-xs text-[#64748B]">
        TrustSeal Enterprise Credential Engine • Institutional Verification Platform
      </footer>
    </div>
  );
}
