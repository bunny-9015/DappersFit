import assert from 'assert';
import {
  detectOrderType,
  isExceptionOrder,
  selectPriorityCourierPlan,
  executePriorityAwbAssignment,
  STANDARD_ORDER_TIERS,
  EXCEPTION_ORDER_TIERS,
  ServiceableCourier
} from '../src/utils/priorityCourierModule';

console.log('===============================================================');
console.log('RUNNING UNIT TESTS FOR SHIPROCKET PRIORITY COURIER MODULE');
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
  console.log('[TEST GROUP 1] Order Type & Exception Detection (Rule 1)');

  it('Standard Order: "Product" does NOT trigger exception (substring of pro)', () => {
    const order = { items: [{ name: 'Casual Cotton Product', sku: 'SKU-001' }] };
    assert.strictEqual(detectOrderType(order), 'Standard');
    assert.strictEqual(isExceptionOrder(order), false);
  });

  it('Standard Order: "Arc" does NOT trigger exception (substring of rc)', () => {
    const order = { items: [{ name: 'Arc Reactor Graphic T-Shirt', sku: 'SKU-ARC-01' }] };
    assert.strictEqual(detectOrderType(order), 'Standard');
    assert.strictEqual(isExceptionOrder(order), false);
  });

  it('Standard Order: "Production" and "Torch" do NOT trigger exception', () => {
    const order = {
      items: [
        { name: 'Production Grade Hoodie', sku: 'PRD-01', tags: ['apparel', 'fashion'] },
        { name: 'Pocket Torch Flashlight', sku: 'TORCH-01', tags: ['lights'] }
      ]
    };
    assert.strictEqual(detectOrderType(order), 'Standard');
  });

  it('Exception Order: "Water Gun" in item name triggers Exception', () => {
    const order = { items: [{ name: 'Super Electric Water Gun 3000', sku: 'SKU-100' }] };
    assert.strictEqual(detectOrderType(order), 'Exception');
  });

  it('Exception Order: "Projector" in item name triggers Exception (case-insensitive)', () => {
    const order = { items: [{ name: 'Mini LED PROJECTOR 4K', sku: 'SKU-PRJ' }] };
    assert.strictEqual(detectOrderType(order), 'Exception');
  });

  it('Exception Order: Whole-word "rc" triggers Exception', () => {
    const order = { items: [{ name: 'Speed RC Car Monster Truck', sku: 'SKU-CAR-01' }] };
    assert.strictEqual(detectOrderType(order), 'Exception');
  });

  it('Exception Order: Whole-word "pro" triggers Exception', () => {
    const order = { items: [{ name: 'Smart Watch Pro Edition', sku: 'WATCH-PRO-01' }] };
    assert.strictEqual(detectOrderType(order), 'Exception');
  });

  it('Exception Order: Exact SKU "wg", "rc", "pro" trigger Exception', () => {
    assert.strictEqual(detectOrderType({ items: [{ name: 'Toy Item', sku: 'wg' }] }), 'Exception');
    assert.strictEqual(detectOrderType({ items: [{ name: 'Toy Item', sku: 'rc' }] }), 'Exception');
    assert.strictEqual(detectOrderType({ items: [{ name: 'Toy Item', sku: 'pro' }] }), 'Exception');
    assert.strictEqual(detectOrderType({ items: [{ name: 'Toy Item', sku: 'WG-99' }] }), 'Exception');
  });

  it('Exception Order: Tag with "wg", "rc", "pro", "Water Gun" triggers Exception', () => {
    const orderWithRcTag = { items: [{ name: 'Off-Road Vehicle', sku: 'CAR-01', tags: ['rc', 'outdoor'] }] };
    assert.strictEqual(detectOrderType(orderWithRcTag), 'Exception');

    const orderWithProTag = { items: [{ name: 'Drone Gimbal', sku: 'DRN-01', tags: ['pro'] }] };
    assert.strictEqual(detectOrderType(orderWithProTag), 'Exception');
  });

  console.log('\n[TEST GROUP 2] Strict Priority Tiers & Cheapest-in-Tier Selection (Rules 2 & 3)');

  it('Standard Orders: Strict Surface-First ordering (BlueDart Surface before Air)', () => {
    const couriers: ServiceableCourier[] = [
      { courierId: 101, courierName: 'BlueDart Air Express', rate: 45.00 },
      { courierId: 102, courierName: 'BlueDart Surface Ground', rate: 80.00 },
      { courierId: 103, courierName: 'Delhivery Surface Standard', rate: 70.00 }
    ];
    const standardOrder = { items: [{ name: 'Men Linen Shirt', sku: 'SHIRT-01' }] };
    const plan = selectPriorityCourierPlan(standardOrder, couriers);

    assert.strictEqual(plan.orderType, 'Standard');
    // BlueDart Surface (Tier 2) must come before Delhivery Surface (Tier 3), which must come before BlueDart Air (Tier 6)
    assert.strictEqual(plan.candidates[0].courierName, 'BlueDart Surface Ground');
    assert.strictEqual(plan.candidates[0].tierRank, 2);
    assert.strictEqual(plan.candidates[1].courierName, 'Delhivery Surface Standard');
    assert.strictEqual(plan.candidates[1].tierRank, 3);
    assert.strictEqual(plan.candidates[2].courierName, 'BlueDart Air Express');
    assert.strictEqual(plan.candidates[2].tierRank, 6);
  });

  it('Cheapest-in-tier selection: Multiple couriers matching same tier are sorted cheapest first', () => {
    const couriers: ServiceableCourier[] = [
      { courierId: 201, courierName: 'Delhivery Surface Premium', rate: 75.00 },
      { courierId: 202, courierName: 'Delhivery Surface Economy', rate: 55.00 },
      { courierId: 203, courierName: 'Delhivery Surface Standard Ground', rate: 65.00 }
    ];
    const standardOrder = { items: [{ name: 'Cotton Trousers', sku: 'TRS-01' }] };
    const plan = selectPriorityCourierPlan(standardOrder, couriers);

    assert.strictEqual(plan.candidates.length, 3);
    // Cheapest option in Delhivery Surface tier (55) must be first
    assert.strictEqual(plan.candidates[0].rate, 55.00);
    assert.strictEqual(plan.candidates[0].courierId, 202);
    assert.strictEqual(plan.candidates[1].rate, 65.00);
    assert.strictEqual(plan.candidates[2].rate, 75.00);
  });

  it('Exception Orders: BlueDart Surface 2KG and Delhivery Surface 2KG treated as ONE tier (Cheaper First)', () => {
    const couriersA: ServiceableCourier[] = [
      { courierId: 301, courierName: 'BlueDart Surface 2KG', rate: 95.00 },
      { courierId: 302, courierName: 'Delhivery Surface 2kg Ground', rate: 75.00 }
    ];
    const exceptionOrder = { items: [{ name: 'Electric Water Gun Pro', sku: 'WG-PRO' }] };
    
    // Case A: Delhivery is cheaper (75 < 95) -> Delhivery first
    const planA = selectPriorityCourierPlan(exceptionOrder, couriersA);
    assert.strictEqual(planA.orderType, 'Exception');
    assert.strictEqual(planA.candidates[0].courierId, 302);
    assert.strictEqual(planA.candidates[0].courierName, 'Delhivery Surface 2kg Ground');
    assert.strictEqual(planA.candidates[1].courierId, 301);
    assert.strictEqual(planA.candidates[1].courierName, 'BlueDart Surface 2KG');

    // Case B: BlueDart is cheaper (65 < 80) -> BlueDart first
    const couriersB: ServiceableCourier[] = [
      { courierId: 301, courierName: 'BlueDart Surface 2KG', rate: 65.00 },
      { courierId: 302, courierName: 'Delhivery Surface 2kg Ground', rate: 80.00 }
    ];
    const planB = selectPriorityCourierPlan(exceptionOrder, couriersB);
    assert.strictEqual(planB.candidates[0].courierId, 301);
    assert.strictEqual(planB.candidates[0].courierName, 'BlueDart Surface 2KG');
    assert.strictEqual(planB.candidates[1].courierId, 302);
  });

  it('Skipped tiers logging: Records exactly which tiers were skipped and why', () => {
    const couriers: ServiceableCourier[] = [
      { courierId: 401, courierName: 'India Post Speed Post', rate: 42.00 }
    ];
    const standardOrder = { items: [{ name: 'Silk Scarf', sku: 'SCF-01' }] };
    const plan = selectPriorityCourierPlan(standardOrder, couriers);

    assert.strictEqual(plan.candidates[0].courierName, 'India Post Speed Post');
    assert.strictEqual(plan.skippedTiers.length, 5); // Tiers 1, 2, 3, 5, 6 were skipped
    assert.strictEqual(plan.skippedTiers[0].tierId, 'DAPPER');
    assert.strictEqual(plan.skippedTiers[1].tierId, 'BLUEDART_SURFACE');
    assert.strictEqual(plan.skippedTiers[2].tierId, 'DELHIVERY_SURFACE');
  });

  console.log('\n[TEST GROUP 3] Fallback on AWB Assignment Failure (Rule 3)');

  await it('AWB Assignment: Falls to next tier when higher-priority partner fails', async () => {
    const couriers: ServiceableCourier[] = [
      { courierId: 501, courierName: 'Dapper Express Hub', rate: 40.00 },
      { courierId: 502, courierName: 'BlueDart Surface Standard', rate: 70.00 }
    ];
    const order = { orderNumber: '1001', items: [{ name: 'Classic Polo', sku: 'POLO-01' }] };
    const plan = selectPriorityCourierPlan(order, couriers);

    const callLog: (number | string | undefined)[] = [];
    const execution = await executePriorityAwbAssignment({
      order,
      shipmentId: '12345',
      candidates: plan.candidates,
      assignAwbFn: async (courierId) => {
        callLog.push(courierId);
        if (courierId === 501) {
          // Tier 1 fails (e.g. limit or wallet)
          return { success: false, error: 'Partner courier wallet limit reached' };
        }
        if (courierId === 502) {
          // Tier 2 succeeds
          return { success: true, awbCode: 'AWB-BD-502', courierName: 'BlueDart Surface Standard' };
        }
        return { success: false, error: 'Unknown courier' };
      },
      logger: () => {}
    });

    assert.strictEqual(execution.success, true);
    assert.strictEqual(execution.awbCode, 'AWB-BD-502');
    assert.strictEqual(execution.assignedCourierName, 'BlueDart Surface Standard');
    assert.strictEqual(execution.isAutoAssigned, false);
    // Verifies candidate 501 was tried first, then candidate 502
    assert.deepStrictEqual(callLog, [501, 502]);
    assert.ok(execution.auditTrail.some(log => log.includes('failed AWB')));
  });

  console.log('\n[TEST GROUP 4] Shiprocket Automatic Best-Courier Fallback (Rule 3 & 4)');

  await it('Auto-Assign Fallback: All tiers exhausted -> Falls back to Shiprocket Auto-Assign', async () => {
    const couriers: ServiceableCourier[] = [
      { courierId: 601, courierName: 'BlueDart Surface Standard', rate: 85.00 },
      { courierId: 602, courierName: 'Delhivery Surface Ground', rate: 65.00 }
    ];
    const order = { orderNumber: '2002', items: [{ name: 'Denim Jacket', sku: 'JCK-01' }] };
    const plan = selectPriorityCourierPlan(order, couriers);

    const callLog: (number | string | undefined)[] = [];
    const execution = await executePriorityAwbAssignment({
      order,
      shipmentId: '67890',
      candidates: plan.candidates,
      assignAwbFn: async (courierId) => {
        callLog.push(courierId);
        if (courierId === 601 || courierId === 602) {
          // Both specific couriers fail AWB assignment
          return { success: false, error: 'Pincode serviceable capacity exceeded' };
        }
        if (courierId === undefined) {
          // Shiprocket general auto-assign succeeds
          return { 
            success: true, 
            awbCode: 'AWB-AUTO-999', 
            courierName: 'Shiprocket Auto Courier', 
            courierCompanyId: 'AUTO' 
          };
        }
        return { success: false, error: 'Unexpected call' };
      },
      logger: () => {}
    });

    assert.strictEqual(execution.success, true);
    assert.strictEqual(execution.awbCode, 'AWB-AUTO-999');
    assert.strictEqual(execution.isAutoAssigned, true);
    assert.strictEqual(execution.assignedTierName, 'Shiprocket Automatic Best-Courier Fallback');
    // Verifies 601, 602 were tried first, followed by undefined (auto-assign)
    assert.deepStrictEqual(callLog, [601, 602, undefined]);
  });

  await it('Auto-Assign Failure: When auto-assign also fails, returns clean failure with audit log', async () => {
    const couriers: ServiceableCourier[] = [
      { courierId: 701, courierName: 'India Post Speed Post', rate: 45.00 }
    ];
    const order = { orderNumber: '3003', items: [{ name: 'Wallet', sku: 'WLT-01' }] };
    const plan = selectPriorityCourierPlan(order, couriers);

    const execution = await executePriorityAwbAssignment({
      order,
      shipmentId: '99999',
      candidates: plan.candidates,
      assignAwbFn: async (courierId) => {
        return { success: false, error: 'Total account balance negative' };
      },
      logger: () => {}
    });

    assert.strictEqual(execution.success, false);
    assert.strictEqual(execution.isAutoAssigned, false);
    assert.ok(execution.lastError?.includes('Total account balance negative'));
    assert.ok(execution.auditTrail.length >= 2);
  });

  console.log('\n===============================================================');
  console.log(`TEST SUMMARY: ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY!`);
  console.log('===============================================================');
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
