/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SalaryCycle, EmployeePayrollSummary, PayoutTransaction, Order } from '../types';

export const ONE_DAY_MS = 24 * 60 * 60 * 1000;
export const CYCLE_DURATION_DAYS = 30;
export const CYCLE_DURATION_MS = CYCLE_DURATION_DAYS * ONE_DAY_MS;

/**
 * Format a Date object to readable Indian localized format: e.g. "16 Jul 2026"
 */
export function formatCycleDate(date: Date): string {
  if (!date || isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

/**
 * Parses a YYYY-MM-DD or ISO date string into a local midnight Date.
 */
export function parseDateAtMidnight(dateStr: string): Date {
  if (!dateStr) return new Date();
  const clean = String(dateStr).trim().slice(0, 10);
  const parts = clean.split('-').map(Number);
  if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    return new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0);
  }
  const fallback = new Date(dateStr);
  return isNaN(fallback.getTime()) ? new Date() : fallback;
}

/**
 * 30-Day Salary Cycle Engine
 * Calculates exact recurring 30-day windows starting from employee joining_date.
 */
export function calculateSalaryCycles(
  joiningDateStr: string,
  payoutRate: number = 5000,
  asOfDate: Date = new Date()
): {
  currentCycle: SalaryCycle;
  cycleHistory: SalaryCycle[];
  totalCyclesElapsed: number;
  accumulatedBaseSalary: number;
} {
  const joiningDate = parseDateAtMidnight(joiningDateStr);
  const joiningTime = joiningDate.getTime();
  const currentTime = asOfDate.getTime();

  // If joining date is in the future, initialize to Cycle 1
  if (currentTime < joiningTime) {
    const start = new Date(joiningTime);
    const end = new Date(joiningTime + CYCLE_DURATION_MS);
    const initialCycle: SalaryCycle = {
      cycleNumber: 1,
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
      startDateFormatted: formatCycleDate(start),
      endDateFormatted: formatCycleDate(end),
      daysElapsed: 0,
      daysRemaining: 30,
      isCurrent: true,
      isCompleted: false,
      isSettlementDue: false,
      earnedSalary: 0
    };
    return {
      currentCycle: initialCycle,
      cycleHistory: [initialCycle],
      totalCyclesElapsed: 0,
      accumulatedBaseSalary: 0
    };
  }

  const diffMs = currentTime - joiningTime;
  const cycleIndex = Math.floor(diffMs / CYCLE_DURATION_MS); // 0-indexed completed cycles
  const totalCyclesElapsed = cycleIndex;

  const cycleHistory: SalaryCycle[] = [];
  let accumulatedBaseSalary = 0;

  // Generate all recurring 30-day cycle windows from joining date
  for (let i = 0; i <= cycleIndex; i++) {
    const cycleStartMs = joiningTime + (i * CYCLE_DURATION_MS);
    const cycleEndMs = joiningTime + ((i + 1) * CYCLE_DURATION_MS);
    const isCurrent = i === cycleIndex;
    const isCompleted = !isCurrent || currentTime >= cycleEndMs;

    const startDate = new Date(cycleStartMs);
    const endDate = new Date(cycleEndMs);

    let daysElapsed = 30;
    let daysRemaining = 0;

    if (isCurrent) {
      const elapsedMs = currentTime - cycleStartMs;
      daysElapsed = Math.min(30, Math.max(0, Math.floor(elapsedMs / ONE_DAY_MS)));
      daysRemaining = Math.max(0, 30 - daysElapsed);
    }

    // Is settlement due?
    // If a cycle is completed (elapsed 30 days) or current cycle reached 30 days
    const isSettlementDue = isCompleted && daysRemaining === 0;

    // Prorated or full salary for this cycle
    const earnedSalary = isCompleted
      ? payoutRate
      : Math.round((daysElapsed / 30) * payoutRate);

    accumulatedBaseSalary += earnedSalary;

    const cycle: SalaryCycle = {
      cycleNumber: i + 1,
      startDate: startDate.toISOString().slice(0, 10),
      endDate: endDate.toISOString().slice(0, 10),
      startDateFormatted: formatCycleDate(startDate),
      endDateFormatted: formatCycleDate(endDate),
      daysElapsed,
      daysRemaining,
      isCurrent,
      isCompleted,
      isSettlementDue,
      earnedSalary
    };

    cycleHistory.push(cycle);
  }

  const currentCycle = cycleHistory[cycleHistory.length - 1];

  return {
    currentCycle,
    cycleHistory,
    totalCyclesElapsed,
    accumulatedBaseSalary
  };
}

/**
 * Real-Time Live Incentive Calculation for an order:
 * - Product immediately attached: +50 INR
 * - Without immediate product / pending item: +30 INR
 */
export function calculateOrderIncentive(order: Partial<Order>): {
  amount: number;
  hasImmediateProduct: boolean;
  type: 'immediate_product' | 'pending_item';
  reason: string;
} {
  const items = Array.isArray(order.items) ? order.items : [];
  const hasItems = items.length > 0;
  
  // Check if items has a legitimate product (not placeholder or pending)
  const hasValidProduct = hasItems && items.some(item => {
    if (!item) return false;
    const name = String(item.name || '').trim().toLowerCase();
    return name !== '' && 
      name !== 'pending' && 
      name !== 'pending item' && 
      name !== 'tbd' && 
      name !== 'unassigned' &&
      name !== 'unknown';
  });

  // Explicit flag or auto-detected immediate product attachment
  const hasImmediateProduct = Boolean(order.productAdvance || hasValidProduct);
  const amount = hasImmediateProduct ? 50 : 30;

  return {
    amount,
    hasImmediateProduct,
    type: hasImmediateProduct ? 'immediate_product' : 'pending_item',
    reason: hasImmediateProduct
      ? 'Order created with product immediately attached (+50 INR)'
      : 'Order created without immediate product / pending item (+30 INR)'
  };
}

