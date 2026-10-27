/**
 * Priority Courier Routing and Automated Selection Module
 * 
 * Strict Priority Rules:
 * 1. Order Type Detection:
 *    - Exception Order if any item name, SKU, or tag contains "WG", "Water Gun", "RC", or "Projector",
 *      or has the SKU/tag "wg", "rc", or "pro".
 *    - "rc" and "pro" are matched as whole-word tokens or exact SKU/tag values ONLY, NEVER as substrings.
 *      ("Product" and "Arc" must not trigger).
 *    - Case-insensitive matching throughout.
 *    - Otherwise, Standard Order.
 * 
 * 2. Strict Priority Tiers (Surface / Ground first):
 *    A. Standard Orders:
 *       1. dapper (in-house channel)
 *       2. BlueDart Surface / Ground
 *       3. Delhivery Surface Standard / Ground
 *       4. India Post (Speed Post / Business Post)
 *       5. Delhivery Air / Express
 *       6. BlueDart Air / Express
 * 
 *    B. Exception Orders:
 *       1. dapper (in-house channel)
 *       2. BlueDart Surface 2KG and Delhivery Surface 2KG (Treated as ONE tier, pick cheaper)
 *       3. India Post (Speed Post / Business Post)
 *       - Air/express couriers must NEVER be attempted before every surface tier has been tried.
 * 
 * 3. Selection & Fallback:
 *    - At each tier, check serviceability for delivery pincode.
 *    - If several serviceable couriers match the same tier, sort by lowest rate (cheapest first).
 *    - Attempt AWB with highest-priority partner. If unserviceable or AWB fails, fall to next tier.
 *    - If all tiers exhausted, fall back to Shiprocket automatic best-courier assignment.
 */

export type OrderType = 'Standard' | 'Exception';

export interface ServiceableCourier {
  courierId: number | string;
  courierName: string;
  rate: number;
  eta?: string;
  rating?: number;
  cod?: boolean;
  minWeight?: number;
  [key: string]: any;
}

export interface PriorityCourierCandidate extends ServiceableCourier {
  tierId: string;
  tierName: string;
  tierRank: number;
  orderType: OrderType;
  isSurface: boolean;
}

export interface CourierTierConfig {
  tierId: string;
  tierName: string;
  isSurface: boolean;
  matches: (courier: ServiceableCourier) => boolean;
}

export interface SkippedTierLog {
  tierRank: number;
  tierId: string;
  tierName: string;
  reason: string;
}

export interface PrioritySelectionResult {
  orderType: OrderType;
  candidates: PriorityCourierCandidate[];
  skippedTiers: SkippedTierLog[];
  auditLogs: string[];
}

export interface AwbAssignmentResult {
  success: boolean;
  awbCode?: string;
  courierName?: string;
  courierCompanyId?: any;
  error?: string;
}

// ---------------------------------------------------------------------------
// 1. ORDER TYPE DETECTION
// ---------------------------------------------------------------------------

function extractTags(rawTags: any): string[] {
  if (!rawTags) return [];
  if (Array.isArray(rawTags)) {
    return rawTags.map(t => String(t).trim()).filter(Boolean);
  }
  if (typeof rawTags === 'string') {
    return rawTags.split(',').map(t => t.trim()).filter(Boolean);
  }
  return [];
}

/**
 * Checks if a string token or field matches the exception rules:
 * - "wg", "rc", "pro" as exact SKU or tag
 * - "rc" and "pro" as whole-word tokens only (\b(rc|pro)\b) - never substring ("Product" & "Arc" must not trigger)
 * - "Water Gun" or "Projector" as phrase / substring (case-insensitive)
 * - "WG" as token or SKU
 */
