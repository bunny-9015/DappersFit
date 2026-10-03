/**
 * Configuration for Priority Courier Routing
 * 
 * Order types determine which priority array to use.
 * Couriers are matched based on these tier names in the logic below.
 */

export const COURIER_PRIORITY_STANDARD = [
  'DAPPERS',
  'BLUEDART_SURFACE',
  'DELIVERY_SURFACE',
  'INDIA_POST',
  'DELIVERY_AIR',
  'BLUEDART_AIR'
];

export const COURIER_PRIORITY_EXCEPTION = [
  'DAPPERS',
  'SURFACE_2KG_EXCEPTION',
  'INDIA_POST'
];

/**
 * Checks if an order qualifies for the Exception priority logic
 */
export function isExceptionOrder(items: any[]): boolean {
  if (!items || !Array.isArray(items)) return false;

  return items.some((item) => {
    const name = (item.name || '').toLowerCase();
    const sku = (item.sku || '').toLowerCase();
    const tags = Array.isArray(item.tags) ? item.tags.map(t => String(t).toLowerCase()) : [];

    // Exact matches for tags/SKU
    const exactMatch = ['wg', 'rc', 'pro'].includes(sku) || tags.some(t => ['wg', 'rc', 'pro'].includes(t));
    if (exactMatch) return true;

    // Whole word matching in name, sku, tags
    const regex = /\b(wg|rc|pro|water gun|projector)\b/i;
    if (regex.test(name) || regex.test(sku) || tags.some(t => regex.test(t))) return true;

    return false;
  });
}

/**
 * Returns true if a courier object from Shiprocket matches the specific tier criteria.
 */
export function matchesCourierCondition(courier: any, condition: string): boolean {
  const name = (courier.courierName || courier.courier_name || '').toLowerCase();
  
  switch (condition) {
    case 'DAPPERS':
      return name.includes('dappers');
    
    case 'BLUEDART_SURFACE':
      return name.includes('blue') && name.includes('dart') && (name.includes('surface') || name.includes('ground')) && !/(2kg|2 kg|2 kgs|2kgs)/.test(name);
    
    case 'DELIVERY_SURFACE':
      return (name.includes('delhivery') || name.includes('delievry') || name.includes('delivery')) && (name.includes('surface') || name.includes('ground')) && !/(2kg|2 kg|2 kgs|2kgs)/.test(name);
    
    case 'INDIA_POST':
      return name.includes('india post') || name.includes('speed post') || name.includes('business post');
    
    case 'DELIVERY_AIR':
      return (name.includes('delhivery') || name.includes('delievry') || name.includes('delivery')) && (name.includes('air') || name.includes('express'));
    
    case 'BLUEDART_AIR':
      return name.includes('blue') && name.includes('dart') && (name.includes('air') || name.includes('express'));
    
    case 'SURFACE_2KG_EXCEPTION':
      // BlueDart Surface 2KG AND Delhivery Surface 2KG
      const has2kg = /(2kg|2 kg|2 kgs|2kgs)/.test(name);
      const isDelhiverySurface = (name.includes('delhivery') || name.includes('delievry') || name.includes('delivery')) && (name.includes('surface') || name.includes('ground')) && has2kg;
      const isBlueDartSurface = name.includes('blue') && name.includes('dart') && (name.includes('surface') || name.includes('ground')) && has2kg;
      return isDelhiverySurface || isBlueDartSurface;
    
    default:
      return false;
  }
}

/**
 * Selects and sorts serviceable priority couriers based on the order type's tiers.
 * Filters out duplicates and keeps the cheapest option when multiple couriers match a tier.
 */
export function selectCourierCandidates(orderToBook: any, serviceableCouriersList: any[]) {
  const isException = isExceptionOrder(orderToBook.items || []);
  const conditionSequence = isException ? COURIER_PRIORITY_EXCEPTION : COURIER_PRIORITY_STANDARD;
  
  let priorityCourierCandidates: any[] = [];
  
  for (let i = 0; i < conditionSequence.length; i++) {
    const condition = conditionSequence[i];
    const matched = serviceableCouriersList.filter(c => matchesCourierCondition(c, condition));
    
    if (matched.length > 0) {
      // Sort by rate to pick cheapest in the tier first
      matched.sort((a, b) => (a.rate || 0) - (b.rate || 0));
      
      matched.forEach(c => {
        priorityCourierCandidates.push({
          ...c,
          tierName: condition,
          tierRank: i + 1,
          orderType: isException ? 'Exception' : 'Standard'
        });
      });
    } else {
      console.log(`[Courier Selection] Skipped tier ${condition} for ${isException ? 'Exception' : 'Standard'} order because no serviceable couriers matched.`);
    }
  }

  // Filter duplicates while preserving the order of insertion (prioritizing the highest tier)
  priorityCourierCandidates = priorityCourierCandidates.filter((c, index, self) => 
    index === self.findIndex((t) => t.courierId === c.courierId)
  );

  return priorityCourierCandidates;
}
