import { NextResponse } from 'next/server';
import { db } from '@/db';
import { pricingCompetitors } from '@/db/schema-pricing';
import { eq } from 'drizzle-orm';

/**
 * Test endpoint to verify scraper_config is parsed correctly by Drizzle
 * GET /api/test-scraper-config
 */
export async function GET() {
  try {
    const [competitor] = await db
      .select()
      .from(pricingCompetitors)
      .where(eq(pricingCompetitors.name, 'Swish'))
      .limit(1);

    if (!competitor) {
      return NextResponse.json({ error: 'Swish not found' }, { status: 404 });
    }

    const scraperConfig = competitor.scraperConfig;
    const isString = typeof scraperConfig === 'string';
    const isObject = scraperConfig && typeof scraperConfig === 'object';

    return NextResponse.json({
      competitorId: competitor.id,
      competitorName: competitor.name,
      scraperConfigType: typeof scraperConfig,
      scraperConfigIsString: isString,
      scraperConfigIsObject: isObject,
      scraperType: isObject ? (scraperConfig as any).scraperType : 'N/A',
      hasScrapingBee: isObject ? !!(scraperConfig as any).scrapingbee : false,
      wouldUseScrapingBee: isObject && (scraperConfig as any).scraperType === 'scrapingbee',
      rawFirstChars: isString ? (scraperConfig as string).substring(0, 100) : null,
      parsedScraperType: isString ? JSON.parse(scraperConfig as string).scraperType : null,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