export function isExceptionFieldOrToken(fieldVal: string, isExactCheck: boolean = false): boolean {
  if (!fieldVal || typeof fieldVal !== 'string') return false;
  const clean = fieldVal.trim();
  const lower = clean.toLowerCase();

  // Exact SKU/tag values: "wg", "rc", "pro"
  if (lower === 'wg' || lower === 'rc' || lower === 'pro') {
    return true;
  }

  if (isExactCheck) {
    return false;
  }

  // Check for whole-word "rc" or "pro"
  // \b ensures "Arc", "Product", "Process", "Torch", etc. NEVER match
  if (/\b(rc|pro)\b/i.test(clean)) {
    return true;
  }

  // Check for "water gun", "projector", or "wg" (whole-word or identifier)
  if (lower.includes('water gun') || lower.includes('projector')) {
    return true;
  }

  if (/\bwg\b/i.test(clean) || /\bwg[-_0-9]/i.test(clean) || /[-_0-9]wg\b/i.test(clean)) {
    return true;
  }

  return false;
}

/**
 * Detects whether an order is an Exception Order or Standard Order.
 * Rules:
 * - Exception if any item name, SKU, or tag contains "WG", "Water Gun", "RC", or "Projector",
 *   or has the SKU/tag "wg", "rc", or "pro".
 * - "rc" and "pro" must match as whole-word tokens or exact SKU/tag values only, never substrings.
 * - Matching is case-insensitive.
 */
export function isExceptionOrder(orderOrItems: any): boolean {
  if (!orderOrItems) return false;

  let items: any[] = [];
  if (Array.isArray(orderOrItems)) {
    items = orderOrItems;
  } else if (orderOrItems && Array.isArray(orderOrItems.items)) {
    items = orderOrItems.items;
  } else if (orderOrItems && orderOrItems.items && typeof orderOrItems.items === 'object') {
    items = Object.values(orderOrItems.items);
  } else if (orderOrItems && (orderOrItems.name || orderOrItems.sku || orderOrItems.tags)) {
    items = [orderOrItems];
  }

  // Also check top-level order tags if present
  if (orderOrItems && orderOrItems.tags) {
    const orderTags = extractTags(orderOrItems.tags);
    for (const tag of orderTags) {
      if (isExceptionFieldOrToken(tag, true) || isExceptionFieldOrToken(tag, false)) {
        return true;
      }
    }
  }

  return items.some(item => {
    if (!item) return false;
    const name = String(item.name || '').trim();
    const sku = String(item.sku || '').trim();
    const tags = extractTags(item.tags);

    // 1. Exact SKU/tag matches
    if (isExceptionFieldOrToken(sku, true)) return true;
    for (const tag of tags) {
      if (isExceptionFieldOrToken(tag, true)) return true;
    }

    // 2. Token and phrase matches
    if (isExceptionFieldOrToken(name, false)) return true;
    if (isExceptionFieldOrToken(sku, false)) return true;
    for (const tag of tags) {
      if (isExceptionFieldOrToken(tag, false)) return true;
    }

    return false;
  });
}

export function detectOrderType(orderOrItems: any): OrderType {
  return isExceptionOrder(orderOrItems) ? 'Exception' : 'Standard';
}

// ---------------------------------------------------------------------------
// 2. TIER MATCHERS
// ---------------------------------------------------------------------------

function normalizeCourierName(courier: ServiceableCourier): string {
  return String(courier.courierName || courier.courier_name || '').toLowerCase();
}

export function matchesDapper(courier: ServiceableCourier): boolean {
  const name = normalizeCourierName(courier);
  return name.includes('dapper');
}

export function matchesBlueDartSurface(courier: ServiceableCourier): boolean {
  const name = normalizeCourierName(courier);
  const isBlueDart = name.includes('blue') && name.includes('dart');
  const isSurface = name.includes('surface') || name.includes('ground');
  const is2kg = /(2kg|2\s*kg)/i.test(name);
  return isBlueDart && isSurface && !is2kg;
}

export function matchesDelhiverySurface(courier: ServiceableCourier): boolean {
  const name = normalizeCourierName(courier);
  const isDelhivery = name.includes('delhivery') || name.includes('delievry') || name.includes('dwliverey') || name.includes('delivery');
  const isSurface = name.includes('surface') || name.includes('ground');
  const is2kg = /(2kg|2\s*kg)/i.test(name);
  return isDelhivery && isSurface && !is2kg;
}

