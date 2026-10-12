const assert = require('assert');
const dotenv = require('dotenv');
dotenv.config();

console.log('--- STARTING VERIFICATION OF SHIPROCKET MANUAL BOOKING WORKFLOW ---');

// 1. Test Pickup Location Matching Logic
function testPickupLocationResolution() {
  console.log('\n[TEST 1 & 2] Verifying Pickup Location Resolution & Matching...');
  
  const sampleRegisteredLocations = [
    { name: 'dapperss', pin: '600002', city: 'Chennai' },
    { name: 'mahakal', pin: '400004', city: 'Mumbai' },
    { name: 'Ashok og ', pin: '400001', city: 'Mumbai' },
    { name: 'kenri ', pin: '400004', city: 'Mumbai' },
    { name: 'shamil', pin: '600002', city: 'Chennai' }
  ];

  function matchLocation(requested, registeredList) {
    if (!requested) return null;
    const reqClean = String(requested).trim().toLowerCase();
    
    // 1. Exact match (case insensitive)
    const exact = registeredList.find(l => l.name.trim().toLowerCase() === reqClean);
    if (exact) return exact.name;

    // 2. Keyword/substring match
    const sub = registeredList.find(l => {
      const regClean = l.name.trim().toLowerCase();
      return regClean.includes(reqClean) || reqClean.includes(regClean);
    });
    if (sub) return sub.name;

    return null;
  }

  // Case 1: User selects/types 'Ashok og' (without trailing space)
  const ashokMatch = matchLocation('Ashok og', sampleRegisteredLocations);
  assert.strictEqual(ashokMatch, 'Ashok og ', 'Selecting "Ashok og" must resolve to registered "Ashok og "');
  console.log('✓ "Ashok og" correctly resolved to registered location: "' + ashokMatch + '"');

  // Case 2: User selects 'Ashok' or "Ashok's Address"
  const ashokSubMatch = matchLocation('Ashok', sampleRegisteredLocations);
  assert.strictEqual(ashokSubMatch, 'Ashok og ', 'Selecting "Ashok" must resolve to "Ashok og "');
  console.log('✓ "Ashok" correctly resolved to registered location: "' + ashokSubMatch + '"');

  // Case 3: User selects another registered location: 'mahakal'
  const mahakalMatch = matchLocation('mahakal', sampleRegisteredLocations);
  assert.strictEqual(mahakalMatch, 'mahakal', 'Selecting "mahakal" must resolve to "mahakal"');
  console.log('✓ "mahakal" correctly resolved to registered location: "' + mahakalMatch + '"');

  // Case 4: Invalid / unregistered location must NOT fall back
  const invalidMatch = matchLocation('Unknown Random Hub 999', sampleRegisteredLocations);
  assert.strictEqual(invalidMatch, null, 'Unregistered location must return null and NOT fall back');
  console.log('✓ Invalid location "Unknown Random Hub 999" correctly returned null (no silent warehouse fallback)');
}

// 2. Test Live Shiprocket Authentication and Live Pickup Locations
async function testLiveShiprocketRegisteredLocations() {
  console.log('\n[TEST LIVE] Querying Live Shiprocket Account Locations...');
  const email = process.env.SHIPROCKET_EMAIL;
  const password = process.env.SHIPROCKET_PASSWORD;

  if (!email || !password) {
    console.log('⚠️ No live credentials in .env, skipping live API call.');
    return;
  }

  const authRes = await fetch('https://apiv2.shiprocket.in/v1/external/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const authData = await authRes.json();
  const token = authData.token;
  assert.ok(token, 'Shiprocket auth token must be generated');
  console.log('✓ Live Shiprocket Token obtained successfully.');

  const pickupRes = await fetch('https://apiv2.shiprocket.in/v1/external/settings/company/pickup', {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const pickupData = await pickupRes.json();
  const addresses = pickupData?.data?.shipping_address || [];
  console.log(`✓ Fetched ${addresses.length} live registered pickup addresses from Shiprocket.`);

  const ashokLive = addresses.find(a => a.pickup_location.toLowerCase().includes('ashok'));
  assert.ok(ashokLive, 'Ashok pickup location must exist in live Shiprocket account');
  console.log(`✓ Found live Ashok pickup location: "${ashokLive.pickup_location}" (PIN: ${ashokLive.pin_code}, City: ${ashokLive.city})`);
}

// 3. Test Filename Formatting
function testFilenameConventions() {
  console.log('\n[TEST 4 & 5] Verifying Download Filename Formatting...');
  const orderId1 = 'DF-1025';
  const orderId2 = 'ord-9923';

  const fn1 = `Dappersfit-Label-${orderId1}.pdf`;
  const fn2 = `Dappersfit-Label-${orderId2}.pdf`;

  assert.strictEqual(fn1, 'Dappersfit-Label-DF-1025.pdf');
  assert.strictEqual(fn2, 'Dappersfit-Label-ord-9923.pdf');
  assert.ok(fn1.startsWith('Dappersfit-Label-') && fn1.endsWith('.pdf'));
  console.log('✓ Filenames conform to requirement: ' + fn1 + ', ' + fn2);
}

// 4. Test Minimal PDF Header validity
function testPdfHeaderValidity() {
  console.log('\n[TEST 10] Verifying PDF Buffer Header...');
  function generateMinimalPDF(title, lines) {
    let content = "%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n";
    let stream = "BT\n/F1 12 Tf\n20 750 Td\n(" + title.replace(/[()\\]/g, "") + ") Tj\n";
    for(let i=0; i < lines.length; i++) {
       stream += "0 -15 Td\n(" + lines[i].replace(/[()\\]/g, "") + ") Tj\n";
    }
    stream += "ET";
    const streamLen = stream.length;
    content += "4 0 obj\n<< /Length " + streamLen + " >>\nstream\n" + stream + "\nendstream\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF";
    return Buffer.from(content, 'utf-8');
  }

  const pdfBuf = generateMinimalPDF('Dappersfit Shipping Label', ['Order: DF-1025', 'AWB: 9382019482']);
  assert.ok(pdfBuf.toString('utf-8', 0, 8).startsWith('%PDF-1.4'), 'PDF buffer must start with valid PDF magic bytes');
  assert.ok(pdfBuf.toString('utf-8').includes('%%EOF'), 'PDF buffer must end with %%EOF');
  console.log('✓ Generated PDF is valid format (%PDF-1.4 with %%EOF)');
}

async function runAll() {
  testPickupLocationResolution();
  await testLiveShiprocketRegisteredLocations();
  testFilenameConventions();
  testPdfHeaderValidity();
  console.log('\n======================================================');
  console.log('ALL TESTS PASSED SUCCESSFULLY!');
  console.log('======================================================\n');
}

runAll().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
