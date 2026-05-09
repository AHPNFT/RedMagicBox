const crypto = require('crypto');

const _K = [104, 111, 110, 103, 109, 111, 95, 97, 99, 116, 95, 118, 51];
const _S = [115, 101, 99, 114, 101, 116, 95, 115, 97, 108, 116];

function dk() {
  return _K.map(c => String.fromCharCode(c)).join('');
}

function ds() {
  return _S.map(c => String.fromCharCode(c)).join('');
}

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function randomBody(len) {
  let result = '';
  for (let i = 0; i < len; i++) {
    result += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
  }
  return result;
}

function generateCode() {
  const body = randomBody(12);
  const hmac = crypto.createHmac('sha256', dk());
  hmac.update(body + ds());
  const checksum = hmac.digest('hex').toUpperCase().slice(0, 4);
  const raw = body + checksum;
  return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}`;
}

function validateCode(code) {
  if (!/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code)) return false;
  const raw = code.replace(/-/g, '');
  const body = raw.slice(0, 12);
  const checksum = raw.slice(12, 16);
  const hmac = crypto.createHmac('sha256', dk());
  hmac.update(body + ds());
  const computed = hmac.digest('hex').toUpperCase().slice(0, 4);
  return computed === checksum;
}

const count = parseInt(process.argv[2] || '10', 10);
const output = process.argv[3] || null;

console.log(`\n🔑 红魔Box 激活码生成器`);
console.log(`生成数量: ${count}\n`);

const codes = [];
for (let i = 0; i < count; i++) {
  const code = generateCode();
  codes.push(code);
  console.log(`  ${i + 1}. ${code}`);
}

let allValid = true;
for (const code of codes) {
  if (!validateCode(code)) {
    console.error(`❌ 验证失败: ${code}`);
    allValid = false;
  }
}
console.log(`\n✅ 全部验证${allValid ? '通过' : '失败'}`);

if (output) {
  const fs = require('fs');
  fs.writeFileSync(output, codes.join('\n'), 'utf8');
  console.log(`\n📄 已导出到: ${output}`);
} else {
  const fs = require('fs');
  const defaultFile = `activation_codes_${Date.now()}.txt`;
  fs.writeFileSync(defaultFile, codes.join('\n'), 'utf8');
  console.log(`\n📄 已导出到: ${defaultFile}`);
}