export function matchesIndiaPost(courier: ServiceableCourier): boolean {
  const name = normalizeCourierName(courier);
  return name.includes('india post') || name.includes('indiapost') || name.includes('speed post') || name.includes('business post');
}

export function matchesDelhiveryAir(courier: ServiceableCourier): boolean {
  const name = normalizeCourierName(courier);
  const isDelhivery = name.includes('delhivery') || name.includes('delievry') || name.includes('dwliverey') || name.includes('delivery');
  const isAir = name.includes('air') || name.includes('express') || name.includes('premium');
  return isDelhivery && isAir;
}

export function matchesBlueDartAir(courier: ServiceableCourier): boolean {
  const name = normalizeCourierName(courier);
  const isBlueDart = name.includes('bluedart') || (name.includes('blue') && name.includes('dart'));
  const isAir = name.includes('air') || name.includes('express') || name.includes('premium');
  return isBlueDart && isAir;
}

/**
 * Exception Tier 2: BlueDart Surface 2KG and Delhivery Surface 2KG, treated as ONE tier
 * (pick the cheaper of the two).
 */
export function matchesSurface2KG(courier: ServiceableCourier): boolean {
  const name = normalizeCourierName(courier);
  const has2kg = /(2kg|2\s*kg)/i.test(name);
  const isSurface = name.includes('surface') || name.includes('ground');

  const isBlueDart2KG = (name.includes('blue') && name.includes('dart')) && isSurface && has2kg;
  const isDelhivery2KG = (name.includes('delhivery') || name.includes('delievry') || name.includes('delivery')) && isSurface && has2kg;

  return isBlueDart2KG || isDelhivery2KG;
}

// ---------------------------------------------------------------------------
// 3. CONFIG-DRIVEN PRIORITY TIER LISTS
// ---------------------------------------------------------------------------

/**
 * Standard Order Tiers (strict order, surface first):
 * 1. dapper (in-house channel)
 * 2. BlueDart Surface / Ground
 * 3. Delhivery Surface Standard / Ground
 * 4. India Post (Speed Post / Business Post)
 * 5. Delhivery Air / Express
 * 6. BlueDart Air / Express
 */
export const STANDARD_ORDER_TIERS: CourierTierConfig[] = [
  {
    tierId: 'DAPPER',
    tierName: 'dapper (in-house channel)',
    isSurface: true,
    matches: matchesDapper
  },
  {
    tierId: 'BLUEDART_SURFACE',
    tierName: 'BlueDart Surface / Ground',
    isSurface: true,
    matches: matchesBlueDartSurface
  },
  {
    tierId: 'DELHIVERY_SURFACE',
    tierName: 'Delhivery Surface Standard / Ground',
    isSurface: true,
    matches: matchesDelhiverySurface
  },
  {
    tierId: 'INDIA_POST',
    tierName: 'India Post (Speed Post / Business Post)',
    isSurface: true,
    matches: matchesIndiaPost
  },
  {
    tierId: 'DELHIVERY_AIR',
    tierName: 'Delhivery Air / Express',
    isSurface: false,
    matches: matchesDelhiveryAir
  },
  {
    tierId: 'BLUEDART_AIR',
    tierName: 'BlueDart Air / Express',
    isSurface: false,
    matches: matchesBlueDartAir
  }
];

/**
 * Exception Order Tiers (strict order, surface first):
 * 1. dapper (in-house channel)
 * 2. BlueDart Surface 2KG and Delhivery Surface 2KG (Treated as ONE tier, cheaper first)
 * 3. India Post (Speed Post / Business Post)
 * 
 * Air/express couriers must never be attempted before every surface tier above them has been tried.
 */
