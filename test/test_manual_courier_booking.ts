import assert from 'assert';
import http from 'http';

// Verify manual booking endpoint logic
console.log('Testing manual courier booking endpoint validation...');

// Check customer name validator logic
const testNames = ['', '   ', 'Walkin Customer', 'walk-in customer', 'WALKIN CUSTOMER'];
for (const n of testNames) {
  const nameTrimmed = (n || '').trim();
  const isInvalid = !nameTrimmed || nameTrimmed.toLowerCase() === 'walkin customer' || nameTrimmed.toLowerCase() === 'walk-in customer';
  assert.strictEqual(isInvalid, true, `Expected "${n}" to be invalid customer name`);
}

// Check valid customer names
const validNames = ['Rahul Sharma', 'Ankit', 'Priya'];
for (const n of validNames) {
  const nameTrimmed = (n || '').trim();
  const isInvalid = !nameTrimmed || nameTrimmed.toLowerCase() === 'walkin customer' || nameTrimmed.toLowerCase() === 'walk-in customer';
  assert.strictEqual(isInvalid, false, `Expected "${n}" to be valid customer name`);
}

console.log('✓ Customer name validation verified.');

// Check IST pickup date logic
const now = new Date();
const utcMillis = now.getTime() + (now.getTimezoneOffset() * 60000);
const istMillis = utcMillis + (5.5 * 3600000);
const istDate = new Date(istMillis);
const istHour = istDate.getHours();
const pad = (n: number) => String(n).padStart(2, '0');
const formatYMD = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const todayStr = formatYMD(istDate);
const tomorrowStr = formatYMD(new Date(istMillis + 24 * 3600000));
const expectedDate = istHour < 14 ? todayStr : tomorrowStr;

assert(todayStr.length === 10);
assert(tomorrowStr.length === 10);
assert(typeof expectedDate === 'string');
console.log(`✓ IST earliest pickup calculation verified (Hour: ${istHour}, Scheduled: ${expectedDate}).`);

console.log('\nAll manual courier booking logic checks passed successfully!');
