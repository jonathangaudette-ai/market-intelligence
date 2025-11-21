import { NextResponse } from 'next/server';

/**
 * Test endpoint to verify environment variables are accessible
 * GET /api/test-env-vars
 */
export async function GET() {
  const hasScrapingBeeKey = !!process.env.SCRAPINGBEE_API_KEY;
  const keyLength = process.env.SCRAPINGBEE_API_KEY?.length || 0;
  const keyPrefix = process.env.SCRAPINGBEE_API_KEY?.substring(0, 10) || 'NOT_SET';

  return NextResponse.json({
    hasScrapingBeeKey,
    keyLength,
    keyPrefix,
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV,
  });
}