/**
 * Aggregates all financial data, cycle state, and due balance for an employee.
 */
export function computeEmployeePayrollSummary(
  emp: any,
  orders: any[],
  payoutHistory: any[],
  asOfDate: Date = new Date()
): EmployeePayrollSummary {
  const joiningDateStr = emp.joining_date || emp.joiningDate || '2026-07-16';
  const payoutRate = Number(emp.payoutRate) || 5000;

  // 1. Calculate 30-Day Recurring Cycles
  const { currentCycle, cycleHistory, accumulatedBaseSalary } = calculateSalaryCycles(
    joiningDateStr,
    payoutRate,
    asOfDate
  );

  // 2. Real-Time Live Incentive Aggregation from Orders
  const empId = String(emp.id || '');
  const empEmail = String(emp.email || '').toLowerCase().trim();
  const empUsername = String(emp.username || '').toLowerCase().trim();
  const empName = String(emp.name || '').toLowerCase().trim();

  const matchedOrders = orders.filter(o => {
    if (!o) return false;
    const createdBy = String(o.createdByEmployeeId || '').toLowerCase().trim();
    const createdByName = String(o.createdByEmployeeName || '').toLowerCase().trim();
    const assignedId = String(o.assignedEmployeeId || '').toLowerCase().trim();

    const isMatch = (
      (empEmail && (createdBy === empEmail || createdBy.includes(empEmail))) ||
      (empUsername && (createdBy === empUsername || createdBy.includes(empUsername))) ||
      (empId && (createdBy === empId || assignedId === empId)) ||
      (empName && (createdByName === empName || assignedId === empName))
    );

    // Non-cancelled orders
    return isMatch && o.status !== 'cancelled';
  });

  let immediateProductCount = 0;
  let pendingItemCount = 0;
  let immediateProductAmount = 0;
  let pendingItemAmount = 0;

  matchedOrders.forEach(o => {
    // If order already recorded explicit incentiveEarned or productAdvanceIncentive
    if (o.incentiveEarned === 50 || o.productAdvanceIncentive === 50 || o.productAdvance) {
      immediateProductCount++;
      immediateProductAmount += 50;
    } else if (o.incentiveEarned === 30 || o.productAdvanceIncentive === 30) {
      pendingItemCount++;
      pendingItemAmount += 30;
    } else {
      // Evaluate dynamically
      const calc = calculateOrderIncentive(o);
      if (calc.hasImmediateProduct) {
        immediateProductCount++;
        immediateProductAmount += 50;
      } else {
        pendingItemCount++;
        pendingItemAmount += 30;
      }
    }
  });

  const accumulatedLiveIncentives = immediateProductAmount + pendingItemAmount;

  // 3. Past Payout Deductions from Ledger
  const empPayouts = payoutHistory.filter(p => {
    if (!p) return false;
    return String(p.employeeId) === empId || String(p.employeeName).toLowerCase().trim() === empName;
  });

  const totalPastPaid = empPayouts.reduce((sum, p) => {
    const val = Number(p.payoutAmount !== undefined ? p.payoutAmount : p.totalPaid) || 0;
    return sum + val;
  }, 0);

  // 4. Total Gross and Total Due Balance
  const totalGrossEarned = accumulatedBaseSalary + accumulatedLiveIncentives;
  const totalDueBalance = Math.max(0, totalGrossEarned - totalPastPaid);

  // 5. Settlement and Milestone Status
  let settlementStatus: 'Settlement Due' | 'In Progress' | 'Up to Date' = 'In Progress';
  let milestoneNotice = '';

  if (currentCycle.isSettlementDue || totalDueBalance >= payoutRate) {
    settlementStatus = 'Settlement Due';
  } else if (totalDueBalance === 0) {
    settlementStatus = 'Up to Date';
  }

  if (accumulatedLiveIncentives >= 2000) {
    milestoneNotice = `⭐ Top Performer Milestone: ₹${accumulatedLiveIncentives.toLocaleString()} in incentives`;
  } else if (accumulatedLiveIncentives >= 1000) {
    milestoneNotice = `🎯 Incentive Milestone: ₹${accumulatedLiveIncentives.toLocaleString()} achieved`;
  } else if (currentCycle.daysRemaining <= 3) {
    milestoneNotice = `⏰ Cycle #${currentCycle.cycleNumber} ending in ${currentCycle.daysRemaining} days`;
  }

  return {
    id: emp.id,
    name: emp.name,
    role: emp.role || 'Fulfillment Staff',
    email: emp.email || '',
    phone: emp.phone || '',
    status: emp.status || 'Active',
    joining_date: joiningDateStr,
    baseSalaryRate: payoutRate,
    currentCycle,
    cycleHistory,
    accumulatedBaseSalary,
    accumulatedLiveIncentives,
    totalGrossEarned,
    totalPastPaid,
    totalDueBalance,
    liveIncentivesBreakdown: {
      totalOrders: matchedOrders.length,
      immediateProductCount,
      pendingItemCount,
      immediateProductAmount,
      pendingItemAmount
    },
    settlementStatus,
    milestoneNotice
  };
}
