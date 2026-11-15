export interface ParsedOrderAddress {
  name: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  email: string;
}

export interface ParsedOrderItem {
  name: string;
  sku: string;
  quantity: number;
  price: number;
}

export interface ParsedOrderResult {
  customerName: string;
  address: ParsedOrderAddress;
  items: ParsedOrderItem[];
  totalAmount: number;
}

const INVALID_NAMES = new Set([
  'unknown',
  'n/a',
  'na',
  'none',
  'null',
  'walkin customer',
  'walk-in customer',
  'customer',
]);

const LABEL_PREFIX_RE =
  /^\s*(?:customer\s*name|full\s*name|recipient(?:\s*name)?|buyer(?:\s*name)?|name|shipping\s*address|delivery\s*address|address|addr|phone\s*(?:no|number)?|mobile\s*(?:no|number)?|mob|ph|contact(?:\s*no)?|whatsapp|tel|telephone|pin\s*code|pincode|pin|zip\s*code|zip|postal\s*code|city|town|district|state|province|email|e-mail|ship\s*to|to)\s*[:=\-]+\s*/i;

const INLINE_LABEL_RE =
  /\b(?:customer\s*name|full\s*name|recipient(?:\s*name)?|buyer(?:\s*name)?|name|shipping\s*address|delivery\s*address|address|addr|phone\s*(?:no|number)?|mobile\s*(?:no|number)?|mob|ph|contact(?:\s*no)?|whatsapp|tel|telephone|pin\s*code|pincode|pin|zip\s*code|zip|postal\s*code|city|town|district|state|province|email|e-mail|ship\s*to|to)\s*[:=\-]+\s*/gi;

const NON_ADDRESS_LINE_RE =
  /^\s*(?:order\s*(?:id|no|number)|item|product|qty|quantity|price|amount|total|payment(?:\s*mode|\s*method)?|cod|prepaid|weight|dimensions?)\s*[:=\-]+/i;

const ADDRESS_HINT_RE =
  /\b(?:street|st|road|rd|lane|flat|apartment|apt|door|house|h\.?\s*no|d\.?\s*no|plot|block|sector|phase|nagar|colony|layout|cross|main|near|opp|opposite|behind|beside|floor|building|bldg|village|post|taluk|mandal|dist)\b/i;

const PINCODE_REGION_MAP: Array<{ prefixes: string[]; city: string; state: string; keywords?: string[] }> = [
  { prefixes: ['56'], city: 'Bangalore', state: 'Karnataka', keywords: ['bangalore', 'bengaluru'] },
  { prefixes: ['50'], city: 'Hyderabad', state: 'Telangana', keywords: ['hyderabad', 'secunderabad'] },
  { prefixes: ['40'], city: 'Mumbai', state: 'Maharashtra', keywords: ['mumbai', 'thane', 'navi mumbai'] },
  { prefixes: ['41', '42', '43'], city: 'Pune', state: 'Maharashtra', keywords: ['pune'] },
  { prefixes: ['11'], city: 'Delhi', state: 'Delhi', keywords: ['delhi', 'new delhi'] },
  { prefixes: ['60'], city: 'Chennai', state: 'Tamil Nadu', keywords: ['chennai'] },
  { prefixes: ['70'], city: 'Kolkata', state: 'West Bengal', keywords: ['kolkata'] },
  { prefixes: ['52', '53'], city: 'Vijayawada', state: 'Andhra Pradesh', keywords: ['vijayawada', 'visakhapatnam', 'vizag'] },
  { prefixes: ['30'], city: 'Jaipur', state: 'Rajasthan', keywords: ['jaipur'] },
  { prefixes: ['38'], city: 'Ahmedabad', state: 'Gujarat', keywords: ['ahmedabad'] },
  { prefixes: ['68'], city: 'Kochi', state: 'Kerala', keywords: ['kochi', 'ernakulam'] },
  { prefixes: ['16'], city: 'Chandigarh', state: 'Chandigarh', keywords: ['chandigarh'] },
  { prefixes: ['22'], city: 'Lucknow', state: 'Uttar Pradesh', keywords: ['lucknow'] },
];

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function stripFieldLabels(value: string): string {
  if (!value) return '';
  let out = String(value).replace(/\r/g, '').trim();
  // Repeatedly strip leading label prefixes (e.g., "Address: Name: ...")
  let prev = '';
  while (out !== prev) {
    prev = out;
    out = out.replace(LABEL_PREFIX_RE, '').trim();
  }
  // Strip any remaining inline "label:" occurrences safely at word boundaries
  out = out.replace(INLINE_LABEL_RE, '');
  return out.replace(/\s+/g, ' ').trim();
}

