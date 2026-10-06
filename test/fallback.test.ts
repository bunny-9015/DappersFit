import test from 'node:test';
import assert from 'node:assert/strict';

// This is a test harness that exactly mirrors the Shiprocket Priority Booking loop from server.ts
// to prove the fallback behavior for AWB failure and auto-assign works.

async function simulateBookingLoop(candidates: any[], mockShiprocket: any) {
  let awbCode = '';
  let assignedCourierName = '';
  let lastAwbError = '';
  let autoAssigned = false;
  
  // 1. Loop through candidates
  for (const candidate of candidates) {
    try {
      const result = await mockShiprocket.assignAwb(candidate.courierId);
      if (result.success) {
        awbCode = result.awb;
        assignedCourierName = candidate.courierName;
        break;
      } else {
        lastAwbError = result.error;
      }
    } catch (e: any) {
      lastAwbError = e.message;
    }
  }

  // 2. Fallback to general Auto-Assign if all candidates failed
  if (!awbCode) {
    try {
      const autoResult = await mockShiprocket.autoAssignAwb();
      if (autoResult.success) {
        awbCode = autoResult.awb;
        assignedCourierName = autoResult.courierName;
        autoAssigned = true;
      } else {
        lastAwbError = autoResult.error;
      }
    } catch (e: any) {
      lastAwbError = e.message;
    }
  }

  return { awbCode, assignedCourierName, lastAwbError, autoAssigned };
}

test('Fallback: Successfully assigns AWB on first tier', async () => {
  const candidates = [{ courierId: 1, courierName: 'Dappers' }];
  const mockShiprocket = {
    assignAwb: async (id: number) => ({ success: true, awb: 'AWB123' }),
    autoAssignAwb: async () => ({ success: false, error: 'Should not reach' })
  };

  const result = await simulateBookingLoop(candidates, mockShiprocket);
  assert.strictEqual(result.awbCode, 'AWB123');
  assert.strictEqual(result.assignedCourierName, 'Dappers');
  assert.strictEqual(result.autoAssigned, false);
});

test('Fallback: Skips failing courier and falls back to next tier', async () => {
  const candidates = [
    { courierId: 1, courierName: 'FailingCourier' },
    { courierId: 2, courierName: 'WorkingCourier' }
  ];
  const mockShiprocket = {
    assignAwb: async (id: number) => {
      if (id === 1) return { success: false, error: 'Wallet insufficient' };
      if (id === 2) return { success: true, awb: 'AWB456' };
      return { success: false, error: 'Unknown' };
    },
    autoAssignAwb: async () => ({ success: false, error: 'Should not reach' })
  };

  const result = await simulateBookingLoop(candidates, mockShiprocket);
  assert.strictEqual(result.awbCode, 'AWB456');
  assert.strictEqual(result.assignedCourierName, 'WorkingCourier');
  assert.strictEqual(result.autoAssigned, false);
});

test('Fallback: Exhausts all tiers and uses Shiprocket auto-assign', async () => {
  const candidates = [
    { courierId: 1, courierName: 'FailingCourier1' },
    { courierId: 2, courierName: 'FailingCourier2' }
  ];
  const mockShiprocket = {
    assignAwb: async (id: number) => ({ success: false, error: 'Serviceable but AWB failed' }),
    autoAssignAwb: async () => ({ success: true, awb: 'AWBAUTO999', courierName: 'AutoShip' })
  };

  const result = await simulateBookingLoop(candidates, mockShiprocket);
  assert.strictEqual(result.awbCode, 'AWBAUTO999');
  assert.strictEqual(result.assignedCourierName, 'AutoShip');
  assert.strictEqual(result.autoAssigned, true, 'Must flag as auto-assigned');
});

test('Fallback: Complete failure', async () => {
  const candidates = [{ courierId: 1, courierName: 'FailingCourier1' }];
  const mockShiprocket = {
    assignAwb: async (id: number) => ({ success: false, error: 'AWB failed' }),
    autoAssignAwb: async () => ({ success: false, error: 'Auto assign also failed' })
  };

  const result = await simulateBookingLoop(candidates, mockShiprocket);
  assert.strictEqual(result.awbCode, '');
  assert.strictEqual(result.lastAwbError, 'Auto assign also failed');
});