export const EXCEPTION_ORDER_TIERS: CourierTierConfig[] = [
  {
    tierId: 'DAPPER',
    tierName: 'dapper (in-house channel)',
    isSurface: true,
    matches: matchesDapper
  },
  {
    tierId: 'SURFACE_2KG_EXCEPTION',
    tierName: 'BlueDart Surface 2KG and Delhivery Surface 2KG (Single Tier - Lowest Rate First)',
    isSurface: true,
    matches: matchesSurface2KG
  },
  {
    tierId: 'INDIA_POST',
    tierName: 'India Post (Speed Post / Business Post)',
    isSurface: true,
    matches: matchesIndiaPost
  }
];

// ---------------------------------------------------------------------------
// 4. SELECTION AND RANKING ENGINE
// ---------------------------------------------------------------------------

/**
 * Evaluates serviceable couriers against the config-driven priority tiers for the order type.
 * - At each tier, finds matching serviceable couriers.
 * - If multiple couriers match a single tier, sorts by lowest rate (cheapest first).
 * - Tracks skipped tiers and audit logs.
 */
export function selectPriorityCourierPlan(
  order: any, 
  serviceableCouriersList: ServiceableCourier[]
): PrioritySelectionResult {
  const orderType: OrderType = detectOrderType(order);
  const tierConfig = orderType === 'Exception' ? EXCEPTION_ORDER_TIERS : STANDARD_ORDER_TIERS;
  
  const candidates: PriorityCourierCandidate[] = [];
  const skippedTiers: SkippedTierLog[] = [];
  const auditLogs: string[] = [];
  const seenCourierIds = new Set<string>();

  auditLogs.push(`[Priority Selection] Order evaluated as: ${orderType} Order (Total Serviceable Couriers: ${serviceableCouriersList?.length || 0})`);

  for (let rank = 0; rank < tierConfig.length; rank++) {
    const tier = tierConfig[rank];
    const rankNum = rank + 1;

    const matched = (serviceableCouriersList || []).filter(c => tier.matches(c));

    if (matched.length > 0) {
      // Sort within the tier by lowest rate (cheapest first)
      const sortedInTier = [...matched].sort((a, b) => Number(a.rate || 0) - Number(b.rate || 0));

      const addedForTier: string[] = [];
      for (const courier of sortedInTier) {
        const idKey = String(courier.courierId);
        if (!seenCourierIds.has(idKey)) {
          seenCourierIds.add(idKey);
          candidates.push({
            ...courier,
            tierId: tier.tierId,
            tierName: tier.tierName,
            tierRank: rankNum,
            orderType,
            isSurface: tier.isSurface
          });
          addedForTier.push(`${courier.courierName} (₹${courier.rate})`);
        }
      }

      if (addedForTier.length > 0) {
        auditLogs.push(
          `[Priority Selection] Tier ${rankNum} (${tier.tierName}): Matched ${addedForTier.length} courier(s): [${addedForTier.join(', ')}]. Cheapest chosen first.`
        );
      }
    } else {
      const skipReason = `No serviceable courier matching "${tier.tierName}" for delivery pincode.`;
      skippedTiers.push({
        tierRank: rankNum,
        tierId: tier.tierId,
        tierName: tier.tierName,
        reason: skipReason
      });
      auditLogs.push(`[Priority Selection] Tier ${rankNum} (${tier.tierName}) skipped: ${skipReason}`);
    }
  }

  // Fallback for Exception orders: ensure surface-first before any air/express option
  if (orderType === 'Exception') {
    const remainingSurface = (serviceableCouriersList || []).filter(c => {
      const idKey = String(c.courierId);
      if (seenCourierIds.has(idKey)) return false;
      const name = normalizeCourierName(c);
      return name.includes('surface') || name.includes('ground');
    }).sort((a, b) => Number(a.rate || 0) - Number(b.rate || 0));

    for (const c of remainingSurface) {
      seenCourierIds.add(String(c.courierId));
      candidates.push({
        ...c,
        tierId: 'REMAINING_SURFACE_FALLBACK',
        tierName: 'Other Surface/Ground Couriers (Exhaust Surface Before Air)',
        tierRank: 50,
        orderType,
        isSurface: true
      });
    }

    const remainingAir = (serviceableCouriersList || []).filter(c => {
      const idKey = String(c.courierId);
      return !seenCourierIds.has(idKey);
    }).sort((a, b) => Number(a.rate || 0) - Number(b.rate || 0));

    for (const c of remainingAir) {
      seenCourierIds.add(String(c.courierId));
      candidates.push({
        ...c,
        tierId: 'REMAINING_AIR_FALLBACK',
        tierName: 'Air/Express Couriers (Attempted strictly after surface)',
        tierRank: 60,
        orderType,
        isSurface: false
      });
    }
  }

  // Fallback for Standard orders if no tier matched
  if (candidates.length === 0 && serviceableCouriersList && serviceableCouriersList.length > 0) {
    auditLogs.push(`[Priority Selection] Predefined tiers produced 0 matches. Adding ${serviceableCouriersList.length} serviceable couriers sorted by lowest rate.`);
    const sortedAll = [...serviceableCouriersList].sort((a, b) => Number(a.rate || 0) - Number(b.rate || 0));
    for (let i = 0; i < sortedAll.length; i++) {
      const c = sortedAll[i];
      const isSurface = normalizeCourierName(c).includes('surface') || normalizeCourierName(c).includes('ground');
      candidates.push({
        ...c,
        tierId: 'SERVICEABLE_RATE_FALLBACK',
        tierName: 'Serviceable Rate Fallback',
        tierRank: 90 + i,
        orderType,
        isSurface
      });
    }
  }

  return {
    orderType,
    candidates,
    skippedTiers,
    auditLogs
  };
}

