import test from 'node:test';
import assert from 'node:assert/strict';
import { isExceptionOrder, selectCourierCandidates } from '../src/utils/courierSelector.js';

test('Exception Detection: Whole-word matches', () => {
  assert.strictEqual(isExceptionOrder([{ name: 'Water Gun Large', sku: 'SKU1' }]), true, 'Matches Water Gun in name');
  assert.strictEqual(isExceptionOrder([{ name: 'Standard Item', sku: 'wg-01' }]), true, 'Matches wg in SKU');
  assert.strictEqual(isExceptionOrder([{ name: 'RC Car', sku: 'SKU1' }]), true, 'Matches RC in name');
  assert.strictEqual(isExceptionOrder([{ name: 'Movie Projector', sku: 'SKU1' }]), true, 'Matches Projector in name');
});

test('Exception Detection: False Positives', () => {
  // Should NOT trigger Exception for substrings
  assert.strictEqual(isExceptionOrder([{ name: 'Amazing Product', sku: 'SKU1' }]), false, 'Should not match "pro" substring in Product');
  assert.strictEqual(isExceptionOrder([{ name: 'Arc Reactor', sku: 'SKU1' }]), false, 'Should not match "rc" substring in Arc');
  assert.strictEqual(isExceptionOrder([{ name: 'New Growth', sku: 'SKU1' }]), false, 'Should not match "wg" substring in Growth');
});

test('Exception Detection: Tags', () => {
  assert.strictEqual(isExceptionOrder([{ tags: ['pro'] }]), true, 'Matches exact tag pro');
  assert.strictEqual(isExceptionOrder([{ tags: ['rc'] }]), true, 'Matches exact tag rc');
  assert.strictEqual(isExceptionOrder([{ tags: ['product'] }]), false, 'Does not match product tag');
});

const mockCouriers = [
  { courierId: 1, courierName: 'Dappers', rate: 45.00 },
  { courierId: 2, courierName: 'BlueDart Surface 2KG', rate: 85.00 },
  { courierId: 3, courierName: 'Delhivery Surface 2kg', rate: 75.00 },
  { courierId: 4, courierName: 'Delhivery Surface', rate: 65.00 },
  { courierId: 5, courierName: 'BlueDart Air', rate: 145.00 },
  { courierId: 6, courierName: 'India Post Speed Post', rate: 40.00 }
];

test('Priority Tiers: Cheapest-in-tier selection for Exception Order', () => {
  const exceptionOrder = { items: [{ name: 'RC Car' }] };
  const candidates = selectCourierCandidates(exceptionOrder, mockCouriers);
  
  // Exception Tier sequence:
  // 1. Dappers
  // 2. SURFACE_2KG_EXCEPTION (Delhivery Surface 2kg @ 75, BlueDart Surface 2kg @ 85)
  // 3. INDIA_POST
  
  assert.strictEqual(candidates.length, 4, 'Should return 4 valid candidates');
  assert.strictEqual(candidates[0].courierName, 'Dappers', 'Dappers is tier 1');
  
  // Checking tier 2 sorting (cheapest first)
  assert.strictEqual(candidates[1].courierName, 'Delhivery Surface 2kg', 'Delhivery is cheaper than BlueDart for 2kg');
  assert.strictEqual(candidates[2].courierName, 'BlueDart Surface 2KG', 'BlueDart is next');
  
  assert.strictEqual(candidates[3].courierName, 'India Post Speed Post', 'India Post is tier 3');
});

test('Priority Tiers: Standard Order', () => {
  const standardOrder = { items: [{ name: 'Regular Item' }] };
  const candidates = selectCourierCandidates(standardOrder, mockCouriers);
  
  // Standard Tier sequence:
  // 1. Dappers
  // 2. BlueDart Surface (should NOT match 2KG variant)
  // 3. Delhivery Surface (matches rate 65)
  // 4. India Post
  // 5. Delhivery Air
  // 6. BlueDart Air
  
  // mockCouriers doesn't have a standard BlueDart Surface, so it will skip tier 2.
  assert.strictEqual(candidates[0].courierName, 'Dappers');
  assert.strictEqual(candidates[1].courierName, 'Delhivery Surface', 'Tier 3 Delhivery Surface');
  assert.strictEqual(candidates[2].courierName, 'India Post Speed Post', 'Tier 4 India Post');
  assert.strictEqual(candidates[3].courierName, 'BlueDart Air', 'Tier 6 BlueDart Air');
});