export function cleanPhoneDigits(raw: string): string {
  const digits = String(raw || '').replace(/\D/g, '');
  if (digits.length >= 10) {
    return digits.slice(-10);
  }
  return digits;
}

export function cleanPincodeDigits(raw: string): string {
  const match = String(raw || '').match(/\b([1-9]\d{5})\b/);
  return match ? match[1] : '';
}

function isValidCustomerName(candidate: string): boolean {
  const cleaned = candidate.trim();
  if (cleaned.length < 2 || cleaned.length > 50) return false;
  if (/\d/.test(cleaned)) return false;
  const lower = cleaned.toLowerCase();
  if (INVALID_NAMES.has(lower)) return false;
  if (/^(?:address|phone|mobile|pincode|pin|city|state|order|item|product|email)$/i.test(lower)) return false;
  if (ADDRESS_HINT_RE.test(lower)) return false;
  return true;
}

export interface CleanAddressOptions {
  customerName?: string;
  phone?: string;
  pincode?: string;
  city?: string;
  state?: string;
  email?: string;
}

/**
 * Cleans and arranges an address string:
 * - Removes field labels like "name:", "address:", "phone:", "pincode:", "city:", "state:"
 * - Removes duplicated customer name, phone, pincode, and email
 * - Deduplicates comma-separated parts and formats cleanly
 */
export function cleanAddressText(rawAddress: string, opts: CleanAddressOptions = {}): string {
  if (!rawAddress) return '';

  const lines = String(rawAddress)
    .replace(/\r/g, '')
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);

  const collectedParts: string[] = [];

  for (const line of lines) {
    // Skip lines that are clearly non-address metadata (order id, product, price, etc.)
    if (NON_ADDRESS_LINE_RE.test(line)) {
      continue;
    }

    // Check if the entire line is a pure non-address label:value (phone, pincode, email, city, state)
    if (/^\s*(?:phone\s*(?:no|number)?|mobile\s*(?:no|number)?|mob|ph|contact(?:\s*no)?|whatsapp|tel|telephone)\s*[:=\-]?\s*[\d\s+\-()]{7,}\s*$/i.test(line)) {
      continue;
    }
    if (/^\s*(?:pin\s*code|pincode|pin|zip\s*code|zip|postal\s*code)\s*[:=\-]?\s*\d{6}\s*$/i.test(line)) {
      continue;
    }
    if (/^\s*(?:email|e-mail|mail)\s*[:=\-]?\s*\S+@\S+\.\S+\s*$/i.test(line)) {
      continue;
    }
    if (/^\s*(?:city|town|district|state|province)\s*[:=\-]+\s*.+$/i.test(line)) {
      continue;
    }

    // Split line by comma so each segment can be inspected independently
    const segments = line.split(',');
    for (let seg of segments) {
      seg = seg.trim();
      if (!seg) continue;

      // Remove inline labels like "name:", "address:", "phone:", etc.
      seg = seg.replace(INLINE_LABEL_RE, '').trim();

      // Remove phone numbers
      if (opts.phone) {
        const phoneRe = new RegExp(`(?:\\+?91[\\s-]*|0)?${escapeRegExp(opts.phone)}`, 'g');
        seg = seg.replace(phoneRe, '');
      }
      seg = seg.replace(/(?:\+?91[\s-]*)?[6-9]\d{4}[\s-]?\d{5}\b/g, '');

      // Remove pincode
      if (opts.pincode) {
        const pinRe = new RegExp(`\\b${escapeRegExp(opts.pincode)}\\b`, 'g');
        seg = seg.replace(pinRe, '');
      }

      // Remove email
      if (opts.email) {
        seg = seg.replace(new RegExp(escapeRegExp(opts.email), 'gi'), '');
      }
      seg = seg.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '');

      // Remove customer name if it appears as this segment or at the start of this segment
      if (opts.customerName) {
        const nameTrimmed = opts.customerName.trim();
        if (nameTrimmed.length >= 2) {
          const exactNameRe = new RegExp(`^${escapeRegExp(nameTrimmed)}$`, 'i');
          if (exactNameRe.test(seg.trim())) {
            continue;
          }
          const leadingNameRe = new RegExp(`^${escapeRegExp(nameTrimmed)}(?:\\s*[-:,]+\\s*|\\s+)(?=\\S)`, 'i');
          if (leadingNameRe.test(seg)) {
            seg = seg.replace(leadingNameRe, '').trim();
          }
        }
      }

      // Clean leftover punctuation and whitespace
      seg = seg
        .replace(/^[\s,.\-:;]+/, '')
        .replace(/[\s,.\-:;]+$/, '')
        .replace(/\s+/g, ' ')
        .trim();

      if (!seg) continue;
      // Drop standalone country/city/state segments if they are already separated
      if (/^india$/i.test(seg)) continue;
      if (opts.city && seg.toLowerCase() === opts.city.trim().toLowerCase()) continue;
      if (opts.state && seg.toLowerCase() === opts.state.trim().toLowerCase()) continue;

      collectedParts.push(seg);
    }
  }

  // Deduplicate parts (case-insensitive) while preserving order
  const seen = new Set<string>();
  const uniqueParts: string[] = [];
  for (const part of collectedParts) {
    const key = part.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      uniqueParts.push(part);
    }
  }

  return uniqueParts.join(', ');
}