/**
 * Backward-compatible helper for server.ts / existing endpoints
 */
export function selectCourierCandidates(
  orderToBook: any, 
  serviceableCouriersList: ServiceableCourier[]
): PriorityCourierCandidate[] {
  return selectPriorityCourierPlan(orderToBook, serviceableCouriersList).candidates;
}

// ---------------------------------------------------------------------------
// 5. AWB ASSIGNMENT & FALLBACK EXECUTOR
// ---------------------------------------------------------------------------

export interface ExecutePriorityBookingParams {
  order: any;
  shipmentId: string | number;
  candidates: PriorityCourierCandidate[];
  skippedTiers?: SkippedTierLog[];
  assignAwbFn: (courierId?: number | string) => Promise<AwbAssignmentResult>;
  logger?: (msg: string) => void;
}

export interface PriorityBookingExecutionResult {
  success: boolean;
  awbCode?: string;
  assignedCourierName?: string;
  assignedCourierId?: any;
  assignedTierName?: string;
  assignedTierRank?: number;
  orderType: OrderType;
  isAutoAssigned: boolean;
  rate?: number;
  skippedTiers: SkippedTierLog[];
  auditTrail: string[];
  lastError?: string;
}

/**
 * Executes priority courier booking by attempting AWB assignment across the prioritized candidates.
 * - Tries candidates in strict sequence.
 * - If a courier fails (e.g. limit constraints or wallet balance), logs and moves to next tier.
 * - If all candidates fail, falls back to Shiprocket's automatic best-courier assignment.
 */
