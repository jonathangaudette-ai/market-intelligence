#!/usr/bin/env node
import fetch from 'node-fetch';

const DEPLOYMENT_URL = 'https://market-intelligence-kappa.vercel.app';

console.log('🚀 Triggering scan...\n');

try {
  const response = await fetch(
    `${DEPLOYMENT_URL}/api/companies/my-company/pricing/scans`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    }
  );

  console.log(`Status: ${response.status} ${response.statusText}`);

  if (response.ok) {
    const data = await response.json();
    console.log('\n✅ Scan Response:');
    console.log(JSON.stringify(data, null, 2));
  } else {
    const error = await response.text();
    console.log('\n❌ Error Response:');
    console.log(error);
  }
} catch (error) {
  console.error('❌ Request failed:', error.message);
  process.exit(1);
}
