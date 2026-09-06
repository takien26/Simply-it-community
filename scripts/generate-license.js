#!/usr/bin/env node

/**
 * SIMPLY IT - Enterprise License Key Generator
 * 
 * Usage:
 *   node scripts/generate-license.js --customer "Công ty May 10" --days 365
 *   node scripts/generate-license.js --customer "Tập đoàn ABC" --tier ENTERPRISE --days 730
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const privateKeyPath = path.join(__dirname, 'license_private_key.pem');

if (!fs.existsSync(privateKeyPath)) {
  console.error('❌ Error: license_private_key.pem not found in scripts directory!');
  process.exit(1);
}

const privateKey = fs.readFileSync(privateKeyPath, 'utf8');

// Parse CLI Arguments
const args = process.argv.slice(2);
let customer = 'Doanh nghiệp Đối tác';
let tier = 'ENTERPRISE';
let days = 365;
let modules = ['SSO', 'LDAP', 'WEBHOOKS', 'ROUTING'];
let maxAssets = 10000;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--customer' && args[i + 1]) {
    customer = args[i + 1];
    i++;
  } else if (args[i] === '--tier' && args[i + 1]) {
    tier = args[i + 1].toUpperCase();
    i++;
  } else if (args[i] === '--days' && args[i + 1]) {
    days = parseInt(args[i + 1], 10) || 365;
    i++;
  } else if (args[i] === '--modules' && args[i + 1]) {
    modules = args[i + 1].split(',').map((m) => m.trim().toUpperCase());
    i++;
  } else if (args[i] === '--maxAssets' && args[i + 1]) {
    maxAssets = parseInt(args[i + 1], 10) || 10000;
    i++;
  }
}

const now = new Date();
const expiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

const payload = {
  customer,
  tier,
  modules,
  maxAssets,
  issuedAt: now.toISOString(),
  expiresAt: expiresAt.toISOString(),
};

const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');

const signer = crypto.createSign('SHA256');
signer.update(payloadB64);
signer.end();
const signatureB64 = signer.sign(privateKey, 'base64url');

const licenseKey = `SIMPLY-ENT-${payloadB64}.${signatureB64}`;

console.log('\n======================================================');
console.log('   👑 SIMPLY IT — ENTERPRISE LICENSE KEY GENERATED   ');
console.log('======================================================');
console.log(`👤 Khách hàng  : ${customer}`);
console.log(`🏷️  Gói bản quyền: ${tier}`);
console.log(`📅 Ngày tạo    : ${now.toLocaleDateString('vi-VN')}`);
console.log(`⏳ Hạn sử dụng : ${expiresAt.toLocaleDateString('vi-VN')} (${days} ngày)`);
console.log(`⚡ Tính năng    : ${modules.join(', ')}`);
console.log('------------------------------------------------------');
console.log('🔑 LICENSE KEY (Gửi chuỗi này cho khách hàng):');
console.log('------------------------------------------------------');
console.log(licenseKey);
console.log('======================================================\n');