export async function executePriorityAwbAssignment(
  params: ExecutePriorityBookingParams
): Promise<PriorityBookingExecutionResult> {
  const { order, shipmentId, candidates, skippedTiers = [], assignAwbFn, logger = console.log } = params;
  const orderNumber = order?.orderNumber || order?.id || 'Unknown';
  const orderType: OrderType = detectOrderType(order);
  const auditTrail: string[] = [];

  let assignedAwb = '';
  let assignedCourierName = '';
  let assignedCourierId: any = null;
  let assignedTierName = '';
  let assignedTierRank = 0;
  let bookedRate = 0;
  let isAutoAssigned = false;
  let lastError = '';

  logger(`[Priority Booking Execution] Starting AWB assignment for Order ${orderNumber} (Type: ${orderType}, Candidates: ${candidates.length}).`);

  // 1. Try each prioritized candidate in order
  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];
    logger(`[Priority Booking Execution] Order ${orderNumber}: Attempting Tier ${candidate.tierRank} "${candidate.tierName}" with courier ${candidate.courierName} (ID: ${candidate.courierId}, Rate: ₹${candidate.rate})...`);

    try {
      const awbRes = await assignAwbFn(candidate.courierId);

      if (awbRes.success && awbRes.awbCode) {
        assignedAwb = awbRes.awbCode;
        assignedCourierName = awbRes.courierName || candidate.courierName;
        assignedCourierId = candidate.courierId;
        assignedTierName = candidate.tierName;
        assignedTierRank = candidate.tierRank;
        bookedRate = candidate.rate;

        const successMsg = `[Priority Booking Success] Order ${orderNumber}: Successfully assigned ${assignedCourierName} (AWB: ${assignedAwb}) from Tier ${candidate.tierRank}: "${candidate.tierName}" (Rate: ₹${bookedRate}, Order Type: ${orderType}).`;
        logger(successMsg);
        auditTrail.push(successMsg);
        break; // Successfully booked!
      } else {
        lastError = awbRes.error || 'Empty AWB code returned.';
        const failMsg = `[Priority Booking Fallback] Order ${orderNumber}: Tier ${candidate.tierRank} "${candidate.tierName}" (Courier ${candidate.courierName} / ${candidate.courierId}) failed AWB: "${lastError}". Falling to next priority candidate.`;
        logger(failMsg);
        auditTrail.push(failMsg);
      }
    } catch (err: any) {
      lastError = err.message || String(err);
      const failMsg = `[Priority Booking Fallback] Order ${orderNumber}: Tier ${candidate.tierRank} "${candidate.tierName}" (Courier ${candidate.courierName}) threw error: "${lastError}". Falling to next priority candidate.`;
      logger(failMsg);
      auditTrail.push(failMsg);
    }
  }

  // 2. Fall back to Shiprocket Automatic Best-Courier Assignment if all tiers failed
  if (!assignedAwb) {
    const autoLog = `[Priority Booking Fallback] Order ${orderNumber}: All prioritized tiers exhausted. Triggering Shiprocket Automatic Best-Courier assignment...`;
    logger(autoLog);
    auditTrail.push(autoLog);

    try {
      const autoRes = await assignAwbFn(undefined); // undefined courierId triggers Shiprocket auto-assign

      if (autoRes.success && autoRes.awbCode) {
        assignedAwb = autoRes.awbCode;
        assignedCourierName = autoRes.courierName || 'Shiprocket Auto-Assigned Partner';
        assignedCourierId = autoRes.courierCompanyId || 'AUTO';
        assignedTierName = 'Shiprocket Automatic Best-Courier Fallback';
        assignedTierRank = 999;
        isAutoAssigned = true;

        const autoSuccess = `[Priority Booking Success] Order ${orderNumber}: Exhausted priority tiers. Successfully assigned via Shiprocket Auto-Assign: ${assignedCourierName} (AWB: ${assignedAwb}).`;
        logger(autoSuccess);
        auditTrail.push(autoSuccess);
      } else {
        lastError = autoRes.error || 'Automatic best-courier assignment returned empty AWB.';
        const autoFail = `[Priority Booking Failure] Order ${orderNumber}: Shiprocket Auto-Assign also failed: "${lastError}".`;
        logger(autoFail);
        auditTrail.push(autoFail);
      }
    } catch (autoErr: any) {
      lastError = autoErr.message || String(autoErr);
      const autoFail = `[Priority Booking Failure] Order ${orderNumber}: Shiprocket Auto-Assign threw error: "${lastError}".`;
      logger(autoFail);
      auditTrail.push(autoFail);
    }
  }

  if (assignedAwb) {
    return {
      success: true,
      awbCode: assignedAwb,
      assignedCourierName,
      assignedCourierId,
      assignedTierName,
      assignedTierRank,
      orderType,
      isAutoAssigned,
      rate: bookedRate,
      skippedTiers,
      auditTrail
    };
  } else {
    return {
      success: false,
      lastError,
      orderType,
      isAutoAssigned: false,
      skippedTiers,
      auditTrail
    };
  }
}
