import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'TrustSeal | Tamper-Proof Digital Credential & Verification Engine',
  description:
    'Enterprise digital credential engine with tamper-proof cryptographic verification, company customization preferences, and instant scannable verification.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full bg-[#EAF1F3] text-[#17262C]">
      <body className="min-h-full flex flex-col font-sans selection:bg-[#8DAEB6] selection:text-[#17262C]">
        {children}
      </body>
    </html>
  );
}
