export const runtime = "nodejs";

import { NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';

/**
 * STANDALONE TEST - Bypass toute la logique existante
 * GET /api/test-scrapingbee-direct
 */
export async function GET() {
  try {
    console.log('[TEST] Starting direct ScrapingBee test...');

    // Config Swish hardcodée
    const testUrl = 'https://swish.ca/sanitaire-extend-commercial-canister-vacuum-11';

    if (!process.env.SCRAPINGBEE_API_KEY) {
      return NextResponse.json({
        success: false,
        error: 'SCRAPINGBEE_API_KEY not set'
      }, { status: 500 });
    }

    console.log('[TEST] API Key present:', !!process.env.SCRAPINGBEE_API_KEY);
    console.log('[TEST] API Key length:', process.env.SCRAPINGBEE_API_KEY.length);

    // Build request
    const params = new URLSearchParams({
      api_key: process.env.SCRAPINGBEE_API_KEY,
      url: testUrl,
      premium_proxy: 'true',
      country_code: 'ca',
      render_js: 'true',
      wait: '10000',
      block_ads: 'true',
      block_resources: 'false',
    });

    console.log('[TEST] Calling ScrapingBee API...');
    const startTime = Date.now();

    const response = await axios.get(
      `https://app.scrapingbee.com/api/v1/?${params.toString()}`,
      { timeout: 120000 }
    );

    const duration = Date.now() - startTime;
    const creditsUsed = response.headers['spb-cost'];

    console.log('[TEST] Response received!');
    console.log('[TEST] Duration:', duration, 'ms');
    console.log('[TEST] Credits used:', creditsUsed);
    console.log('[TEST] HTML length:', response.data.length);

    // Parse with Cheerio
    const $ = cheerio.load(response.data);

    // Extract data
    const selectors = {
      productName: ['h1.product__title', 'h1.product-title', 'h1'],
      productPrice: ['.price-item.price-item--regular', '.price__regular .price-item', 'span.price-item', '.price'],
    };

    const extractWithFallback = (selectorList: string[]) => {
      for (const selector of selectorList) {
        const text = $(selector).first().text().trim();
        if (text) return text;
      }
      return null;
    };

    const name = extractWithFallback(selectors.productName);
    const priceText = extractWithFallback(selectors.productPrice);

    let price = null;
    if (priceText) {
      const priceMatch = priceText.match(/[\d,]+\.?\d*/);
      if (priceMatch) {
        price = parseFloat(priceMatch[0].replace(/,/g, ''));
      }
    }

    console.log('[TEST] Extracted name:', name);
    console.log('[TEST] Extracted price:', price);

    return NextResponse.json({
      success: true,
      url: testUrl,
      data: {
        name,
        priceText,
        price,
      },
      metadata: {
        duration,
        creditsUsed,
        htmlLength: response.data.length,
      },
    });

  } catch (error: any) {
    console.error('[TEST] ERROR:', error.message);
    console.error('[TEST] Stack:', error.stack);

    return NextResponse.json({
      success: false,
      error: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
    }, { status: 500 });
  }
}
