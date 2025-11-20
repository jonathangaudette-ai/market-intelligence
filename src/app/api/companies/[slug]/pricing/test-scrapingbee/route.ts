import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';

interface TestScrapingBeeParams {
  params: Promise<{
    slug: string;
  }>;
}

// Helper to extract text with fallback selectors
function extractWithFallback($: cheerio.CheerioAPI, selectors: string[]): string | null {
  for (const selector of selectors) {
    try {
      const element = $(selector).first();
      if (element.length) {
        const text = element.text().trim();
        if (text) {
          return text;
        }
      }
    } catch (error) {
      console.warn(`[Test] Selector failed: ${selector}`);
    }
  }
  return null;
}

// Helper to extract image with fallback selectors
function extractImageWithFallback($: cheerio.CheerioAPI, selectors: string[]): string | null {
  for (const selector of selectors) {
    try {
      const element = $(selector).first();
      if (element.length) {
        const src = element.attr('src') || element.attr('data-src');
        if (src) {
          return src;
        }
      }
    } catch (error) {
      console.warn(`[Test] Image selector failed: ${selector}`);
    }
  }
  return null;
}

/**
 * POST /api/companies/[slug]/pricing/test-scrapingbee
 * Test ScrapingBee configuration with a single product URL
 */
export async function POST(
  request: NextRequest,
  { params }: TestScrapingBeeParams
) {
  try {
    const { url, config } = await request.json();

    if (!url || !config) {
      return NextResponse.json(
        { success: false, error: 'Missing url or config' },
        { status: 400 }
      );
    }

    // Validate SCRAPINGBEE_API_KEY
    if (!process.env.SCRAPINGBEE_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'SCRAPINGBEE_API_KEY not configured' },
        { status: 500 }
      );
    }

    console.log('[Test ScrapingBee] Testing URL:', url);
    console.log('[Test ScrapingBee] Config:', JSON.stringify(config, null, 2));

    const startTime = Date.now();

    // Build ScrapingBee API request
    const apiParams = new URLSearchParams({
      api_key: process.env.SCRAPINGBEE_API_KEY,
      url: url,
      premium_proxy: config.api.premium_proxy.toString(),
      country_code: config.api.country_code,
      render_js: config.api.render_js.toString(),
      wait: config.api.wait.toString(),
      block_ads: config.api.block_ads.toString(),
      block_resources: (config.api.block_resources || false).toString(),
    });

    if (config.api.wait_for) {
      apiParams.append('wait_for', config.api.wait_for);
    }

    const response = await axios.get(
      `https://app.scrapingbee.com/api/v1/?${apiParams.toString()}`,
      {
        timeout: config.api.timeout || 120000,
      }
    );

    const html = response.data;
    const creditsUsed = response.headers['spb-cost'] || 0;
    const duration = Date.now() - startTime;

    console.log(`[Test ScrapingBee] Response received (${creditsUsed} credits, ${duration}ms)`);

    // Check for Cloudflare challenge
    if (
      typeof html === 'string' &&
      (html.includes('Just a moment...') ||
        html.includes('Checking your browser') ||
        html.includes('Cloudflare'))
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cloudflare challenge detected - bypass failed',
          creditsUsed,
          duration,
        },
        { status: 200 }
      );
    }

    // Parse HTML with Cheerio
    const $ = cheerio.load(html);

    // Extract product data using fallback selectors
    const name = extractWithFallback($, config.selectors.productName);
    const priceText = extractWithFallback($, config.selectors.productPrice);
    const sku = config.selectors.productSku
      ? extractWithFallback($, config.selectors.productSku)
      : null;
    const imageUrl = config.selectors.productImage
      ? extractImageWithFallback($, config.selectors.productImage)
      : null;

    console.log('[Test ScrapingBee] Extracted data:', { name, priceText, sku, imageUrl });

    // Parse price
    let price = null;
    if (priceText) {
      const priceMatch = priceText.match(/[\d,]+\.?\d*/);
      if (priceMatch) {
        price = parseFloat(priceMatch[0].replace(/,/g, ''));
      }
    }

    // Check if extraction was successful
    const success = !!(name && price);

    return NextResponse.json({
      success,
      data: {
        name,
        price,
        priceText,
        sku,
        imageUrl,
        url,
      },
      metadata: {
        creditsUsed,
        duration,
        htmlLength: html.length,
      },
      error: success ? null : 'Missing required fields (name or price)',
    });
  } catch (error: any) {
    console.error('[Test ScrapingBee] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        details: error.response?.data || null,
      },
      { status: 500 }
    );
  }
}
