import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'TrustSeal | Tamper-Proof Digital Credential & Verification Engine',
  description:
    'High-throughput event-driven microservices architecture featuring Next.js 15, PostgreSQL ACID Outbox, Apache Kafka, gRPC over mTLS, and Redis caching.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full bg-slate-950 text-slate-100">
      <body className="min-h-full flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
