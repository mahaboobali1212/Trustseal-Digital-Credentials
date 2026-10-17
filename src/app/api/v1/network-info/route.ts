import { NextRequest, NextResponse } from 'next/server';
import os from 'os';

/**
 * GET /api/v1/network-info
 * Dynamically detects the server's real active Wi-Fi / LAN IPv4 address
 * so mobile QR code scanning works on any local network without hardcoding IPs.
 */
export async function GET(request: NextRequest) {
  try {
    const interfaces = os.networkInterfaces();
    let bestIp = 'localhost';

    // Prioritize Wi-Fi or primary non-internal IPv4 interfaces
    for (const [name, addrs] of Object.entries(interfaces)) {
      if (!addrs) continue;
      for (const addr of addrs) {
        if (
          addr.family === 'IPv4' &&
          !addr.internal &&
          !addr.address.startsWith('169.254') &&
          !addr.address.startsWith('127.')
        ) {
          const isWifi = /wi-?fi|wlan|wireless/i.test(name);
          if (isWifi || bestIp === 'localhost') {
            bestIp = addr.address;
            if (isWifi) break;
          }
        }
      }
    }

    const forwardedHost = request.headers.get('x-forwarded-host');
    const hostHeader = forwardedHost || request.headers.get('host') || '';
    const proto = request.headers.get('x-forwarded-proto') || (request.url.startsWith('https') ? 'https' : 'http');
    const port = hostHeader.includes(':') ? hostHeader.split(':')[1] : '3000';

    let resolvedBaseUrl = `http://${bestIp}:${port}`;
    // 1. Check for active Cloudflare or ngrok tunnel file
    try {
      const fs = await import('fs');
      const path = await import('path');
      const tunnelFile = path.join(process.cwd(), 'data', 'tunnel-url.txt');
      if (fs.existsSync(tunnelFile)) {
        const tunnelUrl = fs.readFileSync(tunnelFile, 'utf-8').trim();
        if (tunnelUrl.startsWith('http://') || tunnelUrl.startsWith('https://')) {
          resolvedBaseUrl = tunnelUrl;
        }
      }
    } catch {
      // Ignore fallback
    }

    if (process.env.NEXT_PUBLIC_BASE_URL) {
      resolvedBaseUrl = process.env.NEXT_PUBLIC_BASE_URL.replace(/\/$/, '');
    } else if (hostHeader && !hostHeader.startsWith('localhost') && !hostHeader.startsWith('127.0.0.1')) {
      resolvedBaseUrl = `${proto}://${hostHeader}`;
    }

    return NextResponse.json(
      {
        success: true,
        ip: bestIp,
        port,
        baseUrl: resolvedBaseUrl,
        wifiUrl: `http://${bestIp}:${port}`,
      },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        success: false,
        ip: 'localhost',
        port: '3000',
        baseUrl: 'http://localhost:3000',
        error: message,
      },
      { status: 500 }
    );
  }
}
