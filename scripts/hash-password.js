#!/usr/bin/env node
/**
 * Simple script to hash a password with bcrypt
 * Usage: node scripts/hash-password.js
 */

const bcrypt = require('bcryptjs');

const password = 'KDkq9{Oa-O)AEo}G';

bcrypt.hash(password, 10, (err, hash) => {
  if (err) {
    console.error('Error:', err);
    process.exit(1);
  }

  console.log('Password:', password);
  console.log('Hash:', hash);
  console.log('\nCopy this hash for the SQL script or TypeScript script.');
});
