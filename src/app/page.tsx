import Link from 'next/link';
import {
  ShieldCheck,
  Zap,
  Cpu,
  Layers,
  Radio,
  Lock,
  ArrowRight,
  ExternalLink,
  Server,
  FileCheck2,
} from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Top Navbar */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg shadow-indigo-600/30">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="font-extrabold text-base tracking-tight text-white">TrustSeal</span>
            <span className="ml-2 text-[10px] font-mono bg-indigo-950 text-indigo-400 border border-indigo-800/80 px-2 py-0.5 rounded-full uppercase">
              Production Architecture
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <Link
            href="/dashboard"
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors shadow-lg shadow-indigo-600/20"
          >
            Launch Dashboard
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-16 md:py-24 space-y-16">
        <div className="text-center space-y-6 max-w-3xl mx-auto">
          <div className="inline-flex items-center space-x-2 bg-indigo-950/60 border border-indigo-800/60 text-indigo-300 text-xs px-3.5 py-1.5 rounded-full font-medium">
            <Lock className="w-3.5 h-3.5 text-indigo-400" />
            <span>Built for Dezinet Core Engineering Selection</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Tamper-Proof Digital Credential &{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">
              Verification Engine
            </span>
          </h1>

          <p className="text-base md:text-lg text-slate-400 leading-relaxed">
            A production-grade distributed system solving the <strong>Dual-Write Problem</strong> using the{' '}
            <strong className="text-slate-200">PostgreSQL ACID Outbox Pattern</strong>, asynchronous event streaming with{' '}
            <strong className="text-slate-200">Apache Kafka</strong>, sub-millisecond public QR verification with{' '}
            <strong className="text-slate-200">Redis</strong>, and high-speed cryptographic signature validation via{' '}
            <strong className="text-slate-200">gRPC</strong>.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Link
              href="/dashboard"
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm px-6 py-3 rounded-xl transition-all shadow-xl shadow-indigo-600/25 flex items-center space-x-2"
            >
              <span>Explore Admin Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/api/graphql"
              target="_blank"
              className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-semibold text-sm px-5 py-3 rounded-xl transition-colors flex items-center space-x-2"
            >
              <span>Explore GraphQL API</span>
              <ExternalLink className="w-4 h-4 text-slate-500" />
            </Link>
          </div>
        </div>

        {/* The 6 Core Pillars Architecture Cards */}
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-xs uppercase font-mono font-bold tracking-widest text-indigo-400">
              Evaluated Production Standards
            </h2>
            <p className="text-2xl font-bold text-white mt-1">The 6 Core Architectural Pillars</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Pillar 1 */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-3 hover:border-slate-700 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold">
                01
              </div>
              <h3 className="text-base font-bold text-white">TypeScript & Next.js 15</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Modern App Router (`app/`), Server Components for blazing-fast LCP, and strict TypeScript interfaces across all data models.
              </p>
            </div>

            {/* Pillar 2 */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-3 hover:border-slate-700 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center font-bold">
                02
              </div>
              <h3 className="text-base font-bold text-white">GitLab CI/CD & GCP</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Automated linting, type-checking, multi-stage Docker build, and deployment automation ready for Google Cloud.
              </p>
            </div>

            {/* Pillar 3 */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-3 hover:border-slate-700 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
                03
              </div>
              <h3 className="text-base font-bold text-white">Apache Kafka Streams</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Decoupled event pipeline publishing `credential.issued` and `credential.verified` with partition-guaranteed ordering.
              </p>
            </div>

            {/* Pillar 4 */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-3 hover:border-slate-700 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
                04
              </div>
              <h3 className="text-base font-bold text-white">GraphQL & gRPC Microservice</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Flexible client queries with GraphQL and high-performance binary Protocol Buffers RPC for cryptographic signature validation.
              </p>
            </div>

            {/* Pillar 5 */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-3 hover:border-slate-700 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold">
                05
              </div>
              <h3 className="text-base font-bold text-white">PostgreSQL & ACID Outbox</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Eliminates the Dual-Write Problem by atomically committing certificate records and outbox events in a single database transaction.
              </p>
            </div>

            {/* Pillar 6 */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-3 hover:border-slate-700 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-bold">
                06
              </div>
              <h3 className="text-base font-bold text-white">Redis Cache & WebSockets</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Sub-2ms response times on public QR scans via Redis Cache-Aside, and real-time streaming progress bars for admin issuance.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8 text-center text-xs text-slate-500">
        TrustSeal Distributed Microservices Engine • Built for Dezinet Engineering Internship Selection
      </footer>
    </div>
  );
}