export function parseOrderLocally(text: string): ParsedOrderResult {
  const raw = String(text || '').replace(/\r/g, '').trim();
  const textClean = raw.replace(/\n/g, ' ');
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);

  // 1. Phone number (10 digits, Indian mobile)
  const phoneMatch = raw.match(/(?:\+?91[\s-]*|0)?([6-9]\d{4}[\s-]?\d{5})\b/) || raw.match(/\b([6-9]\d{9})\b/);
  const phone = phoneMatch ? cleanPhoneDigits(phoneMatch[1] || phoneMatch[0]) : '';

  // 2. Pincode (6 digits) - avoid matching inside the extracted phone number
  const textWithoutPhone = phone
    ? raw.replace(new RegExp(`(?:\\+?91[\\s-]*|0)?${escapeRegExp(phone)}`, 'g'), ' ')
    : raw;
  const pinMatch = textWithoutPhone.match(/\b([1-9]\d{5})\b/);
  const pincode = pinMatch ? pinMatch[1] : '';

  // 3. Email
  const emailMatch = raw.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const emailExtracted = emailMatch ? emailMatch[0] : '';

  // 4. Customer Name: check explicit label on any line/segment first
  let customerName = '';
  const labeledNameMatch = raw.match(
    /(?:^|[\n,;])\s*(?:customer\s*name|full\s*name|recipient(?:\s*name)?|buyer(?:\s*name)?|name|ship\s*to|to)\s*[:=\-]+\s*([^\n,;]+)/i
  );
  if (labeledNameMatch && labeledNameMatch[1]) {
    let candidate = labeledNameMatch[1]
      .replace(/(?:\+?91[\s-]*)?[6-9]\d{4}[\s-]?\d{5}\b/g, '')
      .replace(/\b[1-9]\d{5}\b/g, '')
      .trim();
    if (isValidCustomerName(candidate)) {
      customerName = candidate;
    }
  }

  // Fallback: check first line / first comma-separated segment if no explicit label matched
  if (!customerName && lines.length > 0) {
    const firstSeg = lines[0].split(',')[0].replace(LABEL_PREFIX_RE, '').trim();
    if (isValidCustomerName(firstSeg)) {
      customerName = firstSeg;
    }
  }

  // 5. City & State (explicit labels first, then keyword/pincode lookup)
  let city = '';
  let state = '';
  const cityLabelMatch = raw.match(/(?:^|[\n,;])\s*(?:city|town|district)\s*[:=\-]+\s*([^\n,;]+)/i);
  if (cityLabelMatch && cityLabelMatch[1]) {
    city = cityLabelMatch[1].trim();
  }
  const stateLabelMatch = raw.match(/(?:^|[\n,;])\s*(?:state|province)\s*[:=\-]+\s*([^\n,;]+)/i);
  if (stateLabelMatch && stateLabelMatch[1]) {
    state = stateLabelMatch[1].trim();
  }

  const lower = textClean.toLowerCase();
  if (!city || !state) {
    for (const region of PINCODE_REGION_MAP) {
      const matchesPrefix = region.prefixes.some(p => pincode.startsWith(p));
      const matchesKeyword = region.keywords?.some(k => lower.includes(k));
      if (matchesPrefix || matchesKeyword) {
        if (!city) city = region.city;
        if (!state) state = region.state;
        break;
      }
    }
  }

  // 6. Clean and arrange street address
  let address = cleanAddressText(raw, {
    customerName,
    phone,
    pincode,
    city,
    state,
    email: emailExtracted,
  });

  // If stripping city/state left the address too short, retry without stripping city/state
  if (address.length < 5) {
    address = cleanAddressText(raw, {
      customerName,
      phone,
      pincode,
      email: emailExtracted,
    });
  }

  // 7. Item parsing: look for lines with product name and price
  let items: ParsedOrderItem[] = [];
  let totalAmount = 0;

  const priceMatches = [...textClean.matchAll(/(?:rs\.?|inr|₹)?\s*(\d{3,5})\b/gi)];
  const numbers = priceMatches
    .map(m => parseInt(m[1], 10))
    .filter(n => n >= 200 && n <= 50000);

  if (numbers.length > 0) {
    const price = numbers[0];
    totalAmount = price;

    let itemName = '';
    if (lower.includes('projector')) {
      itemName = 'Smart Portable 4K LED Projector';
    } else if (lower.includes('drone') || lower.includes('camera')) {
      itemName = 'Drone 4K Action Camera Ultra HD';
    } else if (lower.includes('wash') || lower.includes('gun')) {
      itemName = 'High-Pressure Water Wash Gun Pro';
    } else if (lower.includes('console') || lower.includes('game')) {
      itemName = 'Handheld Gaming Console 4K OLED';
    } else if (lower.includes('rc') || lower.includes('car')) {
      itemName = 'High-Speed 4WD RC Car Offroad';
    }

    if (itemName !== '') {
      items = [
        {
          name: itemName,
          sku: itemName.toUpperCase().replace(/\s+/g, '-').slice(0, 10),
          quantity: 1,
          price,
        },
      ];
    }
  }

  return {
    customerName,
    address: {
      name: customerName,
      phone,
      address,
      city,
      state,
      pincode,
      email: emailExtracted || (customerName ? `${customerName.toLowerCase().replace(/\s+/g, '')}@gmail.com` : ''),
    },
    items,
    totalAmount,
  };
}

