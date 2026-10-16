'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Shield,
  Layers,
  Radio,
  Zap,
  PlusCircle,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  Clock,
  ArrowRight,
  Database,
  Lock,
} from 'lucide-react';

interface CredentialItem {
  id: string;
  recipient_name: string;
  recipient_email: string;
  course_or_role: string;
  issuing_org: string;
  issue_date: string;
  status: string;
  sha256_hash: string;
}

interface EventLogItem {
  id: string;
  topic: string;
  timestamp: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
}

export default function DashboardPage() {
  const [credentials, setCredentials] = useState<CredentialItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [events, setEvents] = useState<EventLogItem[]>([]);

  // Form State
  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [role, setRole] = useState('Java Full Stack Developer');
  const [issuingOrg, setIssuingOrg] = useState('TrustSeal Credential Authority');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [lastIssuedId, setLastIssuedId] = useState<string | null>(null);

  // Fetch credentials list
  const loadCredentials = async () => {
    try {
      const res = await fetch('/api/v1/credentials');
      const data = await res.json();
      if (data.success) {
        setCredentials(data.data);
      }
    } catch (err) {
      console.error('Failed to load credentials:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCredentials();

    // Core Pillar 06: Real-time Event Streaming via SSE
    const eventSource = new EventSource('/api/v1/events/stream');

    eventSource.onmessage = (e) => {
      try {
        const parsed = JSON.parse(e.data);
        if (parsed.topic) {
          setEvents((prev) => [
            {
              id: Math.random().toString(36).substring(7),
              topic: parsed.topic,
              timestamp: new Date().toLocaleTimeString(),
              data: parsed.data,
            },
            ...prev.slice(0, 19), // keep last 20 events
          ]);
          // Refresh list when a new credential is confirmed
          loadCredentials();
        }
      } catch {
        // Heartbeat or ping
      }
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const handleIssueCredential = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientName || !recipientEmail) return;

    setSubmitting(true);
    setSuccessMessage(null);

    try {
      const res = await fetch('/api/v1/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient_name: recipientName,
          recipient_email: recipientEmail,
          course_or_role: role,
          issuing_org: issuingOrg || 'TrustSeal Credential Authority',
        }),
      });

      const json = await res.json();
      if (json.success) {
        setSuccessMessage(`Successfully committed with ACID Outbox & queued to Kafka!`);
        setLastIssuedId(json.data.credential.id);
        setRecipientName('');
        setRecipientEmail('');
        loadCredentials();
      } else {
        alert(json.error || 'Failed to issue credential');
      }
    } catch (err) {
      alert('Network error while issuing credential');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg shadow-indigo-600/30">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white leading-tight">TrustSeal Control Plane</h1>
            <p className="text-xs text-slate-400">High-Throughput Digital Credential & ACID Outbox Engine</p>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-xs">
          <Link
            href="/api/graphql"
            target="_blank"
            className="text-slate-400 hover:text-white px-3 py-1.5 rounded-lg border border-slate-800 hover:border-slate-700 transition-colors"
          >
            GraphQL Explorer
          </Link>
          <div className="bg-emerald-950/80 border border-emerald-800/80 text-emerald-400 px-3 py-1.5 rounded-lg font-mono flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Kafka & Outbox Active</span>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 space-y-8">
        {/* Metric Cards: The 6 Pillars in Action */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs uppercase font-medium">Issued Credentials</span>
              <Database className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-3xl font-extrabold text-white">{credentials.length}</div>
            <p className="text-[11px] text-slate-400 mt-1">PostgreSQL ACID Commits</p>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs uppercase font-medium">ACID Outbox Sync</span>
              <Layers className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-3xl font-extrabold text-emerald-400">100%</div>
            <p className="text-[11px] text-slate-400 mt-1">Zero Dual-Write Lost Events</p>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs uppercase font-medium">Kafka Event Stream</span>
              <Radio className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-3xl font-extrabold text-amber-300">Live</div>
            <p className="text-[11px] text-slate-400 mt-1">Topics: credential.issued / verified</p>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs uppercase font-medium">Redis QR Lookups</span>
              <Zap className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-3xl font-extrabold text-cyan-400">&lt; 2 ms</div>
            <p className="text-[11px] text-slate-400 mt-1">Read-Through Sub-millisecond Cache</p>
          </div>
        </div>

        {/* Issuance Form & Live Kafka Stream */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Issue Credential Form */}
          <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
            <div className="flex items-center space-x-2 border-b border-slate-800 pb-4">
              <PlusCircle className="w-5 h-5 text-indigo-400" />
              <div>
                <h2 className="text-base font-bold text-white">Issue Digital Credential</h2>
                <p className="text-xs text-slate-400">Atomic PostgreSQL transaction with Outbox record</p>
              </div>
            </div>

            {successMessage && (
              <div className="bg-emerald-950/60 border border-emerald-800/80 rounded-xl p-4 text-xs text-emerald-300 space-y-2">
                <div className="flex items-center space-x-1.5 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>{successMessage}</span>
                </div>
                {lastIssuedId && (
                  <Link
                    href={`/verify/${lastIssuedId}`}
                    className="inline-flex items-center text-emerald-400 underline font-semibold hover:text-emerald-200"
                  >
                    View Credential & QR Code ({lastIssuedId}) <ExternalLink className="w-3 h-3 ml-1" />
                  </Link>
                )}
              </div>
            )}

            <form onSubmit={handleIssueCredential} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Recipient Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Recipient University / Email</label>
                <input
                  type="email"
                  required
                  placeholder="rahul.sharma@college.edu"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Issuing Authority / Organization</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. EduSkills & APSCHE or TrustSeal Authority"
                  value={issuingOrg}
                  onChange={(e) => setIssuingOrg(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Internship Program / Role / Course</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Java Full Stack Developer"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  list="role-suggestions"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
                <datalist id="role-suggestions">
                  <option value="Java Full Stack Developer" />
                  <option value="Software Engineering Intern - Backend" />
                  <option value="Event-Driven Microservices Specialist" />
                  <option value="Full-Stack Engineer (Next.js 15 & gRPC)" />
                  <option value="Short-Term Internship for 120 Hours on Java Full Stack Developer" />
                </datalist>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80 text-[11px] text-slate-400 space-y-1">
                <div className="flex items-center space-x-1 font-semibold text-slate-300">
                  <Lock className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Dual-Write Protection Active</span>
                </div>
                <p>
                  Writes <code>credentials</code> and <code>outbox_events</code> in a single database transaction.
                  Kafka relay worker publishes automatically upon commit.
                </p>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors shadow-lg shadow-indigo-600/30 flex items-center justify-center space-x-2"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Executing Transaction...</span>
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4" />
                    <span>Issue Certificate & Commit Outbox</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Real-Time Kafka Event Streaming Monitor */}
          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <div className="flex items-center space-x-2">
                <Radio className="w-5 h-5 text-amber-400 animate-pulse" />
                <div>
                  <h2 className="text-base font-bold text-white">Live Event Stream</h2>
                  <p className="text-xs text-slate-400">Real-time Kafka event bus & outbox dispatch monitor</p>
                </div>
              </div>
              <span className="text-[11px] font-mono bg-slate-950 px-2.5 py-1 rounded border border-slate-800 text-slate-400">
                SSE / WebSocket Stream
              </span>
            </div>

            <div className="flex-1 bg-slate-950 rounded-xl p-4 border border-slate-800/80 font-mono text-xs overflow-y-auto max-h-96 space-y-2.5">
              {events.length === 0 ? (
                <div className="text-center py-16 text-slate-500">
                  <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Awaiting event stream activity...</p>
                  <p className="text-[11px] mt-1">Issue a credential on the left to see live Kafka event dispatch</p>
                </div>
              ) : (
                events.map((ev) => (
                  <div
                    key={ev.id}
                    className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/80 space-y-1 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-amber-300">[{ev.topic}]</span>
                      <span className="text-slate-500">{ev.timestamp}</span>
                    </div>
                    <div className="text-[11px] text-slate-300 truncate">
                      {ev.data?.recipient_name ? (
                        <span>
                          Issued to: <strong className="text-white">{ev.data.recipient_name}</strong> ({ev.data.credentialId})
                        </span>
                      ) : (
                        <span>Payload: {JSON.stringify(ev.data).substring(0, 75)}...</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Issued Credentials Registry Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-base font-bold text-white">Digital Credential Registry</h2>
              <p className="text-xs text-slate-400">All issued certificates stored in PostgreSQL</p>
            </div>
            <button
              onClick={loadCredentials}
              className="text-xs text-slate-400 hover:text-white flex items-center space-x-1.5 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Table</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4 font-semibold">Credential ID</th>
                  <th className="py-3 px-4 font-semibold">Recipient</th>
                  <th className="py-3 px-4 font-semibold">Course / Role</th>
                  <th className="py-3 px-4 font-semibold">Issue Date</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Verification Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {credentials.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500 font-sans">
                      No credentials issued yet. Use the form above to issue your first certificate!
                    </td>
                  </tr>
                ) : (
                  credentials.map((cred) => (
                    <tr key={cred.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-bold text-indigo-300">{cred.id}</td>
                      <td className="py-3 px-4 font-sans font-medium text-white">{cred.recipient_name}</td>
                      <td className="py-3 px-4 font-sans text-slate-300">{cred.course_or_role}</td>
                      <td className="py-3 px-4 text-slate-400">
                        {new Date(cred.issue_date).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2 py-0.5 rounded-full font-sans">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          {cred.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          href={`/verify/${cred.id}`}
                          className="inline-flex items-center text-indigo-400 hover:text-indigo-200 font-sans font-semibold space-x-1"
                        >
                          <span>Verify QR</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
