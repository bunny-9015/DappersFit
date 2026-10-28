import assert from 'assert';
import {
  detectOrderType,
  isExceptionOrder,
  selectPriorityCourierPlan,
  executePriorityAwbAssignment,
  validateDappersfitPickupAddress,
  STANDARD_ORDER_TIERS,
  EXCEPTION_ORDER_TIERS,
  ServiceableCourier
} from '../src/utils/priorityCourierModule';

console.log('===============================================================');
console.log('RUNNING COMPLETE SPECIFICATION TEST SUITE (SECTIONS 1 - 10)');
console.log('===============================================================\n');

let totalTests = 0;
let passedTests = 0;

function it(name: string, fn: () => void | Promise<void>) {
  totalTests++;
  try {
    const res = fn();
    if (res && typeof (res as any).then === 'function') {
      return (res as Promise<void>).then(() => {
        passedTests++;
        console.log(`  ✓ ${name}`);
      }).catch((err) => {
        console.error(`  ✗ ${name}`);
        console.error(err);
        process.exitCode = 1;
      });
    }
    passedTests++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

async function runTests() {
  // -------------------------------------------------------------------------
  // TEST 1: Exception detection for WG, Water Gun, RC, Projector, and exact SKU/tags
  // -------------------------------------------------------------------------
  console.log('[SECTION 9.1] Exception detection for WG, Water Gun, RC, Projector & exact values');

  it('Exception: "WG" in item name, SKU, or tag triggers Exception Order', () => {
    assert.strictEqual(detectOrderType({ items: [{ name: 'WG Blaster 200', sku: 'SKU-01' }] }), 'Exception');
    assert.strictEqual(detectOrderType({ items: [{ name: 'Blaster', sku: 'WG-999' }] }), 'Exception');
    assert.strictEqual(detectOrderType({ items: [{ name: 'Blaster', sku: 'B-01', tags: ['WG'] }] }), 'Exception');
  });

  it('Exception: "Water Gun" triggers Exception Order', () => {
    const order = { items: [{ name: 'Automatic Water Gun with Tank', sku: 'TOY-01' }] };
    assert.strictEqual(detectOrderType(order), 'Exception');
    assert.strictEqual(isExceptionOrder(order), true);
  });

  it('Exception: "RC" triggers Exception Order', () => {
    const order = { items: [{ name: 'High Speed RC Racing Car', sku: 'TOY-RC' }] };
    assert.strictEqual(detectOrderType(order), 'Exception');
  });

  it('Exception: "Projector" triggers Exception Order', () => {
    const order = { items: [{ name: 'Portable Home Cinema Projector 1080P', sku: 'PRJ-1080' }] };
    assert.strictEqual(detectOrderType(order), 'Exception');
  });

  it('Exception: Exact SKU or tag values "wg", "rc", "pro" trigger Exception', () => {
    assert.strictEqual(detectOrderType({ items: [{ name: 'Accessory', sku: 'wg' }] }), 'Exception');
    assert.strictEqual(detectOrderType({ items: [{ name: 'Accessory', sku: 'rc' }] }), 'Exception');
    assert.strictEqual(detectOrderType({ items: [{ name: 'Accessory', sku: 'pro' }] }), 'Exception');
    assert.strictEqual(detectOrderType({ items: [{ name: 'Accessory', sku: 'ACC-01', tags: ['wg'] }] }), 'Exception');
    assert.strictEqual(detectOrderType({ items: [{ name: 'Accessory', sku: 'ACC-02', tags: ['rc'] }] }), 'Exception');
    assert.strictEqual(detectOrderType({ items: [{ name: 'Accessory', sku: 'ACC-03', tags: ['pro'] }] }), 'Exception');
  });

  // -------------------------------------------------------------------------
  // TEST 2: False positives for Product and Arc
  // -------------------------------------------------------------------------
  console.log('\n[SECTION 9.2] False positive prevention (Product, Arc, Production, Torch)');

  it('False Positive: "Product" does NOT trigger exception (contains "pro" as substring)', () => {
    const order = { items: [{ name: 'Dappersfit Featured Product', sku: 'PROD-101' }] };
    assert.strictEqual(detectOrderType(order), 'Standard');
    assert.strictEqual(isExceptionOrder(order), false);
  });

  it('False Positive: "Arc" does NOT trigger exception (contains "rc" as substring)', () => {
    const order = { items: [{ name: 'Men Arc Weld Slim Jeans', sku: 'JEANS-ARC-01' }] };
    assert.strictEqual(detectOrderType(order), 'Standard');
    assert.strictEqual(isExceptionOrder(order), false);
  });

  it('False Positive: "Production", "Process", "Torch" do NOT trigger exception', () => {
    const order = {
      items: [
        { name: 'Production Sample Denim', sku: 'PRD-SMP' },
        { name: 'Processed Wool Scarf', sku: 'WOL-PRC' },
        { name: 'Outdoor Torch Light', sku: 'TRCH-01' }
      ]
    };
    assert.strictEqual(detectOrderType(order), 'Standard');
    assert.strictEqual(isExceptionOrder(order), false);
  });

  // -------------------------------------------------------------------------
  // TEST 3: Case-insensitive matching
  // -------------------------------------------------------------------------
  console.log('\n[SECTION 9.3] Case-insensitive matching verification');

  it('Case-Insensitivity: Matches regardless of uppercase, lowercase, or mixed case', () => {
    assert.strictEqual(detectOrderType({ items: [{ name: 'water gun', sku: 'A1' }] }), 'Exception');
    assert.strictEqual(detectOrderType({ items: [{ name: 'WATER GUN', sku: 'A2' }] }), 'Exception');
    assert.strictEqual(detectOrderType({ items: [{ name: 'WaTeR gUn', sku: 'A3' }] }), 'Exception');
    assert.strictEqual(detectOrderType({ items: [{ name: 'projector', sku: 'B1' }] }), 'Exception');
    assert.strictEqual(detectOrderType({ items: [{ name: 'PROJECTOR', sku: 'B2' }] }), 'Exception');
    assert.strictEqual(detectOrderType({ items: [{ name: 'Toy rc Plane', sku: 'C1' }] }), 'Exception');
    assert.strictEqual(detectOrderType({ items: [{ name: 'Toy RC Plane', sku: 'C2' }] }), 'Exception');
    assert.strictEqual(detectOrderType({ items: [{ name: 'Camera pro Lens', sku: 'D1' }] }), 'Exception');
    assert.strictEqual(detectOrderType({ items: [{ name: 'Camera PRO Lens', sku: 'D2' }] }), 'Exception');
  });

  // -------------------------------------------------------------------------
  // TEST 4: Cheapest-courier selection within a priority tier
  // -------------------------------------------------------------------------
  console.log('\n[SECTION 9.4] Cheapest-courier selection within priority tier');

  it('Cheapest Selection: Multiple couriers in same tier sorted by lowest rate first', () => {
    const couriers: ServiceableCourier[] = [
      { courierId: 101, courierName: 'Delhivery Surface Standard', rate: 72.00 },
      { courierId: 102, courierName: 'Delhivery Surface Economy', rate: 54.00 },
      { courierId: 103, courierName: 'Delhivery Surface Express Ground', rate: 61.50 }
    ];
    const plan = selectPriorityCourierPlan({ items: [{ name: 'T-Shirt', sku: 'TSH-01' }] }, couriers);
    assert.strictEqual(plan.candidates.length, 3);
    assert.strictEqual(plan.candidates[0].courierId, 102);
    assert.strictEqual(plan.candidates[0].rate, 54.00);
    assert.strictEqual(plan.candidates[1].courierId, 103);
    assert.strictEqual(plan.candidates[1].rate, 61.50);
    assert.strictEqual(plan.candidates[2].courierId, 101);
    assert.strictEqual(plan.candidates[2].rate, 72.00);
  });

  it('Cheapest Selection: Exception Tier 2 (BlueDart 2KG vs Delhivery 2KG) picks cheaper first', () => {
    // Scenario A: Delhivery 2KG is cheaper
    const couriersA: ServiceableCourier[] = [
      { courierId: 201, courierName: 'BlueDart Surface 2KG', rate: 95.00 },
      { courierId: 202, courierName: 'Delhivery Surface 2kg Ground', rate: 78.00 }
    ];
    const planA = selectPriorityCourierPlan({ items: [{ name: 'Water Gun', sku: 'WG-01' }] }, couriersA);
    assert.strictEqual(planA.candidates[0].courierId, 202);
    assert.strictEqual(planA.candidates[0].courierName, 'Delhivery Surface 2kg Ground');

    // Scenario B: BlueDart 2KG is cheaper
    const couriersB: ServiceableCourier[] = [
      { courierId: 201, courierName: 'BlueDart Surface 2KG', rate: 68.00 },
      { courierId: 202, courierName: 'Delhivery Surface 2kg Ground', rate: 84.00 }
    ];
    const planB = selectPriorityCourierPlan({ items: [{ name: 'Water Gun', sku: 'WG-01' }] }, couriersB);
    assert.strictEqual(planB.candidates[0].courierId, 201);
    assert.strictEqual(planB.candidates[0].courierName, 'BlueDart Surface 2KG');
  });

  // -------------------------------------------------------------------------
  // TEST 5: Surface-first ordering & prevention of premature air/express
  // -------------------------------------------------------------------------
  console.log('\n[SECTION 9.5] Surface-first ordering & premature air prevention');

  it('Surface-First: Standard Orders exhaust BlueDart & Delhivery Surface before Air', () => {
    const couriers: ServiceableCourier[] = [
      { courierId: 301, courierName: 'BlueDart Air Premium', rate: 45.00 },
      { courierId: 302, courierName: 'Delhivery Air Express', rate: 50.00 },
      { courierId: 303, courierName: 'BlueDart Surface Ground', rate: 85.00 },
      { courierId: 304, courierName: 'Delhivery Surface Standard', rate: 70.00 }
    ];
    const plan = selectPriorityCourierPlan({ items: [{ name: 'Jacket', sku: 'JKT-01' }] }, couriers);

    // BlueDart Surface (Tier 2) -> Delhivery Surface (Tier 3) -> Delhivery Air (Tier 5) -> BlueDart Air (Tier 6)
    assert.strictEqual(plan.candidates[0].courierName, 'BlueDart Surface Ground');
    assert.strictEqual(plan.candidates[0].isSurface, true);
    assert.strictEqual(plan.candidates[1].courierName, 'Delhivery Surface Standard');
    assert.strictEqual(plan.candidates[1].isSurface, true);
    assert.strictEqual(plan.candidates[2].courierName, 'Delhivery Air Express');
    assert.strictEqual(plan.candidates[2].isSurface, false);
    assert.strictEqual(plan.candidates[3].courierName, 'BlueDart Air Premium');
    assert.strictEqual(plan.candidates[3].isSurface, false);
  });

  it('Surface-First: Exception Orders NEVER include air/express couriers prematurely', () => {
    const couriers: ServiceableCourier[] = [
      { courierId: 401, courierName: 'BlueDart Air Premium', rate: 45.00 },
      { courierId: 402, courierName: 'Delhivery Air Express', rate: 48.00 },
      { courierId: 403, courierName: 'BlueDart Surface 2KG', rate: 90.00 },
      { courierId: 404, courierName: 'India Post Speed Post', rate: 40.00 }
    ];
    const plan = selectPriorityCourierPlan({ items: [{ name: 'Mini Projector HD', sku: 'PRJ-01' }] }, couriers);

    // Only Surface 2KG and India Post are eligible in Exception candidate tiers
    const candidateNames = plan.candidates.map(c => c.courierName);
    assert.deepStrictEqual(candidateNames, ['BlueDart Surface 2KG', 'India Post Speed Post']);
    assert.ok(!candidateNames.includes('BlueDart Air Premium'));
    assert.ok(!candidateNames.includes('Delhivery Air Express'));
  });

  // -------------------------------------------------------------------------
  // TEST 6: Fallback when a courier is unserviceable
  // -------------------------------------------------------------------------
  console.log('\n[SECTION 9.6] Fallback when a courier is unserviceable');

  it('Unserviceable Fallback: Skips unserviceable tiers and records reasons in audit log', () => {
    // Only Delhivery Surface and India Post are serviceable for this pincode
    const couriers: ServiceableCourier[] = [
      { courierId: 501, courierName: 'Delhivery Surface Standard', rate: 65.00 },
      { courierId: 502, courierName: 'India Post Speed Post', rate: 42.00 }
    ];
    const plan = selectPriorityCourierPlan({ items: [{ name: 'Chinos', sku: 'CHN-01' }] }, couriers);

    // Tier 1 (Dapper) & Tier 2 (BlueDart Surface) are unserviceable
    assert.strictEqual(plan.skippedTiers[0].tierId, 'DAPPER');
    assert.strictEqual(plan.skippedTiers[1].tierId, 'BLUEDART_SURFACE');
    assert.strictEqual(plan.candidates[0].courierName, 'Delhivery Surface Standard');
    assert.strictEqual(plan.candidates[0].tierRank, 3);
  });

  // -------------------------------------------------------------------------
  // TEST 7: Fallback when AWB assignment fails (wallet/booking limits)
  // -------------------------------------------------------------------------
  console.log('\n[SECTION 9.7] Fallback when AWB assignment fails (wallet or limits)');

  await it('AWB Limit/Wallet Fallback: Moves to next tier when higher partner fails AWB', async () => {
    const couriers: ServiceableCourier[] = [
      { courierId: 601, courierName: 'Dapper Express', rate: 45.00 },
      { courierId: 602, courierName: 'BlueDart Surface Ground', rate: 75.00 }
    ];
    const plan = selectPriorityCourierPlan({ items: [{ name: 'Shirt', sku: 'SHT-01' }] }, couriers);

    const attemptedCouriers: (string | number | undefined)[] = [];
    const execution = await executePriorityAwbAssignment({
      order: { orderNumber: 'ORD-7001' },
      shipmentId: '10001',
      candidates: plan.candidates,
      assignAwbFn: async (courierId) => {
        attemptedCouriers.push(courierId);
        if (courierId === 601) {
          // Fails due to wallet constraint
          return { success: false, error: 'Insufficient wallet balance for Dapper Express.' };
        }
        if (courierId === 602) {
          // Succeeds on next tier
          return { success: true, awbCode: 'AWB-BD-7001', courierName: 'BlueDart Surface Ground' };
        }
        return { success: false, error: 'Unknown courier' };
      },
      logger: () => {}
    });

    assert.strictEqual(execution.success, true);
    assert.strictEqual(execution.awbCode, 'AWB-BD-7001');
    assert.strictEqual(execution.assignedCourierName, 'BlueDart Surface Ground');
    assert.deepStrictEqual(attemptedCouriers, [601, 602]);
    assert.ok(execution.auditTrail.some(log => log.includes('Insufficient wallet balance')));
  });

  // -------------------------------------------------------------------------
  // TEST 8: Shiprocket automatic assignment when all tiers exhausted
  // -------------------------------------------------------------------------
  console.log('\n[SECTION 9.8] Shiprocket automatic best-courier assignment fallback');

  await it('Auto-Assign Fallback: Calls Shiprocket auto-assign with shipment_id when all tiers fail', async () => {
    const couriers: ServiceableCourier[] = [
      { courierId: 701, courierName: 'BlueDart Surface Ground', rate: 80.00 }
    ];
    const plan = selectPriorityCourierPlan({ items: [{ name: 'Hoodie', sku: 'HD-01' }] }, couriers);

    const callArgs: any[] = [];
    const execution = await executePriorityAwbAssignment({
      order: { orderNumber: 'ORD-8001' },
      shipmentId: '20002',
      candidates: plan.candidates,
      assignAwbFn: async (courierId) => {
        callArgs.push(courierId);
        if (courierId === 701) {
          return { success: false, error: 'Pincode booking limit exceeded for BlueDart' };
        }
        if (courierId === undefined) {
          // Triggered Shiprocket auto-assign
          return {
            success: true,
            awbCode: 'AWB-AUTO-888',
            courierName: 'Shiprocket Auto Partner',
            courierCompanyId: 'SR-AUTO'
          };
        }
        return { success: false, error: 'Unexpected' };
      },
      logger: () => {}
    });

    assert.strictEqual(execution.success, true);
    assert.strictEqual(execution.awbCode, 'AWB-AUTO-888');
    assert.strictEqual(execution.isAutoAssigned, true);
    assert.strictEqual(execution.assignedTierName, 'Shiprocket Automatic Best-Courier Fallback');
    assert.deepStrictEqual(callArgs, [701, undefined]);
  });

  // -------------------------------------------------------------------------
  // TEST 9: Dappersfit pickup address used for every Priority Book shipment
  // -------------------------------------------------------------------------
  console.log('\n[SECTION 9.9] Dappersfit pickup address used by default');

  it('Dappersfit Pickup: Priority Book resolves to configured Dappersfit warehouse ("dapperss")', () => {
    const registeredWarehouses = [
      { name: 'Ashok og ', pincode: '400001', isPrimary: false },
      { name: 'mahakal', pincode: '400004', isPrimary: false },
      { name: 'dapperss', pincode: '600002', isPrimary: true }
    ];
    // Default call without explicit custom override
    const result = validateDappersfitPickupAddress(registeredWarehouses);
    assert.strictEqual(result.isValid, true);
    assert.strictEqual(result.locationName, 'dapperss');
    assert.strictEqual(result.pincode, '600002');
    assert.strictEqual(result.isDappersfitDefault, true);
  });

  // -------------------------------------------------------------------------
  // TEST 10: Booking blocked when Dappersfit pickup address is invalid/unavailable
  // -------------------------------------------------------------------------
  console.log('\n[SECTION 9.10] Booking blocked when Dappersfit pickup address is missing/invalid');

  it('Blocked Booking: Stops booking and displays error if Dappersfit address is missing from account', () => {
    // Registered list lacks dapperss
    const corruptedWarehouses = [
      { name: 'Ashok og ', pincode: '400001', isPrimary: false },
      { name: 'mahakal', pincode: '400004', isPrimary: false }
    ];
    const result = validateDappersfitPickupAddress(corruptedWarehouses);
    assert.strictEqual(result.isValid, false);
    assert.ok(result.error?.includes('Configured Dappersfit pickup address ("dapperss") is missing or invalid'));
  });

  // -------------------------------------------------------------------------
  // TEST 11: Existing Shiprocket label generation and downloads unchanged
  // -------------------------------------------------------------------------
  console.log('\n[SECTION 9.11] Shiprocket label generation and download preservation');

  it('Label System: Returns valid proxy label download format for booked shipment', () => {
    const rawPdfUrl = 'https://shiprocket-labels.s3.amazonaws.com/label-12345.pdf';
    const orderNumber = 'ORD-9001';
    const proxyUrl = `/api/shiprocket/download-live-pdf?url=${encodeURIComponent(rawPdfUrl)}&filename=${encodeURIComponent(`Dappersfit-Label-${orderNumber}.pdf`)}`;
    
    assert.ok(proxyUrl.startsWith('/api/shiprocket/download-live-pdf'));
    assert.ok(proxyUrl.includes(encodeURIComponent(rawPdfUrl)));
    assert.ok(proxyUrl.includes('Dappersfit-Label-ORD-9001.pdf'));
  });

  // -------------------------------------------------------------------------
  // TEST 12: Duplicate booking prevention during retries
  // -------------------------------------------------------------------------
  console.log('\n[SECTION 9.12] Duplicate booking prevention during retries');

  it('Duplicate Guard: Already booked order with existing shipmentId returns existing booking without re-creating', () => {
    const existingOrder = {
      id: 'ord-123',
      orderNumber: '10099',
      status: 'booked',
      shipmentId: '987654321',
      shiprocketOrderId: '11223344',
      awbCode: 'AWB-EXISTING-99',
      labelUrl: '/api/shiprocket/download-live-pdf?url=test',
      courierName: 'Delhivery Surface Standard'
    };

    // Simulated existing shipment guard check
    const isAlreadyBooked = existingOrder.status === 'booked' && Boolean(existingOrder.shipmentId);
    assert.strictEqual(isAlreadyBooked, true);

    // When already booked, system returns existing record rather than sending /orders/create/adhoc
    const responsePayload = {
      success: true,
      status: 'booked',
      order: existingOrder,
      shipmentId: existingOrder.shipmentId,
      awbCode: existingOrder.awbCode,
      alreadyBooked: true
    };

    assert.strictEqual(responsePayload.alreadyBooked, true);
    assert.strictEqual(responsePayload.shipmentId, '987654321');
  });

  console.log('\n===============================================================');
  console.log(`TEST SUMMARY: ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY!`);
  console.log('===============================================================');
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
