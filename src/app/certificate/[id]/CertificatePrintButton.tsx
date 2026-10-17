'use client';

import React, { useState, useEffect } from 'react';
import { Download, Printer, CheckCircle2, Loader2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface CertificatePrintButtonProps {
  credentialId?: string;
  recipientName?: string;
}

export default function CertificatePrintButton({
  credentialId = 'ID',
  recipientName = 'Recipient',
}: CertificatePrintButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const handleDownloadPdf = async () => {
    const certElement = document.getElementById('certificate-document');
    if (!certElement) {
      window.print();
      return;
    }

    try {
      setIsDownloading(true);
      setDownloadSuccess(false);

      // Render the certificate element at 2.5x resolution for crystal-clear sharp print quality
      const canvas = await html2canvas(certElement, {
        scale: 2.5,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png', 1.0);
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;

      // Fit to PDF format preserving exact visual dimensions
      const isLandscape = imgWidth >= imgHeight;
      const pdf = new jsPDF({
        orientation: isLandscape ? 'landscape' : 'portrait',
        unit: 'px',
        format: [imgWidth, imgHeight],
      });

      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

      const safeName = recipientName.replace(/[^a-zA-Z0-9_-]/g, '_');
      const fileName = `Certificate_${credentialId}_${safeName}.pdf`;

      pdf.save(fileName);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      // Fallback to browser print dialog
      window.print();
    } finally {
      setIsDownloading(false);
    }
  };

  // Automatically trigger download if navigated with ?download=true
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('download') === 'true') {
        const timer = setTimeout(() => {
          handleDownloadPdf();
        }, 800);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  return (
    <div className="flex items-center space-x-2">
      <button
        type="button"
        onClick={handleDownloadPdf}
        disabled={isDownloading}
        className="bg-[#1C2E35] hover:bg-[#2B454E] text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all flex items-center space-x-2 shadow-xs cursor-pointer disabled:opacity-60"
        title="Download Certificate as PDF"
      >
        {isDownloading ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#8DAEB6]" />
            <span>Downloading PDF...</span>
          </>
        ) : downloadSuccess ? (
          <>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Downloaded!</span>
          </>
        ) : (
          <>
            <Download className="w-3.5 h-3.5 text-[#8DAEB6]" />
            <span>Download Certificate (PDF)</span>
          </>
        )}
      </button>

      <button
        type="button"
        onClick={() => window.print()}
        className="bg-white hover:bg-[#F8FAFB] text-[#1C2E35] border border-[#D5E3E6] text-xs font-medium px-3 py-2 rounded-xl transition-all flex items-center space-x-1.5 shadow-2xs cursor-pointer"
        title="Open browser print dialog"
      >
        <Printer className="w-3.5 h-3.5 text-[#64748B]" />
        <span className="hidden sm:inline">Print</span>
      </button>
    </div>
  );
}