/**
 * Post-processes any parsed order (including LLM responses) to ensure no labels
 * like "name:" or "address:" leak into customerName or address.address.
 */
export function sanitizeParsedOrder(parsedOrder: any): ParsedOrderResult {
  const customerName = stripFieldLabels(parsedOrder?.customerName || parsedOrder?.address?.name || '');
  const phone = cleanPhoneDigits(parsedOrder?.address?.phone || '');
  const pincode = cleanPincodeDigits(parsedOrder?.address?.pincode || '');
  const city = stripFieldLabels(parsedOrder?.address?.city || '');
  const state = stripFieldLabels(parsedOrder?.address?.state || '');
  const email = String(parsedOrder?.address?.email || '').trim();

  let cleanedAddress = cleanAddressText(parsedOrder?.address?.address || '', {
    customerName,
    phone,
    pincode,
    city,
    state,
    email,
  });

  if (cleanedAddress.length < 5 && parsedOrder?.address?.address) {
    cleanedAddress = cleanAddressText(parsedOrder.address.address, {
      customerName,
      phone,
      pincode,
      email,
    });
  }

  return {
    customerName,
    address: {
      name: customerName,
      phone,
      address: cleanedAddress,
      city,
      state,
      pincode,
      email,
    },
    items: Array.isArray(parsedOrder?.items) ? parsedOrder.items : [],
    totalAmount: Number(parsedOrder?.totalAmount) || 0,
  };
}
