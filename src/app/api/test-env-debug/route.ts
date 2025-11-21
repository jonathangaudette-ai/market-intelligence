export const runtime = "nodejs";

import { NextResponse } from 'next/server';

/**
 * Debug endpoint to check environment variable
 */
export async function GET() {
  try {
    const apiKey = process.env.SCRAPINGBEE_API_KEY;

    return NextResponse.json({
      hasKey: !!apiKey,
      keyLength: apiKey?.length || 0,
      keyStart: apiKey?.substring(0, 10) || 'N/A',
      keyEnd: apiKey?.substring(apiKey.length - 10) || 'N/A',
      allEnvKeys: Object.keys(process.env).filter(k => k.includes('SCRAPING')),
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}
