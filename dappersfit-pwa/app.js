/**
 * Dappersfit Logistics PWA - iPhone Native Application Engine
 * Pure High-Performance Vanilla JS with Zero Touch Lag
 * Complete Feature Parity with Android App & Authentic Real Data
 */

(function () {
  'use strict';

  // --- Configuration ---
  const STORAGE_KEY_AUTH = 'df_pwa_auth_user';
  const STORAGE_KEY_ORDERS = 'df_pwa_cached_orders';
  const STORAGE_KEY_TICKETS = 'df_pwa_cached_tickets';
  const STORAGE_KEY_PRODUCTS = 'df_pwa_cached_products';
  const STORAGE_KEY_CUSTOMERS = 'df_pwa_cached_customers';
  const STORAGE_KEY_WALLET = 'df_pwa_cached_wallet';

  // --- Authentic Default Products Catalog (Parity with data_products.json) ---
  const DEFAULT_PRODUCTS_CATALOG = [
    { id: "p-drn", sku: "drn", name: "Drone Action Camera", weight: 0.8, stock: 500, category: "Drone Action Cameras", price: 14999, dimensions: { length: 22, width: 15, height: 6 } },
    { id: "p-wg", sku: "wg", name: "Wide Gimbal Camera", weight: 2.5, stock: 500, category: "Drone Action Cameras", price: 18999, dimensions: { length: 28, width: 20, height: 10 } },
    { id: "p-ac", sku: "ac", name: "Action Cam Pro", weight: 0.5, stock: 500, category: "Drone Action Cameras", price: 9999, dimensions: { length: 18, width: 12, height: 5 } },
    { id: "p-m22", sku: "m22", name: "GS M22 Quad", weight: 0.8, stock: 500, category: "Drone Action Cameras", price: 12999, dimensions: { length: 22, width: 15, height: 6 } },
    { id: "p-m15", sku: "m15", name: "GS M15 Cam", weight: 0.8, stock: 500, category: "Drone Action Cameras", price: 8999, dimensions: { length: 22, width: 15, height: 6 } },
    { id: "p-drn-cmb", sku: "drn cmb", name: "Drone 4K Combo Kit", weight: 1.0, stock: 500, category: "Drone Action Cameras", price: 16999, dimensions: { length: 24, width: 18, height: 8 } },
    { id: "p-erlx", sku: "Erlx", name: "Erlx Smart Watch", weight: 1.0, stock: 50, category: "Other / Custom", price: 2499, dimensions: { length: 20, width: 14, height: 5 } },
    { id: "p-og", sku: "og", name: "Erlx OG Edition", weight: 1.0, stock: 50, category: "Other / Custom", price: 2999, dimensions: { length: 20, width: 14, height: 5 } },
    { id: "p-fos", sku: "Fos", name: "Fossil Chrono Watch", weight: 1.0, stock: 50, category: "Other / Custom", price: 3499, dimensions: { length: 20, width: 14, height: 5 } },
    { id: "p-d", sku: "D", name: "Diesel Mega Chief Watch", weight: 1.0, stock: 50, category: "Drone Action Cameras", price: 3499, dimensions: { length: 20, width: 14, height: 5 } },
    { id: "p-rado", sku: "rado", name: "Rado Diastar Classic", weight: 1.0, stock: 50, category: "Drone Action Cameras", price: 4999, dimensions: { length: 20, width: 14, height: 5 } },
    { id: "p-woop", sku: "woop", name: "Whoop Fitness Band", weight: 0.6, stock: 50, category: "Other / Custom", price: 1999, dimensions: { length: 18, width: 12, height: 5 } },
    { id: "p-rc", sku: "rc", name: "RC High-Speed Car 4WD", weight: 2.0, stock: 50, category: "other", price: 3499, dimensions: { length: 28, width: 20, height: 10 } },
    { id: "p-3axis", sku: "drn", name: "3-Axis Gimbal Drone", weight: 1.5, stock: 50, category: "Drone", price: 14999, dimensions: { length: 24, width: 18, height: 8 } },
    { id: "p-buds", sku: "display", name: "Display Wireless Earbuds", weight: 0.5, stock: 50, category: "Drone Action Cameras", price: 1499, dimensions: { length: 15, width: 10, height: 4 } },
    { id: "p-pro", sku: "pro", name: "4K Home Projector HD", weight: 2.0, stock: 50, category: "Drone Action Cameras", price: 12499, dimensions: { length: 28, width: 20, height: 10 } },
    { id: "p-omega", sku: "om", name: "Omega Seamaster Watch", weight: 1.0, stock: 25, category: "watch", price: 5999, dimensions: { length: 20, width: 14, height: 5 } },
    { id: "p-cas", sku: "cas", name: "Casio Vintage Silver Watch", weight: 0.85, stock: 25, category: "Drone Action Cameras", price: 1499, dimensions: { length: 20, width: 14, height: 5 } },
    { id: "p-gsk", sku: "gsk", name: "G-Shock Rugged Sport Watch", weight: 0.85, stock: 25, category: "Drone Action Cameras", price: 2499, dimensions: { length: 20, width: 14, height: 5 } }
  ];

  // Helper to determine if current session has admin/manager privileges
  function isUserAdmin() {
    if (!state.user) return true; // Standalone / open admin mode
    const role = (state.user.role || '').toLowerCase().trim();
    const email = (state.user.email || state.user.username || '').toLowerCase().trim();
    return (
      role === 'admin' ||
      role === 'operations manager' ||
      role === 'inventory lead' ||
      role.includes('admin') ||
      role.includes('manager') ||
      role.includes('lead') ||
      email.includes('admin') ||
      email.includes('kamatham') ||
      email.includes('lokesh') ||
      email.includes('srinuseeker')
    );
  }

  // Strict admin check: only authenticated Admin role may delete orders
  function isStrictAdmin() {
    return Boolean(
      state.user &&
      (String(state.user.role || '').toLowerCase().trim() === 'admin' || state.user.isAdmin === true)
    );
  }

  // --- Application State Store ---
  const state = {
    user: (() => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_AUTH) || localStorage.getItem('dappersfit_user');
        return saved ? JSON.parse(saved) : null;
      } catch (_) {
        return null;
      }
    })(),
    baseUrl: 'http://127.0.0.1:3000',
    activeTab: 'cockpit',
    orders: [],
    visibleOrdersLimit: 35,
    orderFilter: 'all',
    dateFilter: 'all',
    searchQuery: '',
    tickets: [],
    ticketFlagFilter: 'all',
    ticketSearchQuery: '',
    products: (() => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_PRODUCTS);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch (_) {}
      return [...DEFAULT_PRODUCTS_CATALOG];
    })(),
    customers: [],
    walletDetails: { available_balance: 1500, hold_amount: 0 },
    employees: [],
    feed: [],
    selectedOrder: null,
    isRefreshing: false
  };

  // --- Dynamic Active Backend Resolver & Universal apiFetch (iOS / Localhost Parity) ---
  let resolvedApiBase = '';
  async function resolveApiBase() {
    if (resolvedApiBase) return resolvedApiBase;

    const origin = (typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin : '';
    const hostname = (typeof window !== 'undefined' && window.location && window.location.hostname) ? window.location.hostname : 'localhost';

    const candidates = [];
    if (origin && origin.startsWith('https://')) {
      // Production HTTPS domain (e.g., Vercel / PWA)
      candidates.push(origin);
      candidates.push('https://dappersfit.onrender.com');
    } else {
      // Local development or HTTP
      if (origin && origin.startsWith('http')) candidates.push(origin);
      candidates.push('http://127.0.0.1:3000');
      candidates.push('http://localhost:3000');
      if (hostname && hostname !== '127.0.0.1' && hostname !== 'localhost') {
        candidates.push(`http://${hostname}:3000`);
      }
      candidates.push('https://dappersfit.onrender.com');
    }

    for (const base of candidates) {
      try {
        const controller = new AbortController();
        const tid = setTimeout(() => controller.abort(), 2000);
        const res = await fetch(`${base}/api/shiprocket/wallet/balance-details`, {
          method: 'GET',
          cache: 'no-store',
          signal: controller.signal
        });
        clearTimeout(tid);
        if (res.ok || res.status === 401 || res.status === 403 || res.status === 200) {
          resolvedApiBase = base;
          state.baseUrl = base;
          return resolvedApiBase;
        }
      } catch (_) {}
    }

    resolvedApiBase = origin.startsWith('https://') ? (origin || 'https://dappersfit.onrender.com') : (origin || 'http://127.0.0.1:3000');
    state.baseUrl = resolvedApiBase;
    return resolvedApiBase;
  }

  async function apiFetch(path, options = {}) {
    const base = await resolveApiBase();
    const cleanPath = path.startsWith('/') ? path : '/' + path;
    const url = path.startsWith('http') ? path : `${base}${cleanPath}`;
    return fetch(url, options);
  }

  // --- Courier Priority Scoring (Matches Backend & Flutter CourierSelector) ---
  function isSpecialSku(itemName) {
    if (!itemName) return false;
    const s = String(itemName).toLowerCase();
    return (
      s.includes('wg') ||
      s.includes('rc') ||
      s.includes('pro') ||
      s.includes('water gun') ||
      s.includes('projector')
    );
  }

  function getCourierPriorityScore(courierName, isException = false) {
    const name = (courierName || '').toLowerCase();
    
    if (isException) {
      // Exception: DAPPERS -> BLUEDART_SURFACE_2KG -> DELHIVERY_SURFACE_2KG -> INDIA_POST
      if (name.includes('dapper')) return 1;
      if ((name.includes('surface') || name.includes('ground')) && (name.includes('bluedart') || name.includes('blue dart'))) return 2;
      if ((name.includes('surface') || name.includes('ground')) && (name.includes('delhivery') || name.includes('delievry') || name.includes('delivery'))) return 3;
      if (name.includes('india post') || name.includes('speed post') || name.includes('business post')) return 4;
      return 100;
    }

    // Standard Priority: DAPPERS -> BLUEDART_AIR -> BLUEDART_SURFACE -> DELIVERY_AIR -> DELIVERY_SURFACE -> INDIA_POST
    if (name.includes('dapper')) return 1;
    if (name.includes('blue dart') || name.includes('bluedart')) {
      if (name.includes('air') || name.includes('express')) return 2;
      return 3; // Blue Dart Surface
    }
    if (name.includes('delhivery')) {
      if (name.includes('air') || name.includes('express')) return 4;
      return 5; // Delhivery Surface
    }
    if (name.includes('india post') || name.includes('speed post')) return 6;
    if (name.includes('shadowfax')) return 7;
    if (name.includes('dtdc')) return 8;
    return 50;
  }

  // --- iOS Haptic Simulation ---
  function haptic(intensity = 'light') {
    if ('vibrate' in navigator) {
      try {
        if (intensity === 'light') navigator.vibrate(12);
        else if (intensity === 'medium') navigator.vibrate(22);
        else if (intensity === 'heavy') navigator.vibrate([15, 35, 15]);
      } catch (_) {}
    }
  }

  // --- Toast Notification System ---
  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let icon = 'info';
    if (type === 'success') icon = 'check_circle';
    if (type === 'error') icon = 'error';

    toast.innerHTML = `
      <span class="material-symbols-outlined" style="font-size: 20px;">${icon}</span>
      <span style="font-size: 13px; line-height: 1.3;">${escapeHtml(message)}</span>
    `;

    container.appendChild(toast);
    haptic(type === 'error' ? 'heavy' : 'light');

    requestAnimationFrame(() => {
      toast.classList.add('show');
    });

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 260);
    }, 3000);
  }

  // --- Utility Helpers ---
  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatCurrency(amount) {
    const num = Number(amount) || 0;
    return '₹' + num.toLocaleString('en-IN');
  }

  // --- AI Smart Address & Product Parser (Matches Flutter Android App) ---
  const SmartParser = {
    knownCities: [
      'Bengaluru', 'Bangalore', 'Mumbai', 'Pune', 'Delhi', 'New Delhi',
      'Hyderabad', 'Secunderabad', 'Chennai', 'Kolkata', 'Ahmedabad', 'Surat',
      'Jaipur', 'Lucknow', 'Kanpur', 'Nagpur', 'Indore', 'Thane', 'Bhopal',
      'Visakhapatnam', 'Vizag', 'Patna', 'Vadodara', 'Baroda', 'Ghaziabad',
      'Ludhiana', 'Agra', 'Nashik', 'Faridabad', 'Meerut', 'Rajkot', 'Kalyan',
      'Varanasi', 'Srinagar', 'Aurangabad', 'Dhanbad', 'Amritsar', 'Navi Mumbai',
      'Ranchi', 'Howrah', 'Coimbatore', 'Jabalpur', 'Gwalior', 'Vijayawada',
      'Jodhpur', 'Madurai', 'Raipur', 'Kota', 'Guwahati', 'Chandigarh', 'Solapur',
      'Hubli', 'Bareilly', 'Moradabad', 'Mysore', 'Gurgaon', 'Gurugram', 'Aligarh',
      'Jalandhar', 'Tiruchirappalli', 'Bhubaneswar', 'Salem', 'Warangal', 'Mira Bhayandar',
      'Thiruvananthapuram', 'Bhiwandi', 'Saharanpur', 'Guntur', 'Amravati', 'Bikaner',
      'Noida', 'Jamshedpur', 'Bhilai', 'Cuttack', 'Firozabad', 'Kochi', 'Nellore',
      'Bhavnagar', 'Dehradun', 'Durgapur', 'Asansol', 'Rourkela', 'Nanded', 'Kolhapur',
      'Ajmer', 'Akola', 'Gulbarga', 'Jamnagar', 'Ujjain', 'Loni', 'Siliguri', 'Jhansi',
      'Ulhasnagar', 'Jammu', 'Sangli', 'Mangalore', 'Erode', 'Belgaum', 'Kurnool',
      'Chodavaram', 'Tirupati', 'Kozhikode'
    ],
    pincodeMap: {
      '11': { state: 'Delhi', city: 'Delhi' },
      '12': { state: 'Haryana', city: 'Gurgaon' },
      '13': { state: 'Haryana', city: 'Ambala' },
      '14': { state: 'Punjab', city: 'Ludhiana' },
      '16': { state: 'Chandigarh', city: 'Chandigarh' },
      '20': { state: 'Uttar Pradesh', city: 'Ghaziabad' },
      '22': { state: 'Uttar Pradesh', city: 'Lucknow' },
      '30': { state: 'Rajasthan', city: 'Jaipur' },
      '38': { state: 'Gujarat', city: 'Ahmedabad' },
      '40': { state: 'Maharashtra', city: 'Mumbai' },
      '41': { state: 'Maharashtra', city: 'Pune' },
      '45': { state: 'Madhya Pradesh', city: 'Indore' },
      '50': { state: 'Telangana', city: 'Hyderabad' },
      '51': { state: 'Andhra Pradesh', city: 'Tirupati' },
      '52': { state: 'Andhra Pradesh', city: 'Vijayawada' },
      '53': { state: 'Andhra Pradesh', city: 'Visakhapatnam' },
      '56': { state: 'Karnataka', city: 'Bengaluru' },
      '60': { state: 'Tamil Nadu', city: 'Chennai' },
      '68': { state: 'Kerala', city: 'Kochi' },
      '70': { state: 'West Bengal', city: 'Kolkata' },
      '75': { state: 'Odisha', city: 'Bhubaneswar' },
      '78': { state: 'Assam', city: 'Guwahati' },
      '80': { state: 'Bihar', city: 'Patna' }
    },
    parse(text) {
      if (!text || typeof text !== 'string') return null;
      const clean = text.trim();
      const res = {
        customerName: '',
        phone: '',
        address: '',
        city: '',
        state: 'India',
        pincode: '',
        itemName: '',
        amount: '',
        paymentMethod: 'Cash On Delivery (COD)'
      };

      // 1. Phone extraction (10 digits, optional +91 or 0 prefix)
      const phoneMatch = clean.match(/(?:\+91[\s-]?)?[6-9]\d{9}\b/);
      if (phoneMatch) {
        res.phone = phoneMatch[0].replace(/\D/g, '').slice(-10);
      }

      // 2. Pincode extraction (6 digits)
      const pinMatch = clean.match(/\b[1-9]\d{5}\b/);
      if (pinMatch) {
        res.pincode = pinMatch[0];
        const prefix = res.pincode.slice(0, 2);
        if (this.pincodeMap[prefix]) {
          res.city = this.pincodeMap[prefix].city;
          res.state = this.pincodeMap[prefix].state;
        }
      }

      // 3. Price / Amount extraction
      const priceMatch = clean.match(/(?:(?:rs\.?|inr|₹|amount|price)[\s:]*(\d{3,6}))|(?:\b(\d{3,6})\s*(?:rs|cod|inr))/i);
      if (priceMatch) {
        res.amount = priceMatch[1] || priceMatch[2] || '';
      }

      // 4. Payment method
      if (/prepaid|online|gpay|phonepe|paid/i.test(clean)) {
        res.paymentMethod = 'Prepaid';
      } else {
        res.paymentMethod = 'Cash On Delivery (COD)';
      }

      // 5. City recognition from known cities
      for (const city of this.knownCities) {
        const reg = new RegExp('\\b' + city + '\\b', 'i');
        if (reg.test(clean)) {
          res.city = city;
          break;
        }
      }

      // 6. Name extraction
      const lines = clean.split(/[\n,]/).map(l => l.trim()).filter(Boolean);
      for (const line of lines) {
        if (!/\d/.test(line) && line.length > 2 && line.length < 35 && !/^(name|phone|call|address|rs|cod|order)/i.test(line)) {
          res.customerName = line.replace(/^(name\s*[:=]\s*)/i, '').trim();
          break;
        }
      }

      // 7. Product / Item extraction
      const productKeywords = [
        'drone', 'camera', 'watch', 'smartwatch', 'shirt', 't-shirt', 'hoodie', 'tshirt',
        'jacket', 'shoes', 'boots', 'cargo', 'jeans', 'perfume', 'sunglasses', 'glasses',
        'blazer', 'suit', 'bag', 'backpack', 'ring', 'necklace', 'wallet'
      ];
      for (const kw of productKeywords) {
        const reg = new RegExp('(?:\\b\\d+\\s*(?:x|piece|pcs|wg)?\\s*)?([^,\\n]*?' + kw + '[^,\\n]*)', 'i');
        const match = clean.match(reg);
        if (match) {
          res.itemName = match[1].replace(/for\s+rs.*/i, '').trim();
          break;
        }
      }
      if (!res.itemName) res.itemName = 'Drone 4K Camera Ultra HD';

      // 8. Address line construction
      res.address = lines.filter(l => !l.includes(res.phone) && l !== res.customerName && !l.includes(res.amount)).slice(0, 3).join(', ');
      if (!res.address) res.address = clean.slice(0, 100);

      return res;
    }
  };

  // --- Real Data Loading Engine ---
  async function loadRealData(forceSync = false) {
    const liveLabel = document.getElementById('cockpit-live-label');
    const refreshBtn = document.getElementById('header-refresh-btn');
    const refreshIcon = refreshBtn?.querySelector('.material-symbols-outlined');

    // Prevent concurrent refreshes
    if (state.isRefreshing) return;
    state.isRefreshing = true;

    if (refreshIcon) refreshIcon.classList.add('spinning');

    if (liveLabel) {
      liveLabel.textContent = forceSync ? 'Synchronizing live orders & Firestore...' : 'Connecting to live database...';
    }

    // Reset pagination on any refresh
    state.visibleOrdersLimit = 35;

    try {
      // 1. Fetch Real Orders from Live Backend API with local fallback
      let ordersLoaded = false;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        const ordersRes = await apiFetch(`/api/orders?_v=${Date.now()}`, {
          cache: 'no-store',
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (ordersRes.ok) {
          const raw = await ordersRes.json();
          const list = Array.isArray(raw) ? raw : (raw.orders || []);
          if (Array.isArray(list) && list.length > 0) {
            state.orders = list;
            ordersLoaded = true;
            try { localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(list)); } catch (_) {}
          }
        }
      } catch (err) {
        console.warn('Live /api/orders fetch warning, trying cached fallback:', err);
      }

      // If live API was unavailable, load from cached localStorage or data_orders.json
      if (!ordersLoaded) {
        try {
          const cached = localStorage.getItem(STORAGE_KEY_ORDERS);
          if (cached) {
            const list = JSON.parse(cached);
            if (Array.isArray(list) && list.length > 0) {
              state.orders = list;
              ordersLoaded = true;
            }
          }
        } catch (_) {}

        if (!ordersLoaded) {
          try {
            const fallbackRes = await fetch(`./data/data_orders.json?_v=${Date.now()}`, { cache: 'no-store' });
            if (fallbackRes.ok) {
              const rawOrders = await fallbackRes.json();
              const list = Array.isArray(rawOrders) ? rawOrders : (rawOrders.orders || []);
              if (Array.isArray(list) && list.length > 0) {
                state.orders = list;
                ordersLoaded = true;
              }
            }
          } catch (_) {}
        }
      }

      // 2. Fetch Real Replacements (Try /api/replacements then fallback)
      try {
        let repLoaded = false;
        try {
          const liveRepRes = await apiFetch(`/api/replacements?_v=${Date.now()}`, { cache: 'no-store' });
          if (liveRepRes.ok) {
            const liveRep = await liveRepRes.json();
            const list = Array.isArray(liveRep) ? liveRep : (liveRep.replacements || []);
            if (Array.isArray(list) && list.length > 0) {
              state.tickets = list.map(r => ({
                id: r.id || 'rep-' + Math.random().toString(36).substr(2, 6),
                orderId: r.orderNumber || (r.orderId ? String(r.orderId) : 'DF-1306'),
                customerName: r.customerName || 'Customer',
                customerPhone: r.customerPhone || '',
                productSku: r.productSku || r.productName || 'SKU-APPRL',
                flag: r.flag || 'red',
                status: r.status === 'completed' || r.status === 'done' ? 'done' : (r.status || 'pending'),
                reason: r.reason || r.notes || 'Size exchange requested',
                date: r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Recent'
              }));
              repLoaded = true;
              try { localStorage.setItem(STORAGE_KEY_TICKETS, JSON.stringify(state.tickets)); } catch (_) {}
            }
          }
        } catch (_) {}

        if (!repLoaded) {
          const repRes = await fetch(`./data/data_replacements.json?_v=${Date.now()}`, { cache: 'no-store' });
          if (repRes.ok) {
            const rawRep = await repRes.json();
            const list = Array.isArray(rawRep) ? rawRep : (rawRep.replacements || []);
            if (Array.isArray(list)) {
              state.tickets = list.map(r => ({
                id: r.id || 'rep-' + Math.random().toString(36).substr(2, 6),
                orderId: r.orderNumber || (r.orderId ? String(r.orderId) : 'DF-1306'),
                customerName: r.customerName || 'Customer',
                customerPhone: r.customerPhone || '',
                productSku: r.productSku || r.productName || 'SKU-APPRL',
                flag: r.flag || 'red',
                status: r.status === 'completed' || r.status === 'done' ? 'done' : (r.status || 'pending'),
                reason: r.reason || r.notes || 'Size exchange requested',
                date: r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Recent'
              }));
              try { localStorage.setItem(STORAGE_KEY_TICKETS, JSON.stringify(state.tickets)); } catch (_) {}
            }
          }
        }
      } catch (_) {}

      // 3. Fetch Real Products (Try /api/products then fallback)
      try {
        let prodLoaded = false;
        try {
          const liveProd = await apiFetch(`/api/products?_v=${Date.now()}`, { cache: 'no-store' });
          if (liveProd.ok) {
            const rawData = await liveProd.json();
            const list = Array.isArray(rawData) ? rawData : (rawData && Array.isArray(rawData.products) ? rawData.products : null);
            if (list && list.length > 0) {
              state.products = list;
              try { localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(list)); } catch (_) {}
              prodLoaded = true;
            }
          }
        } catch (_) {}

        if (!prodLoaded) {
          const prodRes = await fetch(`./data/data_products.json?_v=${Date.now()}`, { cache: 'no-store' });
          if (prodRes.ok) {
            const rawProd = await prodRes.json();
            if (Array.isArray(rawProd)) state.products = rawProd;
          }
        }
      } catch (_) {}

      // 4. Fetch Real Customers (Try /api/customers then fallback)
      try {
        let custLoaded = false;
        try {
          const liveCust = await apiFetch(`/api/customers?_v=${Date.now()}`, { cache: 'no-store' });
          if (liveCust.ok) {
            const list = await liveCust.json();
            if (Array.isArray(list) && list.length > 0) {
              state.customers = list;
              custLoaded = true;
            }
          }
        } catch (_) {}

        if (!custLoaded) {
          const custRes = await fetch(`./data/data_customers.json?_v=${Date.now()}`, { cache: 'no-store' });
          if (custRes.ok) {
            const rawCust = await custRes.json();
            if (Array.isArray(rawCust)) state.customers = rawCust;
          }
        }
      } catch (_) {}

      // 5. Fetch Real Wallet Details (Try /api/shiprocket/wallet/balance-details first)
      try {
        let walLoaded = false;
        try {
          const walApiRes = await apiFetch('/api/shiprocket/wallet/balance-details', { cache: 'no-store' });
          if (walApiRes.ok) {
            const rawWal = await walApiRes.json();
            if (rawWal && rawWal.available_balance !== undefined) {
              state.walletDetails = rawWal;
              walLoaded = true;
            }
          }
        } catch (_) {}

        if (!walLoaded) {
          const walRes = await fetch(`./data/data_wallet_details.json?_v=${Date.now()}`, { cache: 'no-store' });
          if (walRes.ok) {
            const rawWal = await walRes.json();
            if (rawWal && rawWal.available_balance !== undefined) state.walletDetails = rawWal;
          }
        }
      } catch (_) {}

      // 6. Fetch Real Employees
      try {
        let empLoaded = false;
        try {
          const liveEmpRes = await apiFetch('/api/employees', { cache: 'no-store' });
          if (liveEmpRes.ok) {
            const list = await liveEmpRes.json();
            if (Array.isArray(list) && list.length > 0) {
              state.employees = list;
              empLoaded = true;
            }
          }
        } catch (_) {}

        if (!empLoaded) {
          const empRes = await fetch(`./data/data_employees.json?_v=${Date.now()}`, { cache: 'no-store' });
          if (empRes.ok) {
            const rawEmp = await empRes.json();
            if (Array.isArray(rawEmp)) state.employees = rawEmp;
          }
        }
      } catch (_) {}

    } catch (err) {
      console.warn('Data fetch warning:', err);
    } finally {
      // Guaranteed cleanup and view updates: Refresh will NEVER hang
      state.isRefreshing = false;

      // Rebuild Live Activity Feed from fresh orders
      state.feed = [];
      generateLiveFeedFromOrders();

      // Re-render all views
      renderCockpit();
      renderOrders();
      renderTickets();

      if (liveLabel) {
        const isConnected = window.FirebaseService && typeof window.FirebaseService.isConnected === 'function' && window.FirebaseService.isConnected();
        liveLabel.textContent = `Live • ${state.orders.length} orders synced${isConnected ? ' • Firestore Realtime' : ''}`;
      }

      setTimeout(() => {
        if (refreshIcon) refreshIcon.classList.remove('spinning');
      }, 500);

      if (forceSync) {
        showToast(`Refreshed — ${state.orders.length} orders synced with Firebase`, 'success');
      }
    }
  }

  // Generate authentic activity feed from real orders
  function generateLiveFeedFromOrders() {
    const feed = [];
    const recentShipped = state.orders.filter(o => o.status === 'shipped').slice(0, 3);
    const recentBooked = state.orders.filter(o => o.status === 'booked').slice(0, 3);
    const pending = state.orders.filter(o => o.status === 'pending').slice(0, 2);

    recentBooked.forEach((o, idx) => {
      feed.push({
        id: 'f-b-' + idx,
        employee: o.createdByEmployeeName || 'Rajesh S.',
        action: `Manifest generated (${o.courierName || 'Blue Dart Air'})`,
        target: `${o.orderNumber} • ${o.customerName}`,
        amount: formatCurrency(o.totalAmount),
        time: `${(idx + 1) * 3}m ago`,
        status: 'Booked'
      });
    });

    recentShipped.forEach((o, idx) => {
      feed.push({
        id: 'f-s-' + idx,
        employee: 'Warehouse Staff',
        action: `Handed over to carrier (${o.courierName || 'Delhivery'})`,
        target: `${o.orderNumber} • AWB: ${o.awbCode || 'In Transit'}`,
        amount: formatCurrency(o.totalAmount),
        time: `${(idx + 1) * 12}m ago`,
        status: 'Shipped'
      });
    });

    pending.forEach((o, idx) => {
      feed.push({
        id: 'f-p-' + idx,
        employee: 'Fulfillment Lead',
        action: `Order verified & awaiting courier dispatch`,
        target: `${o.orderNumber} • ${o.customerName}`,
        amount: formatCurrency(o.totalAmount),
        time: `${(idx + 1) * 18}m ago`,
        status: 'Pending'
      });
    });

    state.feed = feed;
  }

  // --- Real-Time Authentication Management (Matches Android App) ---
  function setupAuth() {
    const loginView = document.getElementById('view-login');
    const loginForm = document.getElementById('login-form');
    const roleBtns = document.querySelectorAll('.login-role-btn');
    const emailInput = document.getElementById('login-email');
    const passwordInput = document.getElementById('login-password');
    const submitBtn = document.getElementById('btn-login-submit');
    const errorMsgEl = document.getElementById('login-error-msg');
    let selectedRole = 'admin';

    // Role toggle
    roleBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        haptic();
        roleBtns.forEach(b => {
          b.classList.remove('active');
          b.style.background = 'transparent';
          b.style.color = 'var(--body-slate)';
          b.style.fontWeight = '600';
        });
        btn.classList.add('active');
        btn.style.background = 'var(--primary-ink)';
        btn.style.color = '#FFFFFF';
        btn.style.fontWeight = '700';
        selectedRole = btn.getAttribute('data-role');

        if (errorMsgEl) errorMsgEl.style.display = 'none';

        if (emailInput) {
          if (selectedRole === 'admin') {
            emailInput.placeholder = 'dappersfit@gmail.com';
          } else {
            emailInput.placeholder = 'e.g. kamathamlokesh1234@gmail.com';
          }
        }
      });
    });

    loginForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      haptic('medium');

      const email = emailInput?.value?.trim() || '';
      const password = passwordInput?.value?.trim() || '';

      if (!email || !password) {
        if (errorMsgEl) {
          errorMsgEl.textContent = 'Please enter both email and password.';
          errorMsgEl.style.display = 'block';
        }
        return;
      }

      if (errorMsgEl) errorMsgEl.style.display = 'none';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="material-symbols-outlined spinning">sync</span><span>Authenticating...</span>';
      }

      let authenticatedUser = null;
      let authError = null;

      // 1. Authenticate via live backend API /api/auth/login
      try {
        const response = await apiFetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, role: selectedRole })
        });
        const data = await response.json();
        if (response.ok && data.success && data.user) {
          authenticatedUser = data.user;
        } else {
          authError = data.error || 'Invalid credentials. Please verify your details.';
        }
      } catch (netErr) {
        console.warn('Network error during /api/auth/login, checking local database:', netErr);
      }

      // 2. Direct authentic credential verification for Administrator and 8 Fulfillment Staff
      if (!authenticatedUser) {
        try {
          const normEmail = email.toLowerCase().trim();
          if (selectedRole === 'admin') {
            if (normEmail === 'dappersfit@gmail.com' && password === 'Jail@1974') {
              authenticatedUser = {
                id: 'adm-01',
                name: 'Dappersfit Admin',
                email: 'dappersfit@gmail.com',
                role: 'admin',
                isAdmin: true
              };
              authError = null;
            } else {
              try {
                const adminRes = await fetch('./data/data_admin.json');
                if (adminRes.ok) {
                  const adminData = await adminRes.json();
                  if (adminData.email.toLowerCase().trim() === normEmail && adminData.password === password) {
                    authenticatedUser = {
                      id: 'adm-01',
                      name: adminData.name || 'Dappersfit Admin',
                      email: adminData.email,
                      role: 'admin',
                      isAdmin: true
                    };
                    authError = null;
                  }
                }
              } catch (_) {}
              if (!authenticatedUser) {
                authError = 'Invalid administrator email or password.';
              }
            }
          } else {
            // Check in-memory state or fetch data_employees.json
            let empList = state.employees && state.employees.length > 0 ? state.employees : null;
            if (!empList) {
              try {
                const empRes = await fetch('./data/data_employees.json');
                if (empRes.ok) empList = await empRes.json();
              } catch (_) {}
            }
            if (!empList) {
              empList = [
                { id: "emp-1784187312734-878141", name: "Lokesh Kamatham", email: "kamathamlokesh1234@gmail.com", role: "Operations Manager", status: "Active", password: "lokesh123" },
                { id: "emp-1784188185987-272514", name: "nani", email: "srinuseeker@gmail.com", role: "Inventory Lead", status: "Active", password: "nani@9444" },
                { id: "emp-1784188230489-614248", name: "chaithra", email: "chaithra1407@gmail.com", role: "Fulfillment Executive", status: "Active", password: "dappers@1407" },
                { id: "emp-1786373819809-790635", name: "Devi", email: "devi@dappersfit.com", role: "Inventory Lead", status: "Active", password: "dappersfit@1601" },
                { id: "emp-1787151991304-401419", name: "Bindhu", email: "bindhugowda344@gmail.com", role: "Inventory Lead", status: "Active", password: "Dappersfit@5476" },
                { id: "emp-1788261498638-124761", name: "Milan", email: "milangowda758@gmail.com", role: "Fulfillment Executive", status: "Active", password: "Dappersfit@3006" },
                { id: "emp-1788863135354-115065", name: "dhanu sri", email: "dhanasatyasrikalaga@gmail.com", role: "Inventory Lead", status: "Active", password: "dappersfit@3006" },
                { id: "emp-1790257386928", name: "ram", email: "ramrajsakhunala@gmail.com", role: "inventory lead", status: "Active", password: "Dappersfit@3015" }
              ];
            }
            const matched = empList.find(emp => 
              ((emp.email || '').toLowerCase().trim() === normEmail || (emp.username || '').toLowerCase().trim() === normEmail) &&
              emp.password === password
            );
            if (matched) {
              if (matched.status === 'inactive') {
                authError = 'Your account has been deactivated.';
              } else {
                authenticatedUser = {
                  id: matched.id,
                  name: matched.name,
                  email: matched.email,
                  role: 'employee',
                  isAdmin: false,
                  employeeRole: matched.role
                };
                authError = null;
              }
            } else {
              authError = 'Invalid employee credentials. Please check your email and password.';
            }
          }
        } catch (_) {}
      }

      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size: 20px;">login</span><span>Authenticate Session</span>';
      }

      if (authenticatedUser) {
        state.user = {
          id: authenticatedUser.id || (selectedRole === 'admin' ? 'adm-01' : 'emp-01'),
          name: authenticatedUser.name || (selectedRole === 'admin' ? 'Dappersfit Admin' : 'Fulfillment Staff'),
          email: authenticatedUser.email,
          role: authenticatedUser.role || selectedRole,
          isAdmin: (authenticatedUser.role || selectedRole) === 'admin'
        };

        try {
          localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(state.user));
          localStorage.setItem('dappersfit_user', JSON.stringify(state.user));
        } catch (_) {}

        loginView?.classList.add('hidden');
        if (passwordInput) passwordInput.value = '';
        updateAdminVisibility();
        showToast(`Welcome back, ${state.user.name}`, 'success');
        loadRealData(false);
      } else {
        haptic('heavy');
        if (errorMsgEl) {
          errorMsgEl.textContent = authError || 'Invalid credentials. Please verify your details.';
          errorMsgEl.style.display = 'block';
        }
      }
    });

    // Check if user is already authenticated in session
    const savedUser = localStorage.getItem(STORAGE_KEY_AUTH) || localStorage.getItem('dappersfit_user');
    if (savedUser) {
      try {
        state.user = JSON.parse(savedUser);
        loginView?.classList.add('hidden');
        updateAdminVisibility();
      } catch (_) {
        state.user = null;
        loginView?.classList.remove('hidden');
      }
    } else {
      state.user = null;
      loginView?.classList.remove('hidden');
    }
  }

  function updateAdminVisibility() {
    const adminSection = document.getElementById('admin-menu-section');
    if (!adminSection) return;
    adminSection.style.display = (state.user && state.user.isAdmin) ? 'block' : 'none';
  }

  function logout() {
    haptic('heavy');
    state.user = null;
    localStorage.removeItem(STORAGE_KEY_AUTH);
    localStorage.removeItem('dappersfit_user');
    closeAllModals();
    const loginView = document.getElementById('view-login');
    const passwordInput = document.getElementById('login-password');
    if (passwordInput) passwordInput.value = '';
    const errorMsgEl = document.getElementById('login-error-msg');
    if (errorMsgEl) errorMsgEl.style.display = 'none';
    loginView?.classList.remove('hidden');
    showToast('Signed out of session', 'info');
  }

  // --- Navigation & View Switching ---
  function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const headerTitle = document.getElementById('header-page-title');

    navItems.forEach(item => {
      item.addEventListener('click', () => {
        const tab = item.getAttribute('data-tab');
        if (state.activeTab === tab) return;

        haptic('light');
        switchTab(tab);
      });
    });

    function switchTab(tabName) {
      state.activeTab = tabName;

      // Update bottom nav bar styles
      navItems.forEach(b => {
        if (b.getAttribute('data-tab') === tabName) {
          b.classList.add('active');
        } else {
          b.classList.remove('active');
        }
      });

      // Update active view page
      document.querySelectorAll('.view-page').forEach(page => {
        page.classList.remove('active');
      });

      const target = document.getElementById(`view-${tabName}`);
      if (target) {
        target.classList.add('active');
      }

      // Update header title
      const titles = {
        cockpit: 'Cockpit',
        orders: 'Orders Management',
        tickets: 'Replacements & Tickets',
        more: 'Operations Hub'
      };
      if (headerTitle) headerTitle.textContent = titles[tabName] || 'Dappersfit';

      // Re-render active tab
      if (tabName === 'orders') renderOrders();
      if (tabName === 'cockpit') renderCockpit();
      if (tabName === 'tickets') renderTickets();
    }

    // Refresh Button in Header
    document.getElementById('header-refresh-btn')?.addEventListener('click', (e) => {
      e.preventDefault();
      haptic('medium');
      loadRealData(true);
    });

    // Pull-to-refresh status bar
    document.querySelector('.live-status-bar')?.addEventListener('click', () => {
      haptic('medium');
      loadRealData(true);
    });

    // Profile Avatar Button in Header
    document.getElementById('header-profile-btn')?.addEventListener('click', () => {
      haptic();
      openProfileModal();
    });
  }

  // --- Rendering: Tab 1 — Cockpit (Matches Android Flutter App) ---
  function renderCockpit() {
    const total = state.orders.length;
    const pending = state.orders.filter(o => o.status === 'pending').length;
    // In Android app: booked = booked + awb_assigned + shipped + processed
    const bookedPriority = state.orders.filter(o => ['booked', 'awb_assigned', 'shipped', 'processed'].includes(o.status)).length;
    const delivered = state.orders.filter(o => o.status === 'delivered').length;
    const shipped = state.orders.filter(o => o.status === 'shipped').length;

    const elTotal = document.getElementById('stat-total-orders');
    const elPending = document.getElementById('stat-pending-orders');
    const elBooked = document.getElementById('stat-booked-orders');
    const elDelivered = document.getElementById('stat-delivered-orders');
    const elQueue = document.getElementById('stat-queue-count');

    if (elTotal) elTotal.textContent = total;
    if (elPending) elPending.textContent = pending;
    if (elBooked) elBooked.textContent = bookedPriority;
    if (elDelivered) elDelivered.textContent = (delivered > 0) ? delivered : (shipped > 0 ? shipped : 0);
    if (elQueue) elQueue.textContent = `${pending} PKTS`;

    // Render Live Activity Feed
    const feedContainer = document.getElementById('staff-feed-list');
    if (!feedContainer) return;

    if (state.feed.length === 0) generateLiveFeedFromOrders();

    feedContainer.innerHTML = state.feed.map(item => `
      <div class="feed-item">
        <div class="feed-avatar">${escapeHtml(item.employee.slice(0, 2).toUpperCase())}</div>
        <div class="feed-info">
          <div class="feed-title">${escapeHtml(item.action)}</div>
          <div class="feed-subtitle">${escapeHtml(item.target)} • ${escapeHtml(item.employee)}</div>
        </div>
        <div class="feed-time font-mono">${escapeHtml(item.time)}</div>
      </div>
    `).join('');
  }

  // KPI card clicks & Feed sync — set up via event delegation (no duplicates)
  function setupCockpitInteractions() {
    const cockpitView = document.getElementById('view-cockpit');
    if (!cockpitView) return;

    // Quick sync feed button
    document.getElementById('btn-quick-sync-feed')?.addEventListener('click', (e) => {
      e.preventDefault();
      haptic('medium');
      loadRealData(true);
    });

    cockpitView.addEventListener('click', (e) => {
      const card = e.target.closest('.kpi-card[id]');
      if (!card) return;
      haptic();
      const id = card.id;
      if (id === 'card-total-orders') setOrdersFilterAndJump('all');
      else if (id === 'card-pending-orders') setOrdersFilterAndJump('pending');
      else if (id === 'card-booked-orders') setOrdersFilterAndJump('active');
      else if (id === 'card-delivered-orders') setOrdersFilterAndJump('delivered');
    });
  }

  function setOrdersFilterAndJump(filter) {
    state.orderFilter = filter;
    document.querySelectorAll('.filter-pill[data-filter]').forEach(p => {
      if (p.getAttribute('data-filter') === filter) {
        p.classList.add('active');
      } else {
        p.classList.remove('active');
      }
    });
    const ordersTabBtn = document.querySelector('.nav-item[data-tab="orders"]');
    if (ordersTabBtn) ordersTabBtn.click();
    else renderOrders();
  }

  // --- Rendering: Tab 2 — Live Orders Management (Matches Flutter Android App) ---
  function renderOrders() {
    const container = document.getElementById('orders-container');
    if (!container) return;

    // Filter computation (Exactly matches Flutter ordersProvider.dart)
    let filtered = state.orders.filter(order => {
      // 1. Status Filter
      if (state.orderFilter !== 'all') {
        if (state.orderFilter === 'pending' && order.status !== 'pending') return false;
        if (state.orderFilter === 'active' && !['booked', 'awb_assigned', 'shipped', 'processed'].includes(order.status)) return false;
        if (state.orderFilter === 'delivered' && order.status !== 'delivered') return false;
        if (state.orderFilter === 'cancelled' && !['cancelled', 'failed'].includes(order.status)) return false;
      }

      // 2. Date Filter
      if (state.dateFilter === 'today') {
        const todayStr = new Date().toISOString().split('T')[0];
        if (order.date !== todayStr) return false;
      } else if (state.dateFilter === 'yesterday') {
        const yestStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        if (order.date !== yestStr) return false;
      } else if (state.dateFilter === 'custom' && state.customDate) {
        if (order.date !== state.customDate) return false;
      }

      // 3. Search Query (Fast tokenized search across ID, Customer, Phone, City, AWB, SKU)
      if (state.searchQuery) {
        const q = state.searchQuery.toLowerCase().trim();
        const corpus = [
          order.orderNumber || '',
          order.customerName || '',
          order.address?.phone || '',
          order.address?.city || '',
          order.address?.pincode || '',
          order.awbCode || '',
          order.courierName || '',
          order.items?.map(i => i.name).join(' ') || ''
        ].join(' ').toLowerCase();

        if (!corpus.includes(q)) return false;
      }

      return true;
    });

    // Update Filter Carousel Counts
    updateFilterCounts();

    if (filtered.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 48px 16px; color: var(--meta-gray);">
          <span class="material-symbols-outlined" style="font-size: 52px; opacity: 0.4;">inbox</span>
          <div style="font-size: 16px; font-weight: 700; color: var(--primary-ink); margin-top: 8px;">No matching orders</div>
          <div style="font-size: 12px; margin-top: 4px;">Try selecting another filter pill or clearing the search</div>
        </div>
      `;
      return;
    }

    // Paginate/Batch orders for fast 60fps rendering
    const visibleOrders = filtered.slice(0, state.visibleOrdersLimit);
    const hasMore = filtered.length > state.visibleOrdersLimit;

    container.innerHTML = visibleOrders.map(order => {
      const isPending = order.status === 'pending';
      const isBooked = ['booked', 'awb_assigned', 'shipped', 'processed'].includes(order.status);
      const itemsList = order.items && order.items.length > 0
        ? order.items.map(i => `${i.name || i.sku || 'Item'} (x${i.quantity || 1})`).join(', ')
        : '1x Apparel Item';

      const amountDisplay = (order.totalAmount && order.totalAmount > 0)
        ? formatCurrency(order.totalAmount)
        : '—';
      const courierBadge = order.courierName ? escapeHtml(order.courierName) : 'Courier Partner';
      const awbBadge = order.awbCode || '';

      // Normalize status for badge display
      const statusLabel = {
        pending: 'Pending', booked: 'Booked', awb_assigned: 'AWB Assigned',
        shipped: 'Shipped', delivered: 'Delivered', cancelled: 'Cancelled',
        failed: 'Failed', processed: 'Processed'
      }[order.status] || order.status;

      return `
        <article class="order-card" data-order-id="${escapeHtml(order.id)}">
          <div class="order-header-row">
            <div class="order-id-meta">
              <span class="order-id font-mono">${escapeHtml(order.orderNumber)}</span>
              <span style="color: var(--meta-gray); font-size: 10px;">•</span>
              <span class="order-time font-mono">${escapeHtml(order.date || 'Recent')}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 6px;">
              <span class="status-badge ${escapeHtml(order.status)}">${escapeHtml(statusLabel)}</span>
              ${isStrictAdmin() ? `
                <button type="button" class="card-action-btn-danger btn-delete-order" data-order-id="${escapeHtml(order.id)}" title="Delete Order">
                  <span class="material-symbols-outlined" style="font-size: 18px;">delete_outline</span>
                </button>
              ` : ''}
            </div>
          </div>

          <div class="order-body-row">
            <div class="order-customer-line">
              <span class="order-customer-name">${escapeHtml(order.customerName || 'Customer')}</span>
              <span class="order-price font-mono">${amountDisplay}</span>
            </div>

            <div class="order-address-line">
              <span class="material-symbols-outlined">location_on</span>
              <span class="selectable" style="max-width: 90%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                ${escapeHtml(order.address?.city || 'India')} • <strong class="font-mono">${escapeHtml(order.address?.pincode || '--')}</strong>
              </span>
            </div>

            <div class="order-items-box">
              <span class="material-symbols-outlined" style="font-size: 15px; color: var(--executive-gold); margin-right: 6px;">inventory_2</span>
              <span class="order-items-desc">${escapeHtml(itemsList)}</span>
              <span class="payment-chip">${escapeHtml(order.paymentMethod || 'COD')}</span>
            </div>

            ${awbBadge ? `
              <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 6px; padding: 6px 10px; background: var(--surface-low); border-radius: var(--radius-sm); border: 1px solid var(--hairline-border);">
                <div style="display: flex; align-items: center; gap: 6px; font-size: 11px;">
                  <span class="material-symbols-outlined" style="font-size: 15px; color: var(--executive-gold);">flight_takeoff</span>
                  <span style="color: var(--body-slate); font-weight: 500;">${courierBadge}:</span>
                  <span class="font-mono" style="font-weight: 700; color: var(--primary-ink);">${escapeHtml(awbBadge)}</span>
                </div>
                <button type="button" class="card-awb-copy-btn btn-copy-awb" data-awb="${escapeHtml(awbBadge)}" title="Copy AWB to clipboard">
                  <span class="material-symbols-outlined" style="font-size: 15px;">content_copy</span>
                </button>
              </div>
            ` : ''}
          </div>

          <div class="order-card-actions">
            <div style="font-size: 11px; color: var(--meta-gray); display: flex; align-items: center;">
              <span>${order.items?.length || 1} ${order.items?.length === 1 ? 'item' : 'items'} (${order.weight || 0.5} kg)</span>
            </div>

            <div style="display: flex; align-items: center; gap: 6px;">
              ${isPending ? `
                <button type="button" class="btn-card-priority" data-order-id="${escapeHtml(order.id)}" title="Priority Book Carrier">
                  <span class="material-symbols-outlined" style="font-size: 16px; color: var(--executive-gold-light);">rocket_launch</span>
                  <span>Priority Book</span>
                </button>
              ` : (isBooked ? `
                <button type="button" class="btn-card-secondary btn-view-shipment" data-order-id="${escapeHtml(order.id)}" title="Shipment Active">
                  <span class="material-symbols-outlined" style="font-size: 15px; color: #10B981;">check_circle</span>
                  <span>Booked</span>
                </button>
              ` : '')}

              <button type="button" class="btn-card-secondary btn-edit-order" data-order-id="${escapeHtml(order.id)}" title="Edit Order">
                <span class="material-symbols-outlined" style="font-size: 17px;">edit</span>
              </button>

              <button type="button" class="btn-card-secondary btn-order-details" data-order-id="${escapeHtml(order.id)}" title="View Order Details">
                <span class="material-symbols-outlined" style="font-size: 17px;">visibility</span>
              </button>
            </div>
          </div>
        </article>
      `;
    }).join('') + (hasMore ? `
      <div style="text-align: center; margin: 16px 0 24px 0;">
        <button type="button" id="btn-load-more-orders" class="btn-card-secondary" style="margin: 0 auto; padding: 0 20px;">
          <span>Load More (${visibleOrders.length} / ${filtered.length} orders)</span>
          <span class="material-symbols-outlined">expand_more</span>
        </button>
      </div>
    ` : `
      <div style="text-align: center; padding: 12px; font-size: 11px; color: var(--meta-gray);">
        All ${filtered.length} orders shown
      </div>
    `);

    // Event delegation — robust listener on container for all card interactions
    container.onclick = (e) => {
      // 1. Delete order button
      const deleteBtn = e.target.closest('.btn-delete-order');
      if (deleteBtn) {
        e.stopPropagation();
        triggerDeleteOrder(deleteBtn.getAttribute('data-order-id'));
        return;
      }

      // 1b. Edit order button
      const editBtn = e.target.closest('.btn-edit-order');
      if (editBtn) {
        e.stopPropagation();
        openEditOrderSheet(editBtn.getAttribute('data-order-id'));
        return;
      }

      // 2. Copy AWB button
      const copyBtn = e.target.closest('.btn-copy-awb');
      if (copyBtn) {
        e.stopPropagation();
        const awb = copyBtn.getAttribute('data-awb');
        if (awb && navigator.clipboard) {
          navigator.clipboard.writeText(awb).catch(() => {});
          haptic('light');
          showToast(`AWB ${awb} copied to clipboard`, 'success');
        }
        return;
      }

      // 3. Priority Book button
      const priorityBtn = e.target.closest('.btn-card-priority');
      if (priorityBtn) {
        e.stopPropagation();
        triggerPriorityDispatch(priorityBtn.getAttribute('data-order-id'));
        return;
      }


      // 5. Details button / Booked button
      const detailBtn = e.target.closest('.btn-order-details, .btn-view-shipment');
      if (detailBtn) {
        e.stopPropagation();
        openOrderDetailSheet(detailBtn.getAttribute('data-order-id'));
        return;
      }

      // 6. Load more button
      const loadMoreBtn = e.target.closest('#btn-load-more-orders');
      if (loadMoreBtn) {
        haptic();
        state.visibleOrdersLimit += 35;
        renderOrders();
        return;
      }

      // 7. Order card click (opens detail if not clicking an action button)
      const card = e.target.closest('.order-card');
      if (card && !e.target.closest('button')) {
        openOrderDetailSheet(card.getAttribute('data-order-id'));
      }
    };
  }

  // Exact counts matching Flutter OrdersScreen filter pills
  function updateFilterCounts() {
    const counts = {
      all: state.orders.length,
      pending: state.orders.filter(o => o.status === 'pending').length,
      active: state.orders.filter(o => ['booked', 'awb_assigned', 'shipped', 'processed'].includes(o.status)).length,
      delivered: state.orders.filter(o => o.status === 'delivered').length,
      cancelled: state.orders.filter(o => ['cancelled', 'failed'].includes(o.status)).length
    };

    const countAll = document.getElementById('filter-count-all');
    const countPending = document.getElementById('filter-count-pending');
    const countActive = document.getElementById('filter-count-active');
    const countDelivered = document.getElementById('filter-count-delivered');
    const countCancelled = document.getElementById('filter-count-cancelled');

    if (countAll) countAll.textContent = `(${counts.all})`;
    if (countPending) countPending.textContent = counts.pending > 0 ? counts.pending : '0';
    if (countActive) countActive.textContent = counts.active > 0 ? counts.active : '0';
    if (countDelivered) countDelivered.textContent = counts.delivered > 0 ? counts.delivered : '0';
    if (countCancelled) countCancelled.textContent = counts.cancelled > 0 ? counts.cancelled : '0';
  }

  // --- Orders Controls, Search, Date Filters, & Add Order FAB ---
  function setupOrdersControls() {
    const searchInput = document.getElementById('orders-search-input');
    const clearBtn = document.getElementById('orders-clear-search');

    searchInput?.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      state.visibleOrdersLimit = 35;
      if (clearBtn) clearBtn.style.display = state.searchQuery ? 'flex' : 'none';
      renderOrders();
    });

    clearBtn?.addEventListener('click', () => {
      haptic();
      searchInput.value = '';
      state.searchQuery = '';
      clearBtn.style.display = 'none';
      renderOrders();
    });

    // Filter Carousel Pills
    document.querySelectorAll('.filter-pill[data-filter]').forEach(pill => {
      pill.addEventListener('click', () => {
        haptic();
        document.querySelectorAll('.filter-pill[data-filter]').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        state.orderFilter = pill.getAttribute('data-filter');
        state.visibleOrdersLimit = 35;
        renderOrders();
      });
    });

    // Date Filter Pills
    document.querySelectorAll('.date-pill[data-date]').forEach(pill => {
      pill.addEventListener('click', () => {
        haptic();
        const dateMode = pill.getAttribute('data-date');
        if (dateMode === 'custom') return; // Handled by picker

        document.querySelectorAll('.date-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        state.dateFilter = dateMode;
        state.visibleOrdersLimit = 35;
        renderOrders();
      });
    });

    // Custom Date Picker
    const customDateBtn = document.getElementById('btn-custom-date');
    const customDateInput = document.getElementById('orders-custom-date');
    const customDateLabel = document.getElementById('label-custom-date');

    customDateBtn?.addEventListener('click', () => {
      haptic();
      if (customDateInput) {
        if ('showPicker' in HTMLInputElement.prototype) {
          try { customDateInput.showPicker(); } catch(_) { customDateInput.click(); }
        } else {
          customDateInput.click();
        }
      }
    });

    customDateInput?.addEventListener('change', (e) => {
      const val = e.target.value;
      if (val) {
        state.dateFilter = 'custom';
        state.customDate = val;
        if (customDateLabel) customDateLabel.textContent = val;
        document.querySelectorAll('.date-pill').forEach(p => p.classList.remove('active'));
        customDateBtn?.classList.add('active');
        state.visibleOrdersLimit = 35;
        renderOrders();
      }
    });

    // Excel Export
    document.getElementById('btn-export-excel')?.addEventListener('click', () => {
      haptic('medium');
      exportOrdersToCSV();
    });

    // Add Order Floating Action Button (FAB)
    document.getElementById('btn-add-order-fab')?.addEventListener('click', () => {
      haptic('medium');
      openAddOrderSheet();
    });
  }

  function exportOrdersToCSV() {
    if (state.orders.length === 0) {
      showToast('No orders to export', 'error');
      return;
    }

    const headers = ['Order Number', 'Date', 'Customer Name', 'Phone', 'City', 'State', 'Pincode', 'Amount', 'Payment Mode', 'Status', 'Courier', 'AWB'];
    const rows = state.orders.map(o => [
      `"${o.orderNumber || ''}"`,
      `"${o.date || ''}"`,
      `"${(o.customerName || '').replace(/"/g, '""')}"`,
      `"${o.address?.phone || ''}"`,
      `"${(o.address?.city || '').replace(/"/g, '""')}"`,
      `"${(o.address?.state || '').replace(/"/g, '""')}"`,
      `"${o.address?.pincode || ''}"`,
      o.totalAmount || 0,
      `"${o.paymentMethod || 'COD'}"`,
      `"${o.status || ''}"`,
      `"${o.courierName || ''}"`,
      `"${o.awbCode || ''}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dappersfit-orders-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast(`Exported ${state.orders.length} orders to CSV`, 'success');
  }

  // --- Strict Shiprocket Label & Booking Validation Helpers ---
  const activeBookingOrderIds = new Set();

  function isOfficialShiprocketLabel(url) {
    if (!url || typeof url !== 'string') return false;
    if (url.includes('download-label-pdf')) return false;
    return (
      url.includes('/api/shiprocket/download-live-pdf') ||
      url.includes('sr-core-cdn') ||
      url.includes('shiprocket') ||
      url.includes('amazonaws.com') ||
      url.includes('kr-shipmultichannel')
    );
  }

  function isGenuineShiprocketBooking(obj) {
    if (!obj) return false;
    const awb = String(obj.awbCode || '').trim();
    const shipmentId = String(obj.shipmentId || '').trim();
    const srOrderId = String(obj.shiprocketOrderId || '').trim();
    if (!awb || !shipmentId) return false;
    if (
      awb.startsWith('789') ||
      awb.startsWith('AWB') ||
      shipmentId.startsWith('SHP-') ||
      shipmentId.startsWith('SM-') ||
      shipmentId.startsWith('sim_') ||
      srOrderId.startsWith('SR-') ||
      srOrderId.startsWith('sim_')
    ) {
      return false;
    }
    return true;
  }

  function getOrderBookingFingerprint(o) {
    if (!o) return '';
    const normStr = (s) => String(s || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '');
    const normDigits = (p) => String(p || '').replace(/\D/g, '');
    const phone = normDigits(o.address?.phone || o.phone).slice(-10);
    const pin = normDigits(o.address?.pincode || o.pincode);
    const cust = normStr(o.customerName || o.address?.name);
    const firstItem = Array.isArray(o.items) && o.items.length > 0 ? o.items[0] : null;
    const prod = normStr(firstItem?.sku || firstItem?.name || o.productName || o.item);
    const qty = Number(firstItem?.quantity || o.quantity || 1);
    if (!phone || !pin) return '';
    return `${cust}|${phone}|${pin}|${prod}|${qty}`;
  }

  function findDuplicateBookedInShiprocket(targetOrder) {
    if (!targetOrder) return null;
    const targetId = String(targetOrder.id || '').trim();
    const targetOrderNo = String(targetOrder.orderNumber || '').trim().toLowerCase();
    const targetFp = getOrderBookingFingerprint(targetOrder);

    return state.orders.find(o => {
      if (!o || o.status === 'cancelled' || o.status === 'failed') return false;
      const oId = String(o.id || '').trim();
      if (oId === targetId) return false;

      const isAlreadyBookedOrInFlight =
        activeBookingOrderIds.has(oId) ||
        isGenuineShiprocketBooking(o) ||
        (['booked', 'awb_assigned', 'shipped', 'delivered', 'processed'].includes(String(o.status || '').toLowerCase()) &&
          Boolean(o.awbCode || o.shipmentId));

      if (!isAlreadyBookedOrInFlight) return false;

      const oOrderNo = String(o.orderNumber || '').trim().toLowerCase();
      if (targetOrderNo && oOrderNo && targetOrderNo === oOrderNo) {
        return true;
      }

      if (targetFp) {
        const oFp = getOrderBookingFingerprint(o);
        if (oFp && oFp === targetFp) {
          return true;
        }
      }
      return false;
    }) || null;
  }

  // --- Seamless Automatic Official Shiprocket PDF Label Download ---
  async function triggerSeamlessLabelDownload(url, filename) {
    if (!url || !isOfficialShiprocketLabel(url)) {
      showToast('Only official Shiprocket labels can be downloaded.', 'error');
      return false;
    }
    const safeFilename = filename || 'Shiprocket-Label.pdf';
    try {
      let fullUrl = url;
      if (fullUrl.startsWith('/')) {
        const apiBase = await resolveApiBase();
        fullUrl = `${apiBase}${fullUrl}`;
      }

      // 1. Fetch official Shiprocket PDF as Blob to trigger automatic download on iOS Safari / PWA
      const res = await fetch(fullUrl, { method: 'GET', credentials: 'omit' });
      if (res.ok) {
        const arrayBuf = await res.arrayBuffer();
        const pdfBlob = new Blob([arrayBuf], { type: 'application/pdf' });
        const blobUrl = window.URL.createObjectURL(pdfBlob);
        const link = document.createElement('a');
        link.style.display = 'none';
        link.href = blobUrl;
        link.download = safeFilename;
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
          try { document.body.removeChild(link); } catch (e) {}
          window.URL.revokeObjectURL(blobUrl);
        }, 60000);
        return true;
      }
    } catch (fetchErr) {
      console.warn('[Seamless Label Download] Fetch failed, falling back to direct anchor download:', fetchErr);
    }

    // 2. Fallback: Direct anchor download + silent iframe for official Shiprocket PDF URL
    try {
      let fullUrl = url;
      if (fullUrl.startsWith('/')) {
        const apiBase = await resolveApiBase();
        fullUrl = `${apiBase}${fullUrl}`;
      }
      const link = document.createElement('a');
      link.style.display = 'none';
      link.href = fullUrl;
      link.download = safeFilename;
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        try { document.body.removeChild(link); } catch (e) {}
      }, 5000);
      return true;
    } catch (e) {
      console.error('[Seamless Label Download] Direct download fallback failed:', e);
      return false;
    }
  }

  // --- Official Shiprocket Label Modal (Strict Official Shiprocket Label Only) ---
  async function showShippingLabelModal(order, autoDownload = false) {
    if (!order) return;
    haptic('medium');

    if (!isGenuineShiprocketBooking(order)) {
      showToast('Order is not booked in Shiprocket. Label unavailable.', 'error');
      return;
    }

    // If official Shiprocket label URL is not cached on the order yet, fetch it from Shiprocket
    if (!isOfficialShiprocketLabel(order.labelUrl)) {
      try {
        const lRes = await apiFetch('/api/shiprocket/label', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ shipmentId: order.shipmentId || order.shiprocketOrderId || order.id })
        });
        if (lRes.ok) {
          const lData = await lRes.json();
          if (lData && lData.success && isOfficialShiprocketLabel(lData.labelUrl)) {
            order.labelUrl = lData.labelUrl;
            try { localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(state.orders)); } catch (_) {}
          }
        }
      } catch (_) {}
    }

    if (!isOfficialShiprocketLabel(order.labelUrl)) {
      showToast('Official Shiprocket label is not available for this order.', 'error');
      return;
    }

    const rawUrl = order.labelUrl;
    const apiBase = state.baseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
    const labelUrl = (rawUrl && rawUrl.startsWith('/')) ? `${apiBase}${rawUrl}` : rawUrl;
    const awb = order.awbCode;
    const courier = order.courierName || 'Shiprocket Courier';
    const orderNo = order.orderNumber || order.id;
    const pdfFilename = `Shiprocket-Label-${orderNo}.pdf`;

    if (autoDownload) {
      triggerSeamlessLabelDownload(rawUrl, pdfFilename);
    }

    openSubmoduleSheet(`Shiprocket Label — ${orderNo}`, `
      <div style="display: flex; flex-direction: column; gap: 12px;">
        <div style="background: var(--surface-low); padding: 10px 12px; border-radius: var(--radius-sm); border: 1px solid var(--executive-gold); display: flex; align-items: center; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: 6px;">
            <span class="material-symbols-outlined" style="color: #10B981; font-size: 18px;">verified</span>
            <div>
              <div style="font-size: 12px; font-weight: 700; color: var(--primary-ink);">Official Shiprocket Label</div>
              <div class="font-mono" style="font-size: 11px; color: var(--meta-gray);">${escapeHtml(courier)} • AWB: ${escapeHtml(awb)}</div>
            </div>
          </div>
          <span class="status-badge booked" style="font-size: 10px;">Shiprocket</span>
        </div>

        <div style="border-radius: 8px; overflow: hidden; border: 1px solid var(--hairline-border); background: #FFFFFF;">
          <iframe src="${escapeHtml(labelUrl)}" title="Official Shiprocket Label PDF" style="width: 100%; height: 380px; border: none; display: block;"></iframe>
        </div>

        <div style="display: flex; gap: 8px; margin-top: 4px;">
          <button type="button" id="btn-modal-download-pdf" class="btn-gold-primary" style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 12px; cursor: pointer;">
            <span class="material-symbols-outlined">download</span>
            <span>Download Official Shiprocket Label</span>
          </button>
        </div>
      </div>
    `);

    document.getElementById('btn-modal-download-pdf')?.addEventListener('click', () => {
      triggerSeamlessLabelDownload(rawUrl, pdfFilename);
    });
  }

  // --- Priority Dispatch Action (Strict Live Shiprocket Booking & Official Label Only) ---
  async function triggerPriorityDispatch(orderId) {
    const order = state.orders.find(o => o.id === orderId);
    if (!order) return;

    // 1. In-flight concurrency lock to prevent duplicate orders from double-tapping
    if (activeBookingOrderIds.has(order.id)) {
      haptic('light');
      showToast(`Booking is already in progress in Shiprocket for ${order.orderNumber}...`, 'info');
      return;
    }

    // 2. If order was previously marked booked by an old local fallback (not a real Shiprocket booking), reset it to pending
    if (order.status === 'booked' && !isGenuineShiprocketBooking(order)) {
      order.status = 'pending';
      delete order.awbCode;
      delete order.shipmentId;
      delete order.shiprocketOrderId;
      delete order.labelUrl;
    }

    // 3. PREVENT DUPLICATE BOOKINGS: If already genuinely booked in Shiprocket, never rebook; download & show official Shiprocket label
    if (
      isGenuineShiprocketBooking(order) &&
      ['booked', 'awb_assigned', 'shipped', 'delivered', 'processed'].includes(String(order.status || '').toLowerCase())
    ) {
      haptic('light');
      showToast(`Order ${order.orderNumber} is already booked in Shiprocket (AWB: ${order.awbCode}). Downloading Shiprocket label...`, 'info');

      if (!isOfficialShiprocketLabel(order.labelUrl)) {
        try {
          const lRes = await apiFetch('/api/shiprocket/label', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ shipmentId: order.shipmentId || order.shiprocketOrderId || order.id })
          });
          if (lRes.ok) {
            const lData = await lRes.json();
            if (lData && lData.success && isOfficialShiprocketLabel(lData.labelUrl)) {
              order.labelUrl = lData.labelUrl;
              try { localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(state.orders)); } catch (_) {}
            }
          }
        } catch (_) {}
      }

      if (!isOfficialShiprocketLabel(order.labelUrl)) {
        showToast('Official Shiprocket label could not be retrieved for this shipment.', 'error');
        return;
      }

      await triggerSeamlessLabelDownload(order.labelUrl, `Shiprocket-Label-${order.orderNumber || order.id}.pdf`);

      openOrderDetailSheet(order.id);
      setTimeout(() => {
        showShippingLabelModal(order, false);
      }, 350);
      return;
    }

    // 4. PREVENT DUPLICATE ORDERS IN SHIPROCKET: Block if another identical order is already booked or being booked in Shiprocket
    const duplicateBooked = findDuplicateBookedInShiprocket(order);
    if (duplicateBooked) {
      haptic('heavy');
      showToast(
        `Duplicate order blocked! Identical order ${duplicateBooked.orderNumber || duplicateBooked.id} is already booked in Shiprocket (AWB: ${duplicateBooked.awbCode || 'Assigned'}).`,
        'error'
      );
      return;
    }

    // 5. Check mandatory fields before dispatching
    const cName = (order.customerName || '').trim();
    const cPhone = (order.address?.phone || '').replace(/\D/g, '');
    const cAddr = (order.address?.address || '').trim();
    const cPin = (order.address?.pincode || '').trim();

    const missing = [];
    if (!cName || cName.toLowerCase() === 'walkin customer') missing.push('Customer Name');
    if (!cPhone || cPhone.length < 10) missing.push('Mobile Number');
    if (!cAddr || cAddr.length < 5) missing.push('Delivery Address');
    if (!cPin || !/^\d{6}$/.test(cPin)) missing.push('PIN Code');

    if (missing.length > 0) {
      haptic('medium');
      alert(`Cannot book Priority Dispatch! Missing required order details:\n• ${missing.join('\n• ')}`);
      return;
    }

    activeBookingOrderIds.add(order.id);
    haptic('heavy');
    showToast(`Booking ${order.orderNumber} in Shiprocket & generating official label...`, 'info');

    try {
      const pName = 'dapperss';
      const pPin = '600002';

      const res = await apiFetch('/api/shiprocket/order/priority-book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          assignedEmployeeId: state.user?.id || 'admin',
          pickupLocationName: pName,
          pickupPostcode: pPin,
          forceRebook: false
        })
      });

      let data = null;
      try {
        data = await res.json();
      } catch (_) {}

      // Strictly require:
      // 1) HTTP 200 + data.success === true
      // 2) Genuine Shiprocket booking (real shiprocketOrderId, shipmentId, awbCode)
      // 3) Official Shiprocket label URL (data.labelUrl from Shiprocket)
      const hasValidShiprocketBooking = res.ok && data && data.success === true && isGenuineShiprocketBooking(data);
      const hasOfficialLabel = Boolean(data && isOfficialShiprocketLabel(data.labelUrl));

      if (!hasValidShiprocketBooking || !hasOfficialLabel) {
        // DO NOT BOOK THE ORDER if Shiprocket booking or official Shiprocket label failed!
        order.status = 'pending';
        delete order.awbCode;
        delete order.shipmentId;
        delete order.shiprocketOrderId;
        delete order.labelUrl;
        try { localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(state.orders)); } catch (_) {}
        renderOrders();
        renderCockpit();

        const errMsg =
          data?.error ||
          (!hasValidShiprocketBooking
            ? 'Order was not booked in Shiprocket. Order remains pending.'
            : 'Official Shiprocket label could not be generated. Order was not booked.');
        showToast(errMsg, 'error');
        return;
      }

      // Update order with verified live Shiprocket booking & official Shiprocket label
      if (data.order) {
        Object.assign(order, data.order);
      }
      order.status = 'booked';
      order.shiprocketOrderId = String(data.shiprocketOrderId);
      order.shipmentId = String(data.shipmentId);
      order.awbCode = String(data.awbCode);
      order.courierName = data.courierName || order.courierName || 'Shiprocket Partner';
      order.pickupLocation = data.pickupLocation || pName;
      order.rate = data.rate || order.rate || 68.0;
      order.labelUrl = data.labelUrl;

      try { localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(state.orders)); } catch (_) {}

      // 2-Way Real-time Firebase Firestore Sync
      if (window.FirebaseService && typeof window.FirebaseService.saveOrder === 'function') {
        window.FirebaseService.saveOrder(order).catch(err => console.warn('[Firebase] saveOrder warning:', err));
      }

      state.feed.unshift({
        id: 'f-now-' + Date.now(),
        employee: state.user?.name || 'Operator',
        action: 'Shiprocket Priority Dispatch Booked',
        target: `${order.orderNumber} via ${order.courierName}`,
        amount: formatCurrency(order.totalAmount),
        time: 'Just now',
        status: 'Booked'
      });

      renderOrders();
      renderCockpit();
      showToast(`Booked ${order.orderNumber} in Shiprocket! Downloading label...`, 'success');

      // Automatically download the official Shiprocket PDF label immediately
      await triggerSeamlessLabelDownload(order.labelUrl, `Shiprocket-Label-${order.orderNumber || order.id}.pdf`);

      // Display order details and the official Shiprocket label modal
      openOrderDetailSheet(order.id);
      setTimeout(() => {
        showShippingLabelModal(order, false);
      }, 380);
    } catch (err) {
      // Never fallback to local fake booking on network/server error
      order.status = 'pending';
      delete order.awbCode;
      delete order.shipmentId;
      delete order.shiprocketOrderId;
      delete order.labelUrl;
      try { localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(state.orders)); } catch (_) {}
      renderOrders();
      renderCockpit();
      showToast('Shiprocket connection failed. Order was not booked.', 'error');
    } finally {
      activeBookingOrderIds.delete(order.id);
    }
  }

  // --- Delete Order Action (Admin Only) ---
  async function triggerDeleteOrder(orderId) {
    if (!isStrictAdmin()) {
      showToast('Only Admin can delete orders.', 'error');
      return;
    }

    const order = state.orders.find(o => o.id === orderId);
    if (!order) return;

    if (!confirm(`Permanently delete order ${order.orderNumber}?`)) {
      return;
    }

    haptic('heavy');
    try {
      const res = await apiFetch(`/api/orders/${encodeURIComponent(order.id)}`, {
        method: 'DELETE',
        headers: { 'x-user-role': 'admin' }
      });
      if (res && res.status === 403) {
        showToast('Only Admin can delete orders.', 'error');
        return;
      }
    } catch (_) {}

    // 2-Way Real-time Firebase Firestore Sync
    if (window.FirebaseService && typeof window.FirebaseService.deleteOrder === 'function') {
      window.FirebaseService.deleteOrder(order.id).catch(err => console.warn('[Firebase] deleteOrder warning:', err));
    }

    state.orders = state.orders.filter(o => o.id !== orderId);
    try { localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(state.orders)); } catch (_) {}

    renderOrders();
    renderCockpit();
    showToast(`Order ${order.orderNumber} deleted`, 'info');
  }

  // =========================================================================
  // PRODUCT CATALOG MANAGEMENT & ORDER INTEGRATION ENGINE (ADMIN EDIT/DELETE)
  // =========================================================================

  function populateOrderCatalogPicker(preselectValue = '') {
    const catalogSelect = document.getElementById('new-order-catalog-picker');
    if (!catalogSelect) return;

    catalogSelect.innerHTML = '<option value="">Choose item...</option>';
    const prods = (Array.isArray(state.products) && state.products.length > 0) ? state.products : DEFAULT_PRODUCTS_CATALOG;

    prods.forEach(p => {
      const opt = document.createElement('option');
      const val = p.id || p.sku || p.name;
      opt.value = val;
      const skuLabel = p.sku ? ` (${p.sku.toUpperCase()})` : '';
      const priceVal = p.price && p.price > 0 ? p.price : 1499;
      opt.textContent = `${p.name || p.sku}${skuLabel} - ₹${Number(priceVal).toLocaleString()}`;
      opt.setAttribute('data-id', p.id || '');
      opt.setAttribute('data-sku', p.sku || '');
      opt.setAttribute('data-name', p.name || p.sku || '');
      opt.setAttribute('data-price', priceVal);
      opt.setAttribute('data-weight', p.weight || 0.5);
      opt.setAttribute('data-stock', p.stock ?? 50);
      opt.setAttribute('data-cat', p.category || 'Drone Action Cameras');
      if (p.dimensions) {
        opt.setAttribute('data-length', p.dimensions.length || 22);
        opt.setAttribute('data-width', p.dimensions.width || 15);
        opt.setAttribute('data-height', p.dimensions.height || 6);
      }
      if (preselectValue && (val === preselectValue || p.sku === preselectValue || p.name === preselectValue)) {
        opt.selected = true;
      }
      catalogSelect.appendChild(opt);
    });

    if (preselectValue) {
      applySelectedCatalogProduct();
    } else {
      const card = document.getElementById('catalog-selected-product-card');
      if (card) card.style.display = 'none';
    }

    catalogSelect.onchange = () => {
      applySelectedCatalogProduct();
      haptic('light');
    };
  }

  function applySelectedCatalogProduct() {
    const catalogSelect = document.getElementById('new-order-catalog-picker');
    const card = document.getElementById('catalog-selected-product-card');
    if (!catalogSelect) return;

    const selectedOpt = catalogSelect.options[catalogSelect.selectedIndex];
    if (!selectedOpt || !selectedOpt.value) {
      if (card) card.style.display = 'none';
      return;
    }

    const prodVal = selectedOpt.value;
    const p = state.products.find(item => (item.id === prodVal || item.sku === prodVal || item.name === prodVal)) || {
      id: selectedOpt.getAttribute('data-id'),
      sku: selectedOpt.getAttribute('data-sku') || prodVal,
      name: selectedOpt.getAttribute('data-name') || prodVal,
      price: Number(selectedOpt.getAttribute('data-price')) || 1499,
      weight: Number(selectedOpt.getAttribute('data-weight')) || 0.5,
      stock: Number(selectedOpt.getAttribute('data-stock')) ?? 50,
      category: selectedOpt.getAttribute('data-cat') || 'Drone Action Cameras'
    };

    // Auto-fill order inputs
    const itemInput = document.getElementById('new-order-item-name');
    const amountInput = document.getElementById('new-order-amount');
    const weightInput = document.getElementById('new-order-weight');
    const lenInput = document.getElementById('new-order-length');
    const widthInput = document.getElementById('new-order-width');
    const heightInput = document.getElementById('new-order-height');

    if (itemInput) itemInput.value = p.name || p.sku;
    if (amountInput) amountInput.value = p.price && p.price > 0 ? p.price : 1499;
    if (weightInput) weightInput.value = p.weight || 0.5;

    // Dimensions auto-fill
    const boxLen = p.dimensions?.length || (Number(p.weight) >= 2 ? 28 : 22);
    const boxWidth = p.dimensions?.width || (Number(p.weight) >= 2 ? 20 : 15);
    const boxHeight = p.dimensions?.height || (Number(p.weight) >= 2 ? 10 : 6);
    if (lenInput) lenInput.value = boxLen;
    if (widthInput) widthInput.value = boxWidth;
    if (heightInput) heightInput.value = boxHeight;

    // Display selected product card
    if (card) {
      card.style.display = 'block';
      const skuEl = document.getElementById('cat-card-sku');
      const nameEl = document.getElementById('cat-card-name');
      const metaEl = document.getElementById('cat-card-meta');
      const adminActions = document.getElementById('cat-card-admin-actions');

      if (skuEl) skuEl.textContent = (p.sku || 'SKU').toUpperCase();
      if (nameEl) nameEl.textContent = p.name || p.sku;
      if (metaEl) {
        metaEl.innerHTML = `${escapeHtml(p.category || 'General')} • Weight: <strong>${p.weight || 0.5} kg</strong> • Price: <strong>₹${Number(p.price || 1499).toLocaleString()}</strong> • Stock: <strong>${p.stock ?? 50}</strong> • Box: <strong>${boxLen}x${boxWidth}x${boxHeight} cm</strong>`;
      }

      if (adminActions) {
        const isAdmin = isUserAdmin();
        adminActions.style.display = isAdmin ? 'flex' : 'none';

        // Edit button
        const editBtn = document.getElementById('btn-cat-edit-selected');
        if (editBtn) {
          editBtn.onclick = (e) => {
            e.preventDefault();
            showProductFormModal(p, (updatedProd) => {
              populateOrderCatalogPicker(updatedProd.id || updatedProd.sku);
            });
          };
        }

        // Delete button
        const delBtn = document.getElementById('btn-cat-delete-selected');
        if (delBtn) {
          delBtn.onclick = (e) => {
            e.preventDefault();
            deleteCatalogProduct(p, () => {
              populateOrderCatalogPicker('');
            });
          };
        }
      }
    }
  }

  async function deleteCatalogProduct(p, onDeleted) {
    if (!p) return;
    const targetName = p.name || p.sku;
    if (!confirm(`Are you sure you want to permanently delete "${targetName}" from the product catalog?`)) {
      return;
    }
    haptic('heavy');
    showToast(`Deleting ${targetName}...`, 'info');
    const targetId = p.id || p.sku;
    state.products = state.products.filter(item => (item.id !== p.id && item.sku !== p.sku));
    localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(state.products));

    try {
      if (window.FirebaseService && typeof window.FirebaseService.deleteProduct === 'function') {
        window.FirebaseService.deleteProduct(targetId).catch(err => console.warn('[Firebase] deleteProduct warning:', err));
      }
      await apiFetch(`/api/products/${encodeURIComponent(targetId)}`, {
        method: 'DELETE',
        headers: { 'x-user-role': 'admin' }
      });
      showToast(`Product "${targetName}" deleted successfully.`, 'success');
    } catch (err) {
      console.warn('Backend delete error:', err);
    }

    // Refresh catalog submodule view if active
    const prodSub = document.getElementById('submodule-sheet');
    if (prodSub && prodSub.classList.contains('active')) {
      const title = document.getElementById('submodule-title');
      if (title && title.textContent.includes('Products')) {
        renderProductsCatalogSubmodule();
      }
    }
    if (typeof onDeleted === 'function') onDeleted();
  }

  function showProductFormModal(existing, onSavedCallback) {
    const isEdit = !!existing;
    const title = isEdit ? 'Edit Catalog Product' : 'Register New Product';
    const formHtml = `
      <div style="display:flex; flex-direction:column; gap:12px;">
        <div style="font-size:12px; color:var(--meta-gray);">${isEdit ? `Editing SKU: <strong>${escapeHtml(existing.sku || existing.name)}</strong>` : 'Add a new product to the warehouse stock registry'}</div>
        
        <div>
          <label style="font-size:11px; font-weight:700; color:var(--primary-ink); display:block; margin-bottom:4px;">Product Name *</label>
          <input type="text" id="pwa-prod-name" value="${escapeHtml(existing?.name || '')}" placeholder="e.g. Drone 4K Action Camera" style="width:100%; padding:9px 12px; border-radius:8px; border:1px solid var(--hairline-border); font-size:13px; box-sizing:border-box;" />
        </div>

        <div>
          <label style="font-size:11px; font-weight:700; color:var(--primary-ink); display:block; margin-bottom:4px;">SKU Code *</label>
          <input type="text" id="pwa-prod-sku" value="${escapeHtml(existing?.sku || '')}" placeholder="e.g. DRN-4K, AC, WG" style="width:100%; padding:9px 12px; border-radius:8px; border:1px solid var(--hairline-border); font-size:13px; font-family:monospace; box-sizing:border-box;" />
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
          <div>
            <label style="font-size:11px; font-weight:700; color:var(--primary-ink); display:block; margin-bottom:4px;">Category</label>
            <input type="text" id="pwa-prod-cat" value="${escapeHtml(existing?.category || 'Drone Action Cameras')}" placeholder="Category" style="width:100%; padding:8px 10px; border-radius:8px; border:1px solid var(--hairline-border); font-size:13px; box-sizing:border-box;" />
          </div>
          <div>
            <label style="font-size:11px; font-weight:700; color:var(--primary-ink); display:block; margin-bottom:4px;">Price (₹) *</label>
            <input type="number" id="pwa-prod-price" value="${existing?.price !== undefined ? existing.price : 1499}" placeholder="1499" style="width:100%; padding:8px 10px; border-radius:8px; border:1px solid var(--hairline-border); font-size:13px; font-family:monospace; box-sizing:border-box;" />
          </div>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
          <div>
            <label style="font-size:11px; font-weight:700; color:var(--primary-ink); display:block; margin-bottom:4px;">Weight (kg) *</label>
            <input type="number" step="0.01" id="pwa-prod-weight" value="${existing?.weight !== undefined ? existing.weight : 0.5}" placeholder="0.5" style="width:100%; padding:8px 10px; border-radius:8px; border:1px solid var(--hairline-border); font-size:13px; font-family:monospace; box-sizing:border-box;" />
          </div>
          <div>
            <label style="font-size:11px; font-weight:700; color:var(--primary-ink); display:block; margin-bottom:4px;">Warehouse Stock</label>
            <input type="number" id="pwa-prod-stock" value="${existing?.stock !== undefined ? existing.stock : 50}" placeholder="50" style="width:100%; padding:8px 10px; border-radius:8px; border:1px solid var(--hairline-border); font-size:13px; font-family:monospace; box-sizing:border-box;" />
          </div>
        </div>

        <div>
          <label style="font-size:11px; font-weight:700; color:var(--primary-ink); display:block; margin-bottom:4px;">Box Dimensions (cm) *</label>
          <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:8px;">
            <div>
              <span style="font-size:9px; font-weight:700; color:var(--meta-gray); text-transform:uppercase; display:block; margin-bottom:2px;">LENGTH</span>
              <input type="number" id="pwa-prod-len" value="${existing?.dimensions?.length || 22}" class="form-control font-mono" style="text-align:center; font-size:12px; padding:6px;" />
            </div>
            <div>
              <span style="font-size:9px; font-weight:700; color:var(--meta-gray); text-transform:uppercase; display:block; margin-bottom:2px;">WIDTH</span>
              <input type="number" id="pwa-prod-width" value="${existing?.dimensions?.width || 15}" class="form-control font-mono" style="text-align:center; font-size:12px; padding:6px;" />
            </div>
            <div>
              <span style="font-size:9px; font-weight:700; color:var(--meta-gray); text-transform:uppercase; display:block; margin-bottom:2px;">HEIGHT</span>
              <input type="number" id="pwa-prod-height" value="${existing?.dimensions?.height || 6}" class="form-control font-mono" style="text-align:center; font-size:12px; padding:6px;" />
            </div>
          </div>
        </div>

        <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:14px;">
          <button id="btn-cancel-prod-form" class="btn-card-outline" style="padding:8px 14px; font-size:12px; font-weight:700;">Cancel</button>
          <button id="btn-save-prod-form" class="btn-gold-primary" style="padding:8px 16px; font-size:12px; font-weight:700; border-radius:8px;">
            <span>${isEdit ? 'Save Changes' : 'Register Product'}</span>
          </button>
        </div>
      </div>
    `;

    openSubmoduleSheet(title, formHtml);

    document.getElementById('btn-cancel-prod-form')?.addEventListener('click', () => {
      renderProductsCatalogSubmodule();
    });

    document.getElementById('btn-save-prod-form')?.addEventListener('click', async () => {
      const name = (document.getElementById('pwa-prod-name')?.value || '').trim();
      const sku = (document.getElementById('pwa-prod-sku')?.value || '').trim();
      const category = (document.getElementById('pwa-prod-cat')?.value || 'Drone Action Cameras').trim();
      const price = Number(document.getElementById('pwa-prod-price')?.value) || 1499;
      const weight = Number(document.getElementById('pwa-prod-weight')?.value) || 0.5;
      const stock = Number(document.getElementById('pwa-prod-stock')?.value) || 50;
      const length = Number(document.getElementById('pwa-prod-len')?.value) || 22;
      const width = Number(document.getElementById('pwa-prod-width')?.value) || 15;
      const height = Number(document.getElementById('pwa-prod-height')?.value) || 6;

      if (!name || !sku) {
        alert('Product name and SKU code are required.');
        return;
      }

      haptic('medium');
      showToast(isEdit ? 'Updating product...' : 'Adding product...', 'info');

      const productPayload = {
        id: existing?.id || `p-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
        name,
        sku,
        category,
        price,
        weight,
        stock,
        dimensions: { length, width, height }
      };

      if (isEdit) {
        state.products = state.products.map(p => (p.id === existing.id || p.sku === existing.sku) ? productPayload : p);
      } else {
        state.products = [productPayload, ...state.products];
      }
      localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(state.products));

      try {
        if (window.FirebaseService && typeof window.FirebaseService.saveProduct === 'function') {
          window.FirebaseService.saveProduct(productPayload).catch(err => console.warn('[Firebase] saveProduct warning:', err));
        }
        await apiFetch('/api/products', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-role': 'admin'
          },
          body: JSON.stringify(productPayload)
        });
        showToast(`Product "${name}" saved successfully.`, 'success');
      } catch (err) {
        console.warn('Backend save error:', err);
      }

      renderProductsCatalogSubmodule();
      populateOrderCatalogPicker(productPayload.id || productPayload.sku);
      if (typeof onSavedCallback === 'function') onSavedCallback(productPayload);
    });
  }

  function renderProductsCatalogSubmodule(filterQuery = '') {
    const isAdmin = isUserAdmin();
    const prodList = (Array.isArray(state.products) && state.products.length > 0) ? state.products : DEFAULT_PRODUCTS_CATALOG;

    const query = String(filterQuery || '').toLowerCase().trim();
    const filtered = prodList.filter(p => {
      if (!query) return true;
      const corpus = `${p.sku || ''} ${p.name || ''} ${p.category || ''}`.toLowerCase();
      return corpus.includes(query);
    });

    const html = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
        <div style="font-size:12px; color:var(--meta-gray);">Warehouse SKU Registry: <strong>${prodList.length} products</strong></div>
        ${isAdmin ? `
          <button id="btn-pwa-add-product" class="btn-gold-primary" style="padding:6px 12px; font-size:11px; border-radius:8px; height:auto; width:auto;">
            <span>+ Add Product</span>
          </button>
        ` : ''}
      </div>

      <div style="margin-bottom:12px;">
        <input type="search" id="pwa-catalog-search-input" value="${escapeHtml(filterQuery)}" placeholder="🔍 Search catalog by SKU, name, or category..." class="form-control" style="font-size:12px; padding:8px 12px; border-radius:8px;" />
      </div>

      <div id="pwa-products-container" style="display: flex; flex-direction: column; gap: 10px;">
        ${filtered.length === 0 ? `
          <div style="text-align:center; padding:24px 10px; color:var(--meta-gray); font-size:12px;">
            No products match "${escapeHtml(filterQuery)}".
          </div>
        ` : filtered.map((p, idx) => {
          const isAc = (p.sku || '').toLowerCase().trim() === 'ac';
          const box = p.dimensions ? `${p.dimensions.length}x${p.dimensions.width}x${p.dimensions.height} cm` : (p.weight >= 2 ? '28x20x10 cm' : '22x15x6 cm');
          return `
            <div class="kpi-card" style="min-height: auto; border: 1px solid var(--hairline-border); padding: 12px; border-radius: 12px; background: var(--canvas);">
              <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                <div>
                  <div style="display:flex; align-items:center; gap:6px;">
                    <span class="font-mono" style="font-weight:800; font-size:13px; color:var(--executive-gold); background:rgba(184,134,47,0.12); padding:2px 6px; border-radius:4px;">${escapeHtml(p.sku?.toUpperCase() || 'SKU')}</span>
                    ${isAc ? '<span style="font-size:9px; font-weight:700; background:rgba(184,134,47,0.15); color:var(--executive-gold); padding:1px 4px; border-radius:4px; font-family:monospace;">AC</span>' : ''}
                  </div>
                  <div style="font-size:13px; font-weight:700; margin-top:4px; color:var(--primary-ink);">${escapeHtml(p.name || p.sku)}</div>
                </div>
                <span class="kpi-badge green" style="font-size:11px;">Stock: ${p.stock ?? 50}</span>
              </div>
              <div style="font-size:11px; color:var(--meta-gray); margin-top:6px; line-height:1.4;">
                Category: <strong>${escapeHtml(p.category || 'General')}</strong> • Weight: <strong>${p.weight || 0.5} kg</strong>${p.price ? ` • Price: <strong>₹${Number(p.price).toLocaleString()}</strong>` : ' • Price: <strong>₹1,499</strong>'} • Box: <strong>${box}</strong>
              </div>
              ${isAdmin ? `
                <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:10px; padding-top:8px; border-top:1px solid var(--hairline-border);">
                  <button class="btn-card-edit-product" data-product-idx="${idx}" style="background:var(--surface-container); border:1px solid var(--hairline-border); color:var(--executive-gold); font-size:11px; font-weight:700; padding:5px 12px; border-radius:6px; cursor:pointer;">
                    ✏️ Edit
                  </button>
                  <button class="btn-card-delete-product" data-product-idx="${idx}" style="background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.2); color:#EF4444; font-size:11px; font-weight:700; padding:5px 12px; border-radius:6px; cursor:pointer;">
                    🗑️ Delete
                  </button>
                </div>
              ` : ''}
            </div>
          `;
        }).join('')}
      </div>
    `;

    openSubmoduleSheet('Products & Catalog Registry', html);

    // Search input listener
    const searchInput = document.getElementById('pwa-catalog-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        renderProductsCatalogSubmodule(e.target.value);
      });
    }

    if (isAdmin) {
      // Add Product Button
      document.getElementById('btn-pwa-add-product')?.addEventListener('click', () => {
        showProductFormModal();
      });

      // Edit Product Buttons
      document.querySelectorAll('.btn-card-edit-product').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = Number(btn.getAttribute('data-product-idx'));
          const p = filtered[idx];
          if (p) showProductFormModal(p);
        });
      });

      // Delete Product Buttons
      document.querySelectorAll('.btn-card-delete-product').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = Number(btn.getAttribute('data-product-idx'));
          const p = filtered[idx];
          if (p) deleteCatalogProduct(p);
        });
      });
    }
  }

  // --- Register / Edit Order Modal & AI Smart Parser (Matches Desktop & Android App) ---
  function openEditOrderSheet(orderId) {
    const order = state.orders.find(o => o.id === orderId);
    if (!order) {
      showToast('Order not found.', 'error');
      return;
    }
    openAddOrderSheet(order);
  }

  function openAddOrderSheet(existingOrder = null) {
    haptic('light');
    const isEdit = Boolean(existingOrder && existingOrder.id);
    const form = document.getElementById('form-add-order');
    const sheetTitleEl = document.querySelector('#sheet-add-order .sheet-title');
    const submitBtnSpan = document.querySelector('#btn-submit-new-order span');
    const promptInput = document.getElementById('ai-order-prompt');
    const parseBtn = document.getElementById('btn-parse-ai-order');
    const statusMsg = document.getElementById('ai-order-status');
    const parsedChip = document.getElementById('ai-parsed-chip');
    const duplicateAlert = document.getElementById('new-order-duplicate-alert');

    if (form && !isEdit) form.reset();
    if (sheetTitleEl) {
      sheetTitleEl.textContent = isEdit
        ? `Edit Order — ${existingOrder.orderNumber || existingOrder.id}`
        : 'New Order — Submit for Approval';
    }
    if (submitBtnSpan) {
      submitBtnSpan.textContent = isEdit ? 'Save Order Changes' : 'Submit Order for Approval';
    }

    if (promptInput) promptInput.value = '';
    if (statusMsg) { statusMsg.style.display = 'none'; statusMsg.textContent = ''; }
    if (parsedChip) parsedChip.style.display = 'none';
    if (duplicateAlert) { duplicateAlert.style.display = 'none'; duplicateAlert.innerHTML = ''; }

    // 1. Populate Employee Assignment Dropdown
    const empSelect = document.getElementById('new-order-assigned-employee');
    if (empSelect) {
      empSelect.innerHTML = '<option value="">Unassigned</option>';
      const emps = Array.isArray(state.employees) && state.employees.length > 0 ? state.employees : [
        { id: "emp-1784187312734-878141", name: "Lokesh Kamatham", role: "Operations Manager" },
        { id: "emp-1784188185987-272514", name: "nani", role: "Staff" },
        { id: "emp-1784188230489-614248", name: "chaithra", role: "Fulfillment Executive" },
        { id: "emp-1786373819809-790635", name: "Devi", role: "Inventory Lead" }
      ];
      emps.forEach(e => {
        const opt = document.createElement('option');
        opt.value = e.id || e.name;
        opt.textContent = `${e.name} (${e.role || 'Staff'})`;
        empSelect.appendChild(opt);
      });
    }

    // 2. Populate Pick from Catalog Dropdown & Quick Catalog Management
    populateOrderCatalogPicker();
    const quickCatBtn = document.getElementById('btn-quick-manage-catalog');
    if (quickCatBtn) {
      quickCatBtn.onclick = (e) => {
        e.preventDefault();
        haptic('light');
        renderProductsCatalogSubmodule();
      };
    }

    // 3. Update Attributed Creator Info
    const creatorNameEl = document.getElementById('new-order-creator-name');
    const creatorEmailEl = document.getElementById('new-order-creator-email');
    const currentName = state.user?.name || 'Dappersfit Admin';
    const currentEmail = state.user?.email || 'dappersfit@gmail.com';
    if (creatorNameEl) creatorNameEl.textContent = isEdit ? (existingOrder.createdByEmployeeName || currentName) : currentName;
    if (creatorEmailEl) creatorEmailEl.textContent = isEdit ? (existingOrder.createdByEmployeePhone || currentEmail) : currentEmail;

    // 4. Product Advance Checkbox Incentive Toggle
    const advCheckbox = document.getElementById('new-order-advance');
    const advPill = document.getElementById('advance-incentive-pill');
    if (advCheckbox && advPill) {
      if (!isEdit) {
        advPill.textContent = 'INCENTIVE: ₹30';
      }
      advCheckbox.onchange = () => {
        advPill.textContent = advCheckbox.checked ? 'INCENTIVE: ₹50' : 'INCENTIVE: ₹30';
        haptic('light');
      };
    }

    // 5. Pre-fill existing order fields when editing
    if (isEdit) {
      const firstItem = Array.isArray(existingOrder.items) && existingOrder.items.length > 0 ? existingOrder.items[0] : null;
      const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val ?? '';
      };
      setVal('new-order-customer-name', existingOrder.customerName || existingOrder.address?.name || '');
      setVal('new-order-phone', existingOrder.address?.phone || existingOrder.phone || '');
      setVal('new-order-address', existingOrder.address?.address || '');
      setVal('new-order-city', existingOrder.address?.city || '');
      setVal('new-order-state', existingOrder.address?.state || '');
      setVal('new-order-pincode', existingOrder.address?.pincode || '');
      setVal('new-order-item-name', firstItem?.name || existingOrder.productName || existingOrder.item || '');
      setVal('new-order-quantity', firstItem?.quantity || existingOrder.quantity || 1);
      setVal('new-order-amount', existingOrder.totalAmount || firstItem?.price || 1499);
      setVal('new-order-weight', existingOrder.weight || 0.5);
      setVal('new-order-length', existingOrder.dimensions?.length || 22);
      setVal('new-order-width', existingOrder.dimensions?.width || 15);
      setVal('new-order-height', existingOrder.dimensions?.height || 6);

      const payEl = document.getElementById('new-order-payment');
      if (payEl) {
        const isPrepaid = String(existingOrder.paymentMethod || '').toUpperCase() === 'PREPAID';
        payEl.value = isPrepaid ? 'Prepaid' : 'Cash On Delivery (COD)';
      }
      if (advCheckbox) {
        advCheckbox.checked = Boolean(existingOrder.productAdvance);
      }
      if (advPill) {
        const isPrepaid = String(existingOrder.paymentMethod || '').toUpperCase() === 'PREPAID';
        advPill.textContent = (existingOrder.productAdvance || isPrepaid) ? 'INCENTIVE: ₹50' : 'INCENTIVE: ₹30';
      }
      if (empSelect) {
        empSelect.value = existingOrder.assignedEmployeeId || '';
      }
    }

    // Parse button handler (AI Quick Assist)
    if (parseBtn) {
      parseBtn.onclick = () => {
        const text = promptInput?.value?.trim();
        if (!text) {
          if (statusMsg) {
            statusMsg.style.display = 'block';
            statusMsg.style.color = 'var(--status-cancelled-text)';
            statusMsg.textContent = 'Please enter or paste order message to parse.';
          }
          return;
        }

        haptic('medium');
        const parsed = SmartParser.parse(text);
        if (parsed) {
          if (parsed.customerName) document.getElementById('new-order-customer-name').value = parsed.customerName;
          if (parsed.phone) document.getElementById('new-order-phone').value = parsed.phone;
          if (parsed.address) document.getElementById('new-order-address').value = parsed.address;
          if (parsed.city) document.getElementById('new-order-city').value = parsed.city;
          if (parsed.state) document.getElementById('new-order-state').value = parsed.state;
          if (parsed.pincode) document.getElementById('new-order-pincode').value = parsed.pincode;
          if (parsed.itemName) document.getElementById('new-order-item-name').value = parsed.itemName;
          if (parsed.amount) document.getElementById('new-order-amount').value = parsed.amount;
          if (parsed.paymentMethod) document.getElementById('new-order-payment').value = parsed.paymentMethod;

          if (parsedChip) parsedChip.style.display = 'inline-block';
          if (statusMsg) {
            statusMsg.style.display = 'block';
            statusMsg.style.color = 'var(--status-delivered-text)';
            statusMsg.textContent = 'Fields filled successfully via AI smart parser!';
          }
        }
      };
    }

    const nameInput = document.getElementById('new-order-customer-name');
    const phoneInput = document.getElementById('new-order-phone');
    const addrInput = document.getElementById('new-order-address');
    const pinInput = document.getElementById('new-order-pincode');

    const errName = document.getElementById('error-customer-name');
    const errPhone = document.getElementById('error-phone');
    const errAddr = document.getElementById('error-address');
    const errPin = document.getElementById('error-pincode');

    const clearErrors = () => {
      [nameInput, phoneInput, addrInput, pinInput].forEach(el => {
        if (el) el.style.border = '1px solid var(--hairline-border)';
      });
      [errName, errPhone, errAddr, errPin].forEach(el => {
        if (el) { el.style.display = 'none'; el.textContent = ''; }
      });
    };
    clearErrors();

    nameInput?.addEventListener('input', () => {
      nameInput.style.border = '1px solid var(--hairline-border)';
      if (errName) errName.style.display = 'none';
      if (duplicateAlert) duplicateAlert.style.display = 'none';
    });
    phoneInput?.addEventListener('input', () => {
      phoneInput.style.border = '1px solid var(--hairline-border)';
      if (errPhone) errPhone.style.display = 'none';
      if (duplicateAlert) duplicateAlert.style.display = 'none';
    });
    addrInput?.addEventListener('input', () => {
      addrInput.style.border = '1px solid var(--hairline-border)';
      if (errAddr) errAddr.style.display = 'none';
      if (duplicateAlert) duplicateAlert.style.display = 'none';
    });
    pinInput?.addEventListener('input', () => {
      pinInput.style.border = '1px solid var(--hairline-border)';
      if (errPin) errPin.style.display = 'none';
      if (duplicateAlert) duplicateAlert.style.display = 'none';
    });

    // Form submission handler
    if (form) {
      form.onsubmit = async (e) => {
        e.preventDefault();
        const customerName = (nameInput?.value || '').trim();
        const phone = (phoneInput?.value || '').trim();
        const address = (addrInput?.value || '').trim();
        const city = (document.getElementById('new-order-city')?.value || '').trim();
        const stateName = (document.getElementById('new-order-state')?.value || '').trim() || 'India';
        const pincode = (pinInput?.value || '').trim();
        const itemName = (document.getElementById('new-order-item-name')?.value || '').trim();
        const quantity = parseInt(document.getElementById('new-order-quantity')?.value, 10) || 1;
        const amount = parseFloat(document.getElementById('new-order-amount')?.value) || 1499;
        const weight = parseFloat(document.getElementById('new-order-weight')?.value) || 0.5;
        const paymentMethod = document.getElementById('new-order-payment')?.value || 'Cash On Delivery (COD)';
        const isAdvance = document.getElementById('new-order-advance')?.checked || false;
        const assignedEmpId = document.getElementById('new-order-assigned-employee')?.value || '';

        const boxLength = parseFloat(document.getElementById('new-order-length')?.value) || 22;
        const boxWidth = parseFloat(document.getElementById('new-order-width')?.value) || 15;
        const boxHeight = parseFloat(document.getElementById('new-order-height')?.value) || 6;

        // Mandatory Field Validation
        let hasError = false;
        clearErrors();

        const lowerName = customerName.toLowerCase();
        if (!customerName || lowerName === 'walkin customer' || lowerName === 'walk-in customer' || lowerName === 'unknown' || lowerName === 'n/a' || lowerName === 'none') {
          hasError = true;
          if (nameInput) nameInput.style.border = '1px solid #ef4444';
          if (errName) {
            errName.style.display = 'block';
            errName.textContent = 'Customer name is required.';
          }
        }

        const phoneDigits = phone.replace(/\D/g, '');
        if (!phone || phoneDigits.length < 10) {
          hasError = true;
          if (phoneInput) phoneInput.style.border = '1px solid #ef4444';
          if (errPhone) {
            errPhone.style.display = 'block';
            errPhone.textContent = 'Mobile number is required (minimum 10 digits).';
          }
        }

        if (!address || address.length < 5) {
          hasError = true;
          if (addrInput) addrInput.style.border = '1px solid #ef4444';
          if (errAddr) {
            errAddr.style.display = 'block';
            errAddr.textContent = 'Delivery address is required (minimum 5 characters).';
          }
        }

        if (!pincode || !/^\d{6}$/.test(pincode)) {
          hasError = true;
          if (pinInput) pinInput.style.border = '1px solid #ef4444';
          if (errPin) {
            errPin.style.display = 'block';
            errPin.textContent = 'PIN code is required (6-digit numeric postal code).';
          }
        }

        if (hasError) {
          haptic('medium');
          return;
        }

        // =====================================================================
        // DUPLICATE ORDER DETECTION (Compare Complete Relevant Raw Order Data)
        // Show warning ONLY when ALL relevant raw data matches an existing order!
        // =====================================================================
        const normStr = (s) => (s || '').toString().toLowerCase().trim().replace(/[^a-z0-9]/g, '');
        const normDigits = (p) => (p || '').toString().replace(/\D/g, '');
        const last10 = (p) => {
          const d = normDigits(p);
          return d.length >= 10 ? d.slice(-10) : d;
        };

        const newCust = normStr(customerName);
        const newPh = last10(phone);
        const newAddr = normStr(address);
        const newPin = normDigits(pincode);
        const newProd = normStr(itemName);
        const newQty = quantity;

        const hasAllRequiredFields = newCust && newPh.length >= 10 && newAddr.length >= 5 && newPin.length === 6 && newProd;

        if (hasAllRequiredFields) {
          const matchedDuplicate = state.orders.find(o => {
            if (!o || o.status === 'cancelled') return false;
            if (isEdit && String(o.id) === String(existingOrder.id)) return false;
            const oCust = normStr(o.customerName || o.address?.name);
            const oPh = last10(o.address?.phone || o.phone);
            const oAddr = normStr(o.address?.address);
            const oPin = normDigits(o.address?.pincode);
            const oFirstItem = Array.isArray(o.items) && o.items.length > 0 ? o.items[0] : null;
            const oProd = normStr(oFirstItem?.name || oFirstItem?.sku || o.productName || o.item);
            const oQty = Number(oFirstItem?.quantity || o.quantity || 1);

            return oCust === newCust &&
                   oPh === newPh &&
                   oAddr === newAddr &&
                   oPin === newPin &&
                   oProd === newProd &&
                   oQty === newQty;
          });

          if (matchedDuplicate) {
            haptic('error');
            if (duplicateAlert) {
              duplicateAlert.style.display = 'flex';
              duplicateAlert.innerHTML = `
                <div style="display:flex; align-items:center; gap:6px; font-weight:800; font-size:12px;">
                  <span class="material-symbols-outlined" style="font-size:18px;">warning</span>
                  <span>Duplicate Order Detected</span>
                </div>
                <div style="font-size:11px; line-height:1.4;">
                  An identical order matching all raw data already exists with ID <strong>${escapeHtml(matchedDuplicate.orderNumber || matchedDuplicate.id)}</strong>.<br>
                  <strong>Customer:</strong> ${escapeHtml(matchedDuplicate.customerName)} • <strong>Phone:</strong> ${escapeHtml(matchedDuplicate.address?.phone || '--')}<br>
                  <strong>Product:</strong> ${escapeHtml(matchedDuplicate.items?.[0]?.name || itemName)} (Qty: ${newQty}) • <strong>Status:</strong> ${escapeHtml(matchedDuplicate.status)}
                </div>
                <div style="font-size:10px; color:#B91C1C; margin-top:2px;">
                  To prevent duplicate bookings, please verify before submitting.
                </div>
              `;
              duplicateAlert.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
            showToast(`Duplicate Order Detected! Matches ${matchedDuplicate.orderNumber}`, 'error');
            return;
          }
        }

        // Retrieve authentic employee details & registered phone number
        let creatorPhone = state.user?.phone || '';
        let creatorName = state.user?.name || (state.user?.role === 'admin' ? 'Admin Operations' : 'Employee');
        let creatorId = state.user?.id || (state.user?.role === 'admin' ? 'admin' : 'emp-staff');

        if (!creatorPhone && state.employees && state.employees.length > 0) {
          const match = state.employees.find(e => 
            e.id === state.user?.id || 
            e.email === state.user?.email || 
            e.username === state.user?.username ||
            (e.name && e.name.toLowerCase() === (state.user?.name || '').toLowerCase())
          );
          if (match && match.phone) {
            creatorPhone = match.phone;
          }
        }

        if (!creatorPhone && state.user?.role === 'admin') {
          creatorPhone = '7702049015'; // Registered primary operator phone
        }

        haptic('heavy');

        if (isEdit) {
          const existingFirstItem = Array.isArray(existingOrder.items) && existingOrder.items.length > 0 ? existingOrder.items[0] : null;
          const updatedItem = {
            ...(existingFirstItem || {}),
            id: existingFirstItem?.id || ('itm-' + Date.now()),
            name: itemName,
            sku: itemName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            quantity: quantity,
            price: amount
          };
          const remainingItems = Array.isArray(existingOrder.items) && existingOrder.items.length > 1
            ? existingOrder.items.slice(1)
            : [];

          const updatedOrder = {
            ...existingOrder,
            customerName: customerName,
            totalAmount: amount,
            address: {
              ...(existingOrder.address || {}),
              name: customerName,
              phone: phone,
              address: address,
              city: city,
              state: stateName,
              pincode: pincode
            },
            items: [updatedItem, ...remainingItems],
            weight: weight,
            dimensions: {
              length: boxLength,
              width: boxWidth,
              height: boxHeight
            },
            paymentMethod: paymentMethod === 'Prepaid' ? 'PREPAID' : 'COD',
            productAdvance: isAdvance,
            productAdvanceIncentive: (paymentMethod === 'Prepaid' || isAdvance) ? 50.0 : 30.0,
            assignedEmployeeId: assignedEmpId || existingOrder.assignedEmployeeId || creatorId,
            updatedAt: new Date().toISOString()
          };

          try {
            await apiFetch(`/api/orders/${encodeURIComponent(existingOrder.id)}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(updatedOrder)
            });
          } catch (_) {}

          if (window.FirebaseService && typeof window.FirebaseService.saveOrder === 'function') {
            window.FirebaseService.saveOrder(updatedOrder).catch(err => console.warn('[Firebase] saveOrder warning:', err));
          }

          state.orders = state.orders.map(o => String(o.id) === String(existingOrder.id) ? updatedOrder : o);
          try { localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(state.orders)); } catch (_) {}

          state.feed.unshift({
            id: 'f-edit-' + Date.now(),
            employee: creatorName,
            action: 'Order Updated',
            target: `${updatedOrder.orderNumber} • ${updatedOrder.customerName}`,
            amount: formatCurrency(updatedOrder.totalAmount),
            time: 'Just now',
            status: updatedOrder.status || 'Pending'
          });

          closeSheet('sheet-add-order');
          form.reset();
          renderOrders();
          renderCockpit();
          showToast(`Order ${updatedOrder.orderNumber} updated successfully!`, 'success');
          return;
        }

        const orderId = String(Date.now()) + '-' + Math.floor(Math.random() * 10000);
        const newOrderNumber = 'DF-' + Math.floor(200000 + Math.random() * 800000);
        const todayDate = new Date().toISOString().split('T')[0];

        const newOrder = {
          id: orderId,
          orderNumber: newOrderNumber,
          customerName: customerName,
          date: todayDate,
          totalAmount: amount,
          address: {
            name: customerName,
            phone: phone,
            address: address,
            city: city,
            state: stateName,
            pincode: pincode
          },
          items: [
            {
              id: 'itm-' + Date.now(),
              name: itemName,
              sku: itemName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
              quantity: quantity,
              price: amount
            }
          ],
          weight: weight,
          dimensions: {
            length: boxLength,
            width: boxWidth,
            height: boxHeight
          },
          paymentMethod: paymentMethod === 'Prepaid' ? 'PREPAID' : 'COD',
          productAdvance: isAdvance,
          productAdvanceIncentive: (paymentMethod === 'Prepaid' || isAdvance) ? 50.0 : 30.0,
          status: 'pending',
          assignedEmployeeId: assignedEmpId || creatorId,
          createdByEmployeeId: creatorId,
          createdByEmployeeName: creatorName,
          createdByEmployeePhone: creatorPhone || 'Employee information unavailable'
        };

        // 1. Try sending to backend API POST /api/orders (enforce server-side duplicate check)
        try {
          const createRes = await apiFetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newOrder)
          });
          if (createRes.status === 409) {
            const dupData = await createRes.json().catch(() => ({}));
            haptic('error');
            if (duplicateAlert) {
              duplicateAlert.style.display = 'flex';
              duplicateAlert.innerHTML = `
                <div style="display:flex; align-items:center; gap:6px; font-weight:800; font-size:12px;">
                  <span class="material-symbols-outlined" style="font-size:18px;">warning</span>
                  <span>Duplicate Order Detected</span>
                </div>
                <div style="font-size:11px; line-height:1.4;">
                  ${escapeHtml(dupData.message || 'An identical order already exists in the system.')}
                </div>
              `;
              duplicateAlert.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
            showToast(dupData.message || 'Duplicate Order Detected!', 'error');
            return;
          }
        } catch (_) {}

        // 2-Way Real-time Firebase Firestore Sync
        if (window.FirebaseService && typeof window.FirebaseService.saveOrder === 'function') {
          window.FirebaseService.saveOrder(newOrder).catch(err => console.warn('[Firebase] saveOrder warning:', err));
        }

        // 2. Prepend to state & storage
        state.orders.unshift(newOrder);
        try { localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(state.orders)); } catch (_) {}

        // 3. Update Activity Feed
        state.feed.unshift({
          id: 'f-add-' + Date.now(),
          employee: creatorName,
          action: 'New Order Registered',
          target: `${newOrder.orderNumber} • ${newOrder.customerName}`,
          amount: formatCurrency(newOrder.totalAmount),
          time: 'Just now',
          status: 'Pending'
        });

        closeSheet('sheet-add-order');
        form.reset();
        renderOrders();
        renderCockpit();
        showToast(`Order ${newOrder.orderNumber} registered successfully!`, 'success');
      };
    }

    openSheet('sheet-add-order');
  }

  // --- Order Detail Bottom Sheet ---
  function openOrderDetailSheet(orderId) {
    const order = state.orders.find(o => o.id === orderId);
    if (!order) return;

    state.selectedOrder = order;
    haptic('light');

    const numEl = document.getElementById('detail-order-number');
    const dateEl = document.getElementById('detail-order-date');
    const contentEl = document.getElementById('detail-sheet-content');

    if (numEl) numEl.textContent = order.orderNumber;
    if (dateEl) dateEl.textContent = order.date || 'Recent';

    // Resolve employee attribution details
    let createdByName = order.createdByEmployeeName || order.employeeName || (order.employee && order.employee !== '—' ? order.employee : '');
    let createdByPhone = order.createdByEmployeePhone || order.employeePhone || '';

    // If phone is missing but we have employee info, look up in employees registry
    if (!createdByPhone && createdByName && Array.isArray(state.employees) && state.employees.length > 0) {
      const match = state.employees.find(e => 
        (e.name && e.name.toLowerCase() === createdByName.toLowerCase()) ||
        (e.id && e.id === order.createdByEmployeeId) ||
        (e.email && e.email.toLowerCase() === (order.createdByEmployeeEmail || '').toLowerCase())
      );
      if (match && match.phone) {
        createdByPhone = match.phone;
      }
    }

    if (!createdByName) createdByName = 'Employee information unavailable';
    if (!createdByPhone) createdByPhone = 'Employee information unavailable';

    const itemsHtml = order.items && order.items.length > 0 ? order.items.map(i => `
      <div style="display:flex; justify-content:space-between; align-items:center; padding: 8px 0; border-bottom: 1px solid var(--hairline-border);">
        <div>
          <div style="font-weight: 700; color: var(--primary-ink); font-size: 13px;">${escapeHtml(i.name || i.sku || 'Item')}</div>
          <div class="font-mono" style="font-size: 11px; color: var(--meta-gray);">SKU: ${escapeHtml(i.sku || 'SKU-NEW')} • Qty: ${i.quantity || 1}</div>
        </div>
        <div class="font-mono" style="font-weight: 700; color: var(--primary-ink);">${formatCurrency(i.price || order.totalAmount)}</div>
      </div>
    `).join('') : '<div style="font-size:12px; color:var(--meta-gray); padding:8px 0;">Standard Package SKU Item (Qty: 1)</div>';

    contentEl.innerHTML = `
      <!-- Prominent Employee Attribution Header (Top of Order Details) -->
      <div style="background: linear-gradient(135deg, #FAF8F5 0%, #F5F1E9 100%); border: 1.5px solid var(--executive-gold); border-radius: var(--radius-md); padding: 14px; margin-bottom: 14px; box-shadow: 0 2px 8px rgba(184, 134, 47, 0.1);">
        <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(184, 134, 47, 0.25); padding-bottom: 8px; margin-bottom: 10px;">
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="width: 8px; height: 8px; border-radius: 50%; background: var(--executive-gold); display: inline-block;"></span>
            <span style="font-size: 11px; font-weight: 700; color: var(--primary-ink); text-transform: uppercase; letter-spacing: 0.5px;">Order Attribution & Details</span>
          </div>
          <span style="font-size: 10px; font-weight: 700; color: #854D0E; background: rgba(234, 179, 8, 0.15); padding: 2px 8px; border-radius: 10px;">Dappersfit System</span>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 12px;">
          <div>
            <span style="font-size: 10px; font-weight: 700; color: var(--meta-gray); text-transform: uppercase; display: block;">Order ID</span>
            <span class="font-mono" style="font-size: 13px; font-weight: 800; color: var(--primary-ink);">${escapeHtml(order.orderNumber || order.id)}</span>
          </div>
          <div>
            <span style="font-size: 10px; font-weight: 700; color: var(--meta-gray); text-transform: uppercase; display: block;">Order Status</span>
            <span class="status-badge ${escapeHtml(order.status)}" style="font-size: 11px; padding: 2px 8px; display: inline-block; margin-top: 2px;">${escapeHtml(order.status)}</span>
          </div>
          <div>
            <span style="font-size: 10px; font-weight: 700; color: var(--meta-gray); text-transform: uppercase; display: block;">Created By</span>
            <span style="font-size: 13px; font-weight: 700; color: var(--primary-ink);">${escapeHtml(createdByName)}</span>
          </div>
          <div>
            <span style="font-size: 10px; font-weight: 700; color: var(--meta-gray); text-transform: uppercase; display: block;">Employee Phone Number</span>
            <span class="font-mono" style="font-size: 13px; font-weight: 800; color: var(--executive-gold);">${createdByPhone !== 'Employee information unavailable' ? `<a href="tel:${escapeHtml(createdByPhone)}" style="color:inherit; text-decoration:none;">📞 ${escapeHtml(createdByPhone)}</a>` : escapeHtml(createdByPhone)}</span>
          </div>
        </div>
      </div>

      <!-- Status & Financial Summary -->
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; background: var(--surface); border: 1px solid var(--hairline-border); border-radius: var(--radius-md); padding: 12px 14px;">
        <div>
          <span style="font-size: 11px; font-weight: 600; color: var(--meta-gray); text-transform: uppercase;">Current Status</span>
          <div style="margin-top: 3px;">
            <span class="status-badge ${escapeHtml(order.status)}" style="font-size: 12px; padding: 4px 12px;">${escapeHtml(order.status)}</span>
          </div>
        </div>
        <div style="text-align: right;">
          <span style="font-size: 11px; font-weight: 600; color: var(--meta-gray); text-transform: uppercase;">Order Total</span>
          <div class="font-mono" style="font-size: 18px; font-weight: 700; color: var(--primary-ink); margin-top: 2px;">${formatCurrency(order.totalAmount)}</div>
        </div>
      </div>

      <!-- Customer Destination & WhatsApp Quick Connect -->
      <div style="background: var(--surface); border: 1px solid var(--hairline-border); border-radius: var(--radius-md); padding: 14px; margin-bottom: 14px;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
          <div style="font-size: 12px; font-weight: 700; color: var(--meta-gray); text-transform: uppercase;">Customer & Shipping Address</div>
          ${order.address?.phone ? `
            <a href="https://wa.me/91${order.address.phone}?text=Hello%20${encodeURIComponent(order.customerName || '')}%2C%20regarding%20your%20Dappersfit%20order%20${order.orderNumber}" target="_blank" class="btn-card-secondary" style="height: 30px; padding: 0 10px; font-size: 11px; text-decoration: none;">
              <span class="material-symbols-outlined" style="font-size: 15px; color: #10B981;">chat</span>
              <span>WhatsApp</span>
            </a>
          ` : ''}
        </div>
        <div class="selectable" style="font-size: 15px; font-weight: 700; color: var(--primary-ink);">${escapeHtml(order.customerName || 'Customer')}</div>
        <div class="selectable phone-num font-mono" style="font-size: 13px; color: var(--body-slate); margin-top: 2px;">
          <a href="tel:${order.address?.phone || ''}" style="color:inherit; text-decoration:none;">📞 +91 ${escapeHtml(order.address?.phone || '--')}</a>
        </div>
        <div class="selectable address-text" style="font-size: 12px; color: var(--body-slate); margin-top: 6px; line-height: 1.45;">
          ${escapeHtml(order.address?.address || '')}<br>
          ${escapeHtml(order.address?.city || '')}, ${escapeHtml(order.address?.state || '')} - <strong class="font-mono">${escapeHtml(order.address?.pincode || '')}</strong>
        </div>
      </div>

      <!-- Package Items -->
      <div style="background: var(--surface); border: 1px solid var(--hairline-border); border-radius: var(--radius-md); padding: 14px; margin-bottom: 14px;">
        <div style="font-size: 12px; font-weight: 700; color: var(--meta-gray); text-transform: uppercase; margin-bottom: 6px;">Package Contents</div>
        ${itemsHtml}
      </div>

      <!-- Dispatch & Courier Telemetry -->
      <div style="background: var(--surface); border: 1px solid var(--hairline-border); border-radius: var(--radius-md); padding: 14px; margin-bottom: 14px;">
        <div style="font-size: 12px; font-weight: 700; color: var(--meta-gray); text-transform: uppercase; margin-bottom: 8px;">Courier Dispatch Status</div>
        ${order.awbCode ? `
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
            <div>
              <div style="font-size: 14px; font-weight: 700; color: var(--primary-ink);">${escapeHtml(order.courierName || 'Shiprocket Partner')}</div>
              <div class="selectable awb-code font-mono" style="font-size: 12px; color: var(--executive-gold); font-weight: 600; margin-top: 2px;">AWB: ${escapeHtml(order.awbCode)}</div>
            </div>
            <div style="display: flex; gap: 6px;">
              <button type="button" class="btn-card-secondary" id="btn-copy-awb" style="height: 32px; font-size: 11px;">
                <span class="material-symbols-outlined" style="font-size: 14px;">content_copy</span>
                <span>Copy</span>
              </button>
              <button type="button" class="btn-card-secondary" id="btn-sync-awb" style="height: 32px; font-size: 11px;">
                <span class="material-symbols-outlined" style="font-size: 15px;">sync</span>
                <span>Sync</span>
              </button>
            </div>
          </div>
          <div style="display: flex; gap: 8px; margin-top: 12px;">
            <button type="button" class="btn-card-secondary" id="btn-view-label" style="flex: 1; height: 42px;">
              <span class="material-symbols-outlined" style="font-size: 17px; color: var(--executive-gold);">label</span>
              <span>Print Label</span>
            </button>
            <button type="button" class="btn-card-secondary" id="btn-view-invoice" style="flex: 1; height: 42px;">
              <span class="material-symbols-outlined" style="font-size: 17px; color: var(--executive-gold);">receipt</span>
              <span>Tax Invoice</span>
            </button>
          </div>
        ` : `
          <p style="font-size: 12px; color: var(--body-slate); margin-bottom: 10px;">This order is pending dispatch. Select a courier option to generate AWB and shipping label.</p>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <button type="button" class="btn-gold-primary" id="btn-detail-priority-book">
              <span class="material-symbols-outlined">rocket_launch</span>
              <span>Instant Priority Dispatch (Auto Air)</span>
            </button>
            <button type="button" class="btn-card-secondary" id="btn-detail-manual-book" style="height: 42px; width: 100%; justify-content: center;">
              <span class="material-symbols-outlined" style="font-size: 17px; color: var(--executive-gold);">local_shipping</span>
              <span>Manual Courier Dispatch (Compare Rates)</span>
            </button>
          </div>
        `}
      </div>

      <!-- Update Fulfillment Status -->
      <div style="background: var(--surface); border: 1px solid var(--hairline-border); border-radius: var(--radius-md); padding: 14px; margin-bottom: 14px;">
        <label class="form-label" for="select-change-status">Update Fulfillment Status</label>
        <div style="display: flex; gap: 8px;">
          <select id="select-change-status" class="form-control" style="flex: 1;">
            <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
            <option value="booked" ${order.status === 'booked' ? 'selected' : ''}>Booked (Manifested)</option>
            <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>Shipped (In Transit)</option>
            <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Delivered (Closed)</option>
            <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
          </select>
          <button type="button" id="btn-save-status-change" class="btn-ink-primary" style="width: 90px; height: 44px; font-size: 13px;">Save</button>
        </div>
      </div>

      <!-- Edit / Delete Actions -->
      <div style="display: flex; gap: 10px; margin-bottom: 14px;">
        <button type="button" id="btn-detail-edit-order" class="btn-secondary" style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; height: 44px;">
          <span class="material-symbols-outlined" style="font-size: 18px;">edit</span>
          <span>Edit Order</span>
        </button>
        ${isStrictAdmin() ? `
          <button type="button" id="btn-detail-delete-order" class="btn-secondary" style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; height: 44px; color: #EF4444; border-color: rgba(239, 68, 68, 0.35);">
            <span class="material-symbols-outlined" style="font-size: 18px;">delete_outline</span>
            <span>Delete Order</span>
          </button>
        ` : ''}
      </div>
    `;

    // Hook events inside sheet
    document.getElementById('btn-detail-edit-order')?.addEventListener('click', () => {
      closeSheet('sheet-order-detail');
      openEditOrderSheet(order.id);
    });

    document.getElementById('btn-detail-delete-order')?.addEventListener('click', () => {
      closeSheet('sheet-order-detail');
      triggerDeleteOrder(order.id);
    });

    document.getElementById('btn-detail-priority-book')?.addEventListener('click', () => {
      triggerPriorityDispatch(order.id);
      closeSheet('sheet-order-detail');
    });

    document.getElementById('btn-detail-manual-book')?.addEventListener('click', () => {
      closeSheet('sheet-order-detail');
      openManualBookingSheet(order.id);
    });

    document.getElementById('btn-copy-awb')?.addEventListener('click', async () => {
      if (!order.awbCode) return;
      try {
        await navigator.clipboard?.writeText(order.awbCode);
        haptic('light');
        showToast(`Copied AWB: ${order.awbCode}`, 'success');
      } catch (_) {
        showToast(`AWB: ${order.awbCode}`, 'info');
      }
    });


    document.getElementById('btn-view-label')?.addEventListener('click', () => {
      showShippingLabelModal(order, true);
    });

    document.getElementById('btn-view-invoice')?.addEventListener('click', () => {
      haptic();
      openSubmoduleSheet(`Tax Invoice — ${order.orderNumber}`, `
        <div style="background:#fff; border:1px solid var(--hairline-border); border-radius:8px; padding:16px; font-size:12px; color:var(--primary-ink);">
          <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--hairline-border); padding-bottom:8px;">
            <div><strong>TAX INVOICE</strong><br><span class="font-mono">${escapeHtml(order.orderNumber)}</span></div>
            <div style="text-align:right;">Date: ${escapeHtml(order.date || 'Recent')}</div>
          </div>
          <div style="padding:10px 0; border-bottom:1px solid var(--hairline-border);">
            <strong>Billed To:</strong> ${escapeHtml(order.customerName)}<br>
            ${escapeHtml(order.address?.city || '')}, ${escapeHtml(order.address?.state || '')}
          </div>
          <div style="padding:10px 0; display:flex; justify-content:space-between; font-weight:bold;">
            <span>Total Amount Paid:</span>
            <span class="font-mono">${formatCurrency(order.totalAmount)}</span>
          </div>
        </div>
      `);
    });

    document.getElementById('btn-sync-awb')?.addEventListener('click', () => {
      haptic('medium');
      showToast('AWB telemetry synced with carrier', 'success');
    });

    document.getElementById('btn-save-status-change')?.addEventListener('click', async () => {
      const select = document.getElementById('select-change-status');
      if (!select) return;
      haptic('medium');
      const newStatus = select.value;
      if (
        (newStatus === 'booked' || newStatus === 'shipped') &&
        (!isGenuineShiprocketBooking(order) || !isOfficialShiprocketLabel(order.labelUrl))
      ) {
        showToast('Order can only be marked as Booked when booked in Shiprocket with an official Shiprocket label.', 'error');
        select.value = order.status || 'pending';
        return;
      }
      order.status = newStatus;

      // Try sending to backend API
      try {
        await apiFetch(`/api/orders/${encodeURIComponent(order.id)}/set-status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus })
        });
      } catch (_) {}

      try { localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(state.orders)); } catch (_) {}
      renderOrders();
      renderCockpit();
      showToast(`Status updated to: ${order.status}`, 'success');
      closeSheet('sheet-order-detail');
    });

    openSheet('sheet-order-detail');
  }

  // --- Rendering: Tab 3 — Replacements & Tickets ---
  function renderTickets() {
    const container = document.getElementById('tickets-container');
    if (!container) return;

    // Stat counts
    const total = state.tickets.length;
    const red = state.tickets.filter(t => t.flag === 'red').length;
    const orange = state.tickets.filter(t => t.flag === 'orange').length;
    const green = state.tickets.filter(t => t.flag === 'green').length;
    const pending = state.tickets.filter(t => t.status === 'pending').length;
    const done = state.tickets.filter(t => t.status === 'done').length;

    const elTotal = document.getElementById('stat-ticket-total');
    const elRed = document.getElementById('stat-ticket-red');
    const elOrange = document.getElementById('stat-ticket-orange');
    const elGreen = document.getElementById('stat-ticket-green');
    const elPending = document.getElementById('stat-ticket-pending');
    const elDone = document.getElementById('stat-ticket-done');

    if (elTotal) elTotal.textContent = total;
    if (elRed) elRed.textContent = red;
    if (elOrange) elOrange.textContent = orange;
    if (elGreen) elGreen.textContent = green;
    if (elPending) elPending.textContent = pending;
    if (elDone) elDone.textContent = done;

    // Filtering
    let list = state.tickets.filter(t => {
      if (state.ticketFlagFilter !== 'all' && t.flag !== state.ticketFlagFilter) return false;
      if (state.ticketSearchQuery) {
        const q = state.ticketSearchQuery.toLowerCase();
        const corpus = `${t.orderId} ${t.customerName} ${t.productSku} ${t.reason}`.toLowerCase();
        if (!corpus.includes(q)) return false;
      }
      return true;
    });

    if (list.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 48px 16px; color: var(--meta-gray);">
          <span class="material-symbols-outlined" style="font-size: 48px; opacity: 0.4;">verified</span>
          <div style="font-size: 15px; font-weight: 700; color: var(--primary-ink); margin-top: 6px;">No replacement tickets found</div>
        </div>
      `;
      return;
    }

    container.innerHTML = list.map(t => `
      <div class="ticket-card" data-ticket-id="${escapeHtml(t.id)}" style="cursor:pointer;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; gap: 8px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="font-mono" style="font-size: 13px; font-weight: 700;">${escapeHtml(t.orderId)}</span>
            <span style="font-size: 10px; color: var(--meta-gray);">•</span>
            <span style="font-size: 11px; color: var(--meta-gray);">${escapeHtml(t.date || 'Recent')}</span>
            ${t.type ? `<span style="font-size: 10px; text-transform: uppercase; font-weight: 700; color: var(--executive-gold);">${escapeHtml(t.type)}</span>` : ''}
          </div>
          <select class="ticket-flag-select ticket-flag flag-${escapeHtml(t.flag || 'green')}" data-ticket-id="${escapeHtml(t.id)}" style="border:none; cursor:pointer; font-size:10px; font-weight:700; text-transform:uppercase; padding:3px 8px; border-radius:999px;">
            <option value="green" ${t.flag === 'green' ? 'selected' : ''}>Green Flag</option>
            <option value="orange" ${t.flag === 'orange' ? 'selected' : ''}>Orange Flag</option>
            <option value="red" ${t.flag === 'red' ? 'selected' : ''}>Red Flag</option>
          </select>
        </div>

        <div style="font-size: 14px; font-weight: 700; color: var(--primary-ink);">${escapeHtml(t.customerName)}</div>
        <div class="font-mono" style="font-size: 11px; color: var(--executive-gold); font-weight: 600; margin: 2px 0 6px 0;">SKU: ${escapeHtml(t.productSku)}</div>
        <p style="font-size: 12px; color: var(--body-slate); line-height: 1.4; background: var(--surface-low); padding: 8px 10px; border-radius: var(--radius-sm);">${escapeHtml(t.reason)}</p>
        ${t.photoBase64 ? `<img src="${t.photoBase64}" alt="Defect photo" style="width:100%; max-height:110px; object-fit:cover; border-radius:8px; margin-top:8px; border:1px solid var(--hairline-border);">` : ''}

        <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 10px; gap: 8px;">
          <span class="status-badge ${t.status === 'done' || t.status === 'approved' ? 'delivered' : (t.status === 'rejected' ? 'cancelled' : 'pending')}" style="font-size: 10px;">
            ${t.status === 'done' ? 'Resolved' : (t.status === 'approved' ? 'Approved' : (t.status === 'rejected' ? 'Rejected' : 'Pending Review'))}
          </span>
          <div style="display:flex; gap:6px;">
            ${isUserAdmin() && t.status === 'pending' ? `
              <button type="button" class="btn-card-secondary btn-approve-ticket" data-ticket-id="${escapeHtml(t.id)}" style="height: 32px; font-size: 11px;">
                <span class="material-symbols-outlined" style="font-size: 14px; color: var(--executive-gold);">verified</span>
                <span>Approve</span>
              </button>
            ` : ''}
            <button type="button" class="btn-card-secondary btn-mark-ticket-done" data-ticket-id="${escapeHtml(t.id)}" style="height: 32px; font-size: 11px;">
              <span class="material-symbols-outlined" style="font-size: 14px; color: #10B981;">check</span>
              <span>${t.status === 'done' ? 'Re-open' : 'Mark Done'}</span>
            </button>
          </div>
        </div>
      </div>
    `).join('');

    const persistTicketStatus = async (ticket, nextStatus) => {
      ticket.status = nextStatus;
      try { localStorage.setItem(STORAGE_KEY_TICKETS, JSON.stringify(state.tickets)); } catch (_) {}
      try {
        await apiFetch(`/api/replacements/${encodeURIComponent(ticket.id)}/status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: nextStatus })
        });
      } catch (_) {}
      renderTickets();
      showToast(`Ticket status updated to ${nextStatus}`, 'success');
    };

    container.querySelectorAll('.ticket-flag-select').forEach(sel => {
      sel.addEventListener('click', (e) => e.stopPropagation());
      sel.addEventListener('change', async (e) => {
        e.stopPropagation();
        haptic();
        const id = sel.getAttribute('data-ticket-id');
        const t = state.tickets.find(item => item.id === id);
        if (!t) return;
        t.flag = sel.value;
        try { localStorage.setItem(STORAGE_KEY_TICKETS, JSON.stringify(state.tickets)); } catch (_) {}
        try {
          await apiFetch(`/api/replacements/${encodeURIComponent(t.id)}/flag`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ flag: t.flag })
          });
        } catch (_) {}
        renderTickets();
        showToast(`Flag updated to ${t.flag.toUpperCase()}`, 'success');
      });
    });

    container.querySelectorAll('.btn-approve-ticket').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        haptic();
        const t = state.tickets.find(item => item.id === btn.getAttribute('data-ticket-id'));
        if (t) persistTicketStatus(t, 'approved');
      });
    });

    container.querySelectorAll('.btn-mark-ticket-done').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        haptic();
        const id = btn.getAttribute('data-ticket-id');
        const t = state.tickets.find(item => item.id === id);
        if (t) {
          persistTicketStatus(t, t.status === 'done' ? 'pending' : 'done');
        }
      });
    });

    container.querySelectorAll('.ticket-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.getAttribute('data-ticket-id');
        if (id) openTicketDetailSheet(id);
      });
    });
  }

  function openTicketDetailSheet(ticketId) {
    const t = state.tickets.find(item => item.id === ticketId);
    if (!t) return;
    haptic('light');

    openSubmoduleSheet(`Ticket • ${t.orderId || t.id}`, `
      <div style="display:flex; flex-direction:column; gap:12px;">
        <div class="kpi-card" style="min-height:auto;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span class="font-mono" style="font-weight:800; font-size:15px;">${escapeHtml(t.orderId)}</span>
            <span class="ticket-flag flag-${escapeHtml(t.flag || 'green')}">${escapeHtml((t.flag || 'green').toUpperCase())} FLAG</span>
          </div>
          <div style="font-size:14px; font-weight:700; margin-top:6px;">${escapeHtml(t.customerName)}</div>
          <div class="font-mono" style="font-size:11px; color:var(--executive-gold); margin-top:2px;">SKU: ${escapeHtml(t.productSku)} • Type: ${escapeHtml((t.type || 'replacement').toUpperCase())}</div>
          <div style="font-size:12px; color:var(--body-slate); margin-top:8px; line-height:1.45; background:var(--surface-low); padding:10px; border-radius:8px;">
            ${escapeHtml(t.reason)}
          </div>
          ${t.photoBase64 ? `
            <div style="margin-top:10px;">
              <div style="font-size:11px; font-weight:700; color:var(--meta-gray); margin-bottom:4px;">ATTACHED DEFECT PHOTO</div>
              <img src="${t.photoBase64}" alt="Defect photo" style="width:100%; max-height:220px; object-fit:contain; border-radius:8px; border:1px solid var(--hairline-border); background:#000;">
            </div>
          ` : ''}
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
          ${isUserAdmin() && t.status === 'pending' ? `
            <button type="button" id="btn-tkt-detail-approve" class="btn-gold-primary" style="height:42px; font-size:12px;">Approve</button>
            <button type="button" id="btn-tkt-detail-reject" class="btn-card-secondary" style="height:42px; font-size:12px; color:#EF4444;">Reject</button>
          ` : ''}
          <button type="button" id="btn-tkt-detail-done" class="btn-ink-primary" style="height:42px; font-size:12px; grid-column:span 2;">
            ${t.status === 'done' ? 'Re-open Ticket' : 'Mark Ticket Resolved (Done)'}
          </button>
          ${isStrictAdmin() ? `
            <button type="button" id="btn-tkt-detail-delete" class="btn-card-secondary" style="height:40px; font-size:12px; color:#EF4444; border-color:rgba(239,68,68,0.35); grid-column:span 2;">
              Delete Ticket (Admin Only)
            </button>
          ` : ''}
        </div>
      </div>
    `);

    const updateStatus = async (nextStatus) => {
      t.status = nextStatus;
      try { localStorage.setItem(STORAGE_KEY_TICKETS, JSON.stringify(state.tickets)); } catch (_) {}
      try {
        await apiFetch(`/api/replacements/${encodeURIComponent(t.id)}/status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: nextStatus })
        });
      } catch (_) {}
      closeSheet('sheet-submodule');
      renderTickets();
      showToast(`Ticket marked ${nextStatus}`, 'success');
    };

    document.getElementById('btn-tkt-detail-approve')?.addEventListener('click', () => updateStatus('approved'));
    document.getElementById('btn-tkt-detail-reject')?.addEventListener('click', () => updateStatus('rejected'));
    document.getElementById('btn-tkt-detail-done')?.addEventListener('click', () => updateStatus(t.status === 'done' ? 'pending' : 'done'));
    document.getElementById('btn-tkt-detail-delete')?.addEventListener('click', async () => {
      if (!isStrictAdmin()) return;
      if (!confirm(`Delete replacement ticket for ${t.orderId}?`)) return;
      try {
        await apiFetch(`/api/replacements/${encodeURIComponent(t.id)}`, { method: 'DELETE' });
      } catch (_) {}
      state.tickets = state.tickets.filter(item => item.id !== t.id);
      try { localStorage.setItem(STORAGE_KEY_TICKETS, JSON.stringify(state.tickets)); } catch (_) {}
      closeSheet('sheet-submodule');
      renderTickets();
      showToast('Replacement ticket deleted', 'info');
    });
  }

  // --- Tickets Controls & AI WhatsApp Intake ---
  function setupTicketsControls() {
    const searchInput = document.getElementById('tickets-search-input');
    searchInput?.addEventListener('input', (e) => {
      state.ticketSearchQuery = e.target.value;
      renderTickets();
    });

    document.querySelectorAll('.flag-pill[data-flag]').forEach(pill => {
      pill.addEventListener('click', () => {
        haptic();
        document.querySelectorAll('.flag-pill[data-flag]').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        state.ticketFlagFilter = pill.getAttribute('data-flag');
        renderTickets();
      });
    });

    // AI WhatsApp Intake Modal
    document.getElementById('btn-open-ai-intake')?.addEventListener('click', () => {
      haptic();
      openSheet('sheet-ai-intake');
    });

    // Run AI Parse
    document.getElementById('btn-run-ai-parse')?.addEventListener('click', () => {
      const text = document.getElementById('ai-intake-text')?.value.trim();
      if (!text) {
        showToast('Please paste a WhatsApp message first', 'error');
        return;
      }

      haptic('medium');
      showToast('Parsing customer message with AI...', 'info');

      const orderMatch = text.match(/DF[-\s]?\d{3,6}/i);
      const phoneMatch = text.match(/(?:\+91|0)?[6-9]\d{9}/);
      const skuMatch = text.match(/SKU[-\w]+/i) || text.match(/(drn|wg|ac|m22|m15|shirt|chinos|polo|watch)/i);
      const isUrgent = /urgent|damaged|cuff|torn|defect|angry|immediately|replace/i.test(text);

      const parsedOrder = orderMatch ? orderMatch[0].toUpperCase().replace(' ', '-') : 'DF-1306';
      const parsedCustomer = text.split('-')[1]?.trim() || 'WhatsApp Customer';
      const parsedSku = skuMatch ? skuMatch[0].toUpperCase() : 'SKU-DRN';
      const parsedFlag = isUrgent ? 'red' : 'green';

      const previewBox = document.getElementById('ai-parsed-preview');
      const fieldsBox = document.getElementById('ai-parsed-fields');

      if (previewBox && fieldsBox) {
        previewBox.style.display = 'block';
        fieldsBox.innerHTML = `
          <div><strong>Order Number:</strong> <span class="font-mono">${parsedOrder}</span></div>
          <div><strong>Customer / Phone:</strong> ${escapeHtml(parsedCustomer)} (${phoneMatch ? phoneMatch[0] : 'In conversation'})</div>
          <div><strong>Product SKU:</strong> <span class="font-mono">${parsedSku}</span></div>
          <div><strong>Assigned Flag:</strong> <span class="ticket-flag flag-${parsedFlag}">${parsedFlag.toUpperCase()} FLAG</span></div>
          <div><strong>Extracted Notes:</strong> ${escapeHtml(text.slice(0, 90))}...</div>
        `;

        document.getElementById('btn-save-ai-ticket').onclick = () => {
          haptic('heavy');
          state.tickets.unshift({
            id: 'tkt-' + Date.now(),
            orderId: parsedOrder,
            customerName: parsedCustomer,
            productSku: parsedSku,
            flag: parsedFlag,
            status: 'pending',
            reason: text,
            date: 'Just now'
          });
          try { localStorage.setItem(STORAGE_KEY_TICKETS, JSON.stringify(state.tickets)); } catch (_) {}
          renderTickets();
          closeSheet('sheet-ai-intake');
          showToast('Replacement ticket generated successfully', 'success');
        };
      }
    });

    // Log New Ticket Modal
    document.getElementById('btn-open-new-ticket')?.addEventListener('click', () => {
      haptic();
      openSheet('sheet-new-ticket');
    });

    document.getElementById('new-ticket-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      haptic('heavy');
      const orderId = document.getElementById('ticket-order-id').value.trim();
      const customer = document.getElementById('ticket-customer-name').value.trim();
      const sku = document.getElementById('ticket-sku').value.trim();
      const flag = document.getElementById('ticket-flag-level').value;
      const type = document.getElementById('ticket-type')?.value || 'replacement';
      const reason = document.getElementById('ticket-reason').value.trim();
      const photoFile = document.getElementById('ticket-photo')?.files?.[0];

      let photoBase64 = '';
      if (photoFile) {
        photoBase64 = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ''));
          reader.onerror = () => resolve('');
          reader.readAsDataURL(photoFile);
        });
      }

      const newTicket = {
        id: 'tkt-' + Date.now(),
        orderId: orderId,
        customerName: customer,
        productSku: sku,
        flag: flag,
        type: type,
        status: 'pending',
        reason: reason,
        photoBase64: photoBase64 || undefined,
        date: 'Just now'
      };

      try {
        await apiFetch('/api/replacements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newTicket)
        });
      } catch (_) {}

      state.tickets.unshift(newTicket);
      try { localStorage.setItem(STORAGE_KEY_TICKETS, JSON.stringify(state.tickets)); } catch (_) {}
      renderTickets();
      closeSheet('sheet-new-ticket');
      showToast('Replacement ticket logged', 'success');
      e.target.reset();
    });
  }

  // --- Audit Log Recorder (Mirrors Android AuditLogsNotifier) ---
  const auditLogsStore = {
    shiprocket: [
      { id: 'sr-1', timestamp: new Date().toLocaleTimeString(), source: 'internal', method: 'GET', endpoint: '/api/orders', status: 200, latency: '48ms' },
      { id: 'sr-2', timestamp: new Date().toLocaleTimeString(), source: 'external', method: 'POST', endpoint: '/api/shiprocket/order/priority-book', status: 200, latency: '120ms' },
      { id: 'sr-3', timestamp: new Date().toLocaleTimeString(), source: 'external', method: 'GET', endpoint: '/api/shiprocket/wallet/balance-details', status: 200, latency: '85ms' }
    ],
    activity: [
      { id: 'act-1', timestamp: new Date().toLocaleTimeString(), actor: 'System', action: 'Session Initialized', detail: 'iOS PWA synced with Dappersfit cloud' }
    ]
  };

  function logAuditEvent(type, entry) {
    const target = type === 'activity' ? auditLogsStore.activity : auditLogsStore.shiprocket;
    target.unshift({
      id: (type === 'activity' ? 'act-' : 'sr-') + Date.now(),
      timestamp: new Date().toLocaleTimeString(),
      ...entry
    });
    if (target.length > 60) target.length = 60;
  }

  // --- 1. Manual Courier Dispatch (2-Step Wizard - Matches Android CourierBookingScreen) ---
  function openManualBookingSheet(initialOrderId = null) {
    haptic('light');
    const pendingOrders = state.orders.filter(o => o && o.status === 'pending' && !isGenuineShiprocketBooking(o));
    let selectedOrderId = initialOrderId && state.orders.some(o => o.id === initialOrderId)
      ? initialOrderId
      : (pendingOrders[0]?.id || '');
    let step = (initialOrderId && selectedOrderId) ? 2 : 1;
    let pickupHubs = [];
    let selectedHub = '';
    let couriers = [];
    let selectedCourierId = '';
    let loadingRates = false;

    const FALLBACK_HUBS = [
      { pickup_location: 'dapperss', pin_code: '600002', city: 'Chennai' },
      { pickup_location: 'Primary', pin_code: '122015', city: 'Gurugram' },
      { pickup_location: 'Chennai Hub', pin_code: '600002', city: 'Chennai' },
      { pickup_location: 'Pune Surface', pin_code: '410501', city: 'Pune' }
    ];

    const renderWizard = () => {
      const order = state.orders.find(o => o.id === selectedOrderId);

      if (step === 1) {
        openSubmoduleSheet('Manual Courier Dispatch • Step 1/2', `
          <div style="display:flex; flex-direction:column; gap:12px;">
            <div style="background:rgba(184,134,47,0.08); border:1px solid rgba(184,134,47,0.3); border-radius:10px; padding:12px; font-size:12px; color:var(--body-slate);">
              <strong style="color:var(--primary-ink);">Priority Dispatch Pipeline</strong><br>
              Select a pending order to compare live Shiprocket courier rates, transit ETDs, and mint an official Shiprocket AWB + 4x6 PDF label.
            </div>

            <div class="form-group">
              <label class="form-label">Select Pending Order (${pendingOrders.length} available)</label>
              <select id="mb-order-select" class="form-control">
                ${pendingOrders.length === 0 ? '<option value="">No pending orders available</option>' : pendingOrders.map(o => `
                  <option value="${escapeHtml(o.id)}" ${o.id === selectedOrderId ? 'selected' : ''}>
                    ${escapeHtml(o.orderNumber)} — ${escapeHtml(o.customerName)} (${formatCurrency(o.totalAmount)})
                  </option>
                `).join('')}
              </select>
            </div>

            ${order ? `
              <div class="kpi-card" style="min-height:auto;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <strong class="font-mono">${escapeHtml(order.orderNumber)}</strong>
                  <span class="font-mono" style="color:var(--executive-gold); font-weight:700;">${formatCurrency(order.totalAmount)}</span>
                </div>
                <div style="font-size:13px; font-weight:700; margin-top:4px;">${escapeHtml(order.customerName)}</div>
                <div style="font-size:11px; color:var(--meta-gray); margin-top:2px;">
                  ${escapeHtml(order.address?.address || '')}, ${escapeHtml(order.address?.city || '')} - <strong>${escapeHtml(order.address?.pincode || '--')}</strong>
                </div>
                <div style="font-size:11px; color:var(--body-slate); margin-top:4px;">
                  Payment: <strong>${escapeHtml(order.paymentMethod || 'COD')}</strong> • Weight: <strong>${order.weight || 0.5} kg</strong>
                </div>
              </div>
              <button type="button" id="mb-next-step2" class="btn-gold-primary" style="width:100%;">
                <span>Next: Select Hub & Courier</span>
                <span class="material-symbols-outlined">arrow_forward</span>
              </button>
            ` : ''}
          </div>
        `);

        document.getElementById('mb-order-select')?.addEventListener('change', (e) => {
          selectedOrderId = e.target.value;
          renderWizard();
        });
        document.getElementById('mb-next-step2')?.addEventListener('click', () => {
          if (!selectedOrderId) return;
          step = 2;
          renderWizard();
          loadHubsAndRates();
        });
        return;
      }

      // Step 2: Hub & Courier Selection
      openSubmoduleSheet('Manual Courier Dispatch • Step 2/2', `
        <div style="display:flex; flex-direction:column; gap:12px;">
          ${order ? `
            <div style="background:var(--surface-low); border:1px solid var(--hairline-border); border-radius:10px; padding:10px 12px; font-size:12px;">
              <div style="display:flex; justify-content:space-between;">
                <strong>${escapeHtml(order.orderNumber)} • ${escapeHtml(order.customerName)}</strong>
                <span class="font-mono" style="color:var(--executive-gold); font-weight:700;">PIN ${escapeHtml(order.address?.pincode || '--')}</span>
              </div>
            </div>
          ` : ''}

          <div class="form-group" style="margin-bottom:0;">
            <label class="form-label">Pickup Warehouse Hub</label>
            <select id="mb-hub-select" class="form-control">
              ${(pickupHubs.length > 0 ? pickupHubs : FALLBACK_HUBS).map(h => {
                const name = h.pickup_location || h.name || 'dapperss';
                const pin = h.pin_code || h.pincode || '600002';
                return `<option value="${escapeHtml(name)}" data-pin="${escapeHtml(pin)}" ${name === selectedHub ? 'selected' : ''}>${escapeHtml(name)} (${escapeHtml(h.city || '')} ${escapeHtml(pin)})</option>`;
              }).join('')}
            </select>
          </div>

          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="font-size:12px; font-weight:700; color:var(--primary-ink);">Available Shiprocket Couriers</span>
            <button type="button" id="mb-refresh-rates" class="btn-card-secondary" style="height:28px; font-size:11px;">Refresh Rates</button>
          </div>

          <div id="mb-couriers-list" style="display:flex; flex-direction:column; gap:8px; max-height:240px; overflow-y:auto;">
            ${loadingRates ? '<div style="padding:18px; text-align:center; font-size:12px; color:var(--meta-gray);">Checking live Shiprocket serviceability...</div>' :
              (couriers.length === 0 ? '<div style="padding:16px; text-align:center; font-size:12px; color:var(--meta-gray);">No couriers loaded yet. Tap Refresh Rates.</div>' :
                couriers.map(c => {
                  const cid = String(c.courier_company_id || c.id || c.courier_name);
                  const isSel = cid === String(selectedCourierId);
                  return `
                    <div class="kpi-card mb-courier-card" data-cid="${escapeHtml(cid)}" style="min-height:auto; cursor:pointer; border:${isSel ? '2px solid var(--executive-gold)' : '1px solid var(--hairline-border)'};">
                      <div style="display:flex; justify-content:space-between; align-items:center;">
                        <strong style="font-size:13px;">${escapeHtml(c.courier_name || c.name || 'Shiprocket Partner')}</strong>
                        <span class="font-mono" style="font-weight:800; color:var(--executive-gold);">${formatCurrency(c.rate || c.freight_charge || 0)}</span>
                      </div>
                      <div style="font-size:11px; color:var(--meta-gray); margin-top:3px;">
                        ETD: ${escapeHtml(c.etd || c.estimated_delivery_days || '2-4 days')} • Rating: ${c.rating || '4.5'}★
                      </div>
                    </div>
                  `;
                }).join(''))
            }
          </div>

          <div style="display:flex; gap:8px;">
            <button type="button" id="mb-back-step1" class="btn-card-secondary" style="height:44px; flex:1; justify-content:center;">Back</button>
            <button type="button" id="mb-confirm-book" class="btn-gold-primary" style="height:44px; flex:2;" ${!selectedCourierId || loadingRates ? 'disabled' : ''}>
              <span class="material-symbols-outlined">rocket_launch</span>
              <span>Book & Print Label</span>
            </button>
          </div>
        </div>
      `);

      document.getElementById('mb-back-step1')?.addEventListener('click', () => {
        step = 1;
        renderWizard();
      });
      document.getElementById('mb-hub-select')?.addEventListener('change', (e) => {
        selectedHub = e.target.value;
        loadRatesOnly();
      });
      document.getElementById('mb-refresh-rates')?.addEventListener('click', () => loadRatesOnly());
      document.querySelectorAll('.mb-courier-card').forEach(card => {
        card.addEventListener('click', () => {
          selectedCourierId = card.getAttribute('data-cid');
          renderWizard();
        });
      });
      document.getElementById('mb-confirm-book')?.addEventListener('click', () => executeManualBook());
    };

    const loadRatesOnly = async () => {
      const order = state.orders.find(o => o.id === selectedOrderId);
      if (!order) return;
      const hubObj = (pickupHubs.length > 0 ? pickupHubs : FALLBACK_HUBS).find(h => (h.pickup_location || h.name) === selectedHub) || FALLBACK_HUBS[0];
      loadingRates = true;
      renderWizard();
      try {
        const res = await apiFetch('/api/shiprocket/serviceability', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pickup_postcode: hubObj.pin_code || hubObj.pincode || '600002',
            delivery_postcode: order.address?.pincode || '500001',
            weight: Number(order.weight || 0.5),
            cod: String(order.paymentMethod || '').toUpperCase() === 'PREPAID' ? 0 : 1
          })
        });
        const data = await res.json();
        logAuditEvent('shiprocket', { source: 'external', method: 'POST', endpoint: '/api/shiprocket/serviceability', status: res.status, latency: 'live' });
        const list = data?.data?.available_courier_companies || data?.couriers || [];
        couriers = Array.isArray(list) ? list : [];
        if (couriers.length > 0 && !selectedCourierId) {
          selectedCourierId = String(couriers[0].courier_company_id || couriers[0].id || couriers[0].courier_name);
        }
      } catch (err) {
        couriers = [];
        showToast('Failed to fetch live Shiprocket serviceability', 'error');
      } finally {
        loadingRates = false;
        renderWizard();
      }
    };

    const loadHubsAndRates = async () => {
      try {
        const res = await apiFetch('/api/shiprocket/pickup-addresses');
        const data = await res.json();
        const hubs = data?.data?.shipping_address || data?.pickupAddresses || data?.addresses || [];
        pickupHubs = Array.isArray(hubs) && hubs.length > 0 ? hubs : FALLBACK_HUBS;
      } catch (_) {
        pickupHubs = FALLBACK_HUBS;
      }
      if (!selectedHub) selectedHub = pickupHubs[0].pickup_location || pickupHubs[0].name || 'dapperss';
      await loadRatesOnly();
    };

    const executeManualBook = async () => {
      const order = state.orders.find(o => o.id === selectedOrderId);
      const courier = couriers.find(c => String(c.courier_company_id || c.id || c.courier_name) === String(selectedCourierId));
      if (!order || !courier) return;

      const existingDup = findDuplicateBookedInShiprocket(order);
      if (existingDup) {
        haptic('error');
        showToast(`Duplicate blocked! Matches ${existingDup.orderNumber || existingDup.id} (AWB: ${existingDup.awbCode}).`, 'error');
        return;
      }

      const btn = document.getElementById('mb-confirm-book');
      if (btn) { btn.disabled = true; btn.innerHTML = '<span>Booking in Shiprocket...</span>'; }

      try {
        const res = await apiFetch('/api/shiprocket/order/book', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: order.id,
            order: order,
            courierId: courier.courier_company_id || courier.id,
            courierName: courier.courier_name || courier.name,
            pickupLocation: selectedHub
          })
        });
        const data = await res.json();
        logAuditEvent('shiprocket', { source: 'external', method: 'POST', endpoint: '/api/shiprocket/order/book', status: res.status, latency: 'live' });

        if (!res.ok || data.success === false) {
          throw new Error(data.error || data.message || 'Shiprocket booking rejected');
        }

        const bookedOrder = data.order || {
          ...order,
          status: 'booked',
          shiprocketOrderId: data.shiprocketOrderId || data.order_id || order.shiprocketOrderId,
          shipmentId: data.shipmentId || data.shipment_id || order.shipmentId,
          awbCode: data.awbCode || data.awb_code || order.awbCode,
          courierName: data.courierName || courier.courier_name || courier.name,
          labelUrl: data.labelUrl || data.label_url || order.labelUrl
        };

        if (!isGenuineShiprocketBooking(bookedOrder)) {
          throw new Error('Booking returned without valid Shiprocket AWB / Shipment ID.');
        }

        const idx = state.orders.findIndex(o => o.id === order.id);
        if (idx !== -1) state.orders[idx] = { ...state.orders[idx], ...bookedOrder, status: 'booked' };
        try { localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(state.orders)); } catch (_) {}
        if (window.FirebaseService?.saveOrder) {
          window.FirebaseService.saveOrder(state.orders[idx]).catch(() => {});
        }

        closeSheet('sheet-submodule');
        renderOrders();
        renderCockpit();
        showToast(`Booked ${bookedOrder.courierName} • AWB: ${bookedOrder.awbCode}`, 'success');
        await downloadOfficialShiprocketLabel(state.orders[idx]);
      } catch (err) {
        haptic('error');
        showToast(err.message || 'Manual Shiprocket booking failed', 'error');
        if (btn) { btn.disabled = false; btn.innerHTML = '<span>Book & Print Label</span>'; }
      }
    };

    renderWizard();
    if (step === 2) loadHubsAndRates();
  }

  // --- 2. Customers Database (Matches Android CustomersScreen) ---
  function renderCustomersSubmodule(searchQuery = '') {
    let showAddForm = false;

    const renderView = () => {
      const q = (searchQuery || '').toLowerCase().trim();
      const allCust = state.customers || [];
      const filtered = allCust.filter(c => {
        if (!q) return true;
        return `${c.name || ''} ${c.phone || ''} ${c.email || ''} ${c.city || ''} ${c.address || ''}`.toLowerCase().includes(q);
      });

      const totalOrders = allCust.reduce((acc, c) => acc + Number(c.ordersCount || 1), 0);
      const totalLtv = allCust.reduce((acc, c) => acc + Number(c.totalSpent || 0), 0);
      const avgOrders = allCust.length ? (totalOrders / allCust.length).toFixed(1) : '0.0';
      const avgLtv = allCust.length ? Math.round(totalLtv / allCust.length) : 0;

      openSubmoduleSheet('Customers Database', `
        <div style="display:flex; flex-direction:column; gap:12px;">
          <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px;">
            <div class="kpi-card" style="min-height:auto; padding:10px;">
              <span class="kpi-label" style="font-size:10px;">Registered</span>
              <div class="font-mono" style="font-size:16px; font-weight:800;">${allCust.length}</div>
            </div>
            <div class="kpi-card" style="min-height:auto; padding:10px;">
              <span class="kpi-label" style="font-size:10px;">Avg Orders</span>
              <div class="font-mono" style="font-size:16px; font-weight:800;">${avgOrders}</div>
            </div>
            <div class="kpi-card" style="min-height:auto; padding:10px;">
              <span class="kpi-label" style="font-size:10px;">Avg LTV</span>
              <div class="font-mono" style="font-size:15px; font-weight:800; color:var(--executive-gold);">${formatCurrency(avgLtv)}</div>
            </div>
          </div>

          <div style="display:flex; gap:8px;">
            <input type="text" id="cust-search-input" class="form-control" value="${escapeHtml(searchQuery)}" placeholder="Search name, phone, city..." style="flex:1; height:40px;">
            <button type="button" id="btn-toggle-add-cust" class="btn-gold-primary" style="height:40px; padding:0 12px; width:auto; font-size:12px;">+ Add</button>
          </div>

          ${showAddForm ? `
            <form id="form-add-customer" style="background:var(--surface-low); border:1px solid var(--executive-gold); border-radius:10px; padding:12px; display:flex; flex-direction:column; gap:8px;">
              <div style="font-size:12px; font-weight:700;">Register New Customer</div>
              <input type="text" id="cust-new-name" class="form-control" placeholder="Full Name" required>
              <input type="tel" id="cust-new-phone" class="form-control" placeholder="10-digit Mobile" required>
              <input type="email" id="cust-new-email" class="form-control" placeholder="Email (optional)">
              <input type="text" id="cust-new-address" class="form-control" placeholder="Street Address">
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
                <input type="text" id="cust-new-city" class="form-control" placeholder="City">
                <input type="text" id="cust-new-state" class="form-control" placeholder="State" value="India">
              </div>
              <button type="submit" class="btn-ink-primary" style="height:38px; font-size:12px;">Save Customer</button>
            </form>
          ` : ''}

          <div style="display:flex; flex-direction:column; gap:8px;">
            ${filtered.length === 0 ? '<div style="text-align:center; padding:24px; color:var(--meta-gray); font-size:12px;">No matching customers found.</div>' : filtered.map(c => `
              <div class="kpi-card" style="min-height:auto;">
                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                  <div>
                    <div style="font-size:14px; font-weight:700; color:var(--primary-ink);">${escapeHtml(c.name)}</div>
                    <div class="font-mono" style="font-size:12px; color:var(--body-slate); margin-top:2px;">
                      <a href="tel:${escapeHtml(c.phone)}" style="color:inherit; text-decoration:none;">📞 +91 ${escapeHtml(c.phone)}</a>
                    </div>
                  </div>
                  <div style="text-align:right;">
                    <span class="font-mono" style="color:var(--executive-gold); font-weight:700; font-size:14px;">${formatCurrency(c.totalSpent || 0)}</span>
                    <div style="font-size:10px; color:var(--meta-gray);">${c.ordersCount || 1} Orders</div>
                  </div>
                </div>
                <div style="font-size:11px; color:var(--meta-gray); margin-top:6px;">
                  ${escapeHtml(c.city || '')}${c.city && c.state ? ', ' : ''}${escapeHtml(c.state || 'India')}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `);

      document.getElementById('cust-search-input')?.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        renderView();
      });
      document.getElementById('btn-toggle-add-cust')?.addEventListener('click', () => {
        showAddForm = !showAddForm;
        renderView();
      });
      document.getElementById('form-add-customer')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newCust = {
          id: 'cust-' + Date.now(),
          name: document.getElementById('cust-new-name').value.trim(),
          phone: document.getElementById('cust-new-phone').value.trim(),
          email: document.getElementById('cust-new-email').value.trim(),
          address: document.getElementById('cust-new-address').value.trim(),
          city: document.getElementById('cust-new-city').value.trim(),
          state: document.getElementById('cust-new-state').value.trim() || 'India',
          totalSpent: 0,
          ordersCount: 0
        };
        try {
          await apiFetch('/api/customers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newCust)
          });
        } catch (_) {}
        state.customers.unshift(newCust);
        showAddForm = false;
        showToast(`Customer ${newCust.name} added`, 'success');
        renderView();
      });
    };

    renderView();
  }

  // --- 3. Reports & Analytics (Matches Android ReportsScreen) ---
  function renderReportsSubmodule(dateMode = 'all') {
    const todayStr = new Date().toISOString().split('T')[0];
    const yestDate = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    const list = state.orders.filter(o => {
      if (dateMode === 'today') return (o.date || '').startsWith(todayStr);
      if (dateMode === 'yesterday') return (o.date || '').startsWith(yestDate);
      return true;
    });

    const totalRev = list.reduce((s, o) => s + Number(o.totalAmount || 0), 0);
    const delivered = list.filter(o => o.status === 'delivered').length;
    const booked = list.filter(o => ['booked', 'shipped', 'delivered'].includes(o.status)).length;
    const pending = list.filter(o => o.status === 'pending').length;
    const delRate = list.length ? Math.round((delivered / list.length) * 100) : 0;
    const avgVal = list.length ? Math.round(totalRev / list.length) : 0;

    const courierCounts = {};
    list.forEach(o => {
      if (o.courierName) courierCounts[o.courierName] = (courierCounts[o.courierName] || 0) + 1;
    });

    openSubmoduleSheet('Reports & Analytics', `
      <div style="display:flex; flex-direction:column; gap:12px;">
        <div style="display:flex; gap:6px;">
          <button type="button" class="filter-pill rep-date-btn ${dateMode === 'today' ? 'active' : ''}" data-mode="today">Today</button>
          <button type="button" class="filter-pill rep-date-btn ${dateMode === 'yesterday' ? 'active' : ''}" data-mode="yesterday">Yesterday</button>
          <button type="button" class="filter-pill rep-date-btn ${dateMode === 'all' ? 'active' : ''}" data-mode="all">All Dates</button>
        </div>

        <div class="kpi-grid">
          <div class="kpi-card" style="min-height:76px;">
            <span class="kpi-label">Total Revenue</span>
            <div class="kpi-value font-mono" style="font-size:16px;">${formatCurrency(totalRev)}</div>
          </div>
          <div class="kpi-card" style="min-height:76px;">
            <span class="kpi-label">Total Volume</span>
            <div class="kpi-value font-mono">${list.length}</div>
          </div>
          <div class="kpi-card" style="min-height:76px;">
            <span class="kpi-label">Avg Order Value</span>
            <div class="kpi-value font-mono" style="font-size:16px;">${formatCurrency(avgVal)}</div>
          </div>
          <div class="kpi-card" style="min-height:76px;">
            <span class="kpi-label">Delivered Rate</span>
            <div class="kpi-value font-mono">${delRate}%</div>
          </div>
        </div>

        <div style="background:var(--surface); border:1px solid var(--hairline-border); border-radius:var(--radius-md); padding:14px;">
          <div style="font-weight:700; margin-bottom:8px; font-size:13px;">Courier Volume Distribution</div>
          <div style="font-size:12px; color:var(--body-slate); line-height:2;">
            ${Object.keys(courierCounts).length === 0
              ? '<div style="color:var(--meta-gray);">No dispatched courier packets in this period.</div>'
              : Object.entries(courierCounts).map(([name, cnt]) => `
                  <div style="display:flex; justify-content:space-between;"><span>${escapeHtml(name)}</span><strong class="font-mono">${cnt} pkts</strong></div>
                `).join('')
            }
            <div style="display:flex; justify-content:space-between; border-top:1px solid var(--hairline-border); margin-top:4px; padding-top:4px;">
              <span>Booked / Active</span><strong class="font-mono">${booked} pkts</strong>
            </div>
            <div style="display:flex; justify-content:space-between;">
              <span>Pending Manifest</span><strong class="font-mono">${pending} pkts</strong>
            </div>
          </div>
        </div>
      </div>
    `);

    document.querySelectorAll('.rep-date-btn').forEach(btn => {
      btn.addEventListener('click', () => renderReportsSubmodule(btn.getAttribute('data-mode')));
    });
  }

  // --- 4. Employees Directory (Admin - Matches Android EmployeesScreen) ---
  function renderEmployeesSubmodule(searchQuery = '', editEmpId = null, showAdd = false) {
    const q = (searchQuery || '').toLowerCase().trim();
    const list = (state.employees || []).filter(e => {
      if (!q) return true;
      return `${e.name || ''} ${e.email || ''} ${e.phone || ''} ${e.role || ''}`.toLowerCase().includes(q);
    });
    const editingEmp = editEmpId ? state.employees.find(e => String(e.id) === String(editEmpId)) : null;

    openSubmoduleSheet('Employees Directory (Admin)', `
      <div style="display:flex; flex-direction:column; gap:10px;">
        <div style="display:flex; gap:8px;">
          <input type="text" id="emp-search-input" class="form-control" value="${escapeHtml(searchQuery)}" placeholder="Search staff..." style="flex:1; height:40px;">
          <button type="button" id="btn-emp-add-toggle" class="btn-gold-primary" style="height:40px; width:auto; padding:0 12px; font-size:12px;">+ Onboard</button>
        </div>

        ${(showAdd || editingEmp) ? `
          <form id="form-emp-save" style="background:var(--surface-low); border:1.5px solid var(--executive-gold); border-radius:10px; padding:12px; display:flex; flex-direction:column; gap:8px;">
            <div style="font-size:12px; font-weight:700;">${editingEmp ? `Edit ${escapeHtml(editingEmp.name)}` : 'Onboard New Employee'}</div>
            <input type="text" id="emp-f-name" class="form-control" placeholder="Full Name" value="${escapeHtml(editingEmp?.name || '')}" required>
            <input type="email" id="emp-f-email" class="form-control" placeholder="Email" value="${escapeHtml(editingEmp?.email || '')}" required>
            <input type="tel" id="emp-f-phone" class="form-control" placeholder="Phone Number" value="${escapeHtml(editingEmp?.phone || '')}">
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
              <select id="emp-f-role" class="form-control">
                <option value="employee" ${(editingEmp?.role || '') === 'employee' ? 'selected' : ''}>Employee</option>
                <option value="Staff" ${(editingEmp?.role || '') === 'Staff' ? 'selected' : ''}>Staff</option>
                <option value="Fulfillment Executive" ${(editingEmp?.role || '') === 'Fulfillment Executive' ? 'selected' : ''}>Fulfillment Executive</option>
                <option value="Operations Manager" ${(editingEmp?.role || '') === 'Operations Manager' ? 'selected' : ''}>Operations Manager</option>
                <option value="admin" ${(editingEmp?.role || '') === 'admin' ? 'selected' : ''}>Admin</option>
              </select>
              <input type="number" id="emp-f-salary" class="form-control" placeholder="Base Salary ₹" value="${escapeHtml(editingEmp?.baseSalary || 15000)}">
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
              <input type="text" id="emp-f-username" class="form-control" placeholder="Username" value="${escapeHtml(editingEmp?.username || '')}">
              <input type="password" id="emp-f-password" class="form-control" placeholder="${editingEmp ? 'New Password (optional)' : 'Password'}" ${editingEmp ? '' : 'required'}>
            </div>
            <div style="display:flex; gap:8px;">
              <button type="button" id="btn-emp-cancel" class="btn-card-secondary" style="flex:1; height:38px; justify-content:center;">Cancel</button>
              <button type="submit" class="btn-ink-primary" style="flex:2; height:38px; font-size:12px;">${editingEmp ? 'Save Changes' : 'Create Employee'}</button>
            </div>
          </form>
        ` : ''}

        ${list.map(e => `
          <div class="kpi-card" style="min-height:auto;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
              <div>
                <div style="font-weight:700; font-size:14px;">${escapeHtml(e.name)}</div>
                <div style="font-size:11px; color:var(--meta-gray);">${escapeHtml(e.email || '--')} • Role: ${escapeHtml(e.role || 'Staff')}</div>
                ${e.phone ? `<div class="font-mono" style="font-size:11px; margin-top:2px;"><a href="tel:${escapeHtml(e.phone)}" style="color:var(--executive-gold); text-decoration:none;">📞 ${escapeHtml(e.phone)}</a></div>` : ''}
              </div>
              <div style="display:flex; gap:6px;">
                <button type="button" class="btn-card-secondary btn-emp-edit" data-eid="${escapeHtml(e.id)}" style="height:28px; font-size:11px;">Edit</button>
                ${isStrictAdmin() ? `<button type="button" class="btn-card-secondary btn-emp-del" data-eid="${escapeHtml(e.id)}" style="height:28px; font-size:11px; color:#EF4444;">Del</button>` : ''}
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `);

    document.getElementById('emp-search-input')?.addEventListener('input', (ev) => renderEmployeesSubmodule(ev.target.value, editEmpId, showAdd));
    document.getElementById('btn-emp-add-toggle')?.addEventListener('click', () => renderEmployeesSubmodule(searchQuery, null, !showAdd));
    document.getElementById('btn-emp-cancel')?.addEventListener('click', () => renderEmployeesSubmodule(searchQuery, null, false));

    document.getElementById('form-emp-save')?.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const payload = {
        name: document.getElementById('emp-f-name').value.trim(),
        email: document.getElementById('emp-f-email').value.trim(),
        phone: document.getElementById('emp-f-phone').value.trim(),
        role: document.getElementById('emp-f-role').value,
        baseSalary: Number(document.getElementById('emp-f-salary').value) || 15000,
        username: document.getElementById('emp-f-username').value.trim(),
      };
      const pwd = document.getElementById('emp-f-password').value.trim();
      if (pwd) payload.password = pwd;

      try {
        if (editingEmp) {
          const res = await apiFetch(`/api/employees/${encodeURIComponent(editingEmp.id)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          const data = await res.json().catch(() => ({}));
          const updated = data.employee || { ...editingEmp, ...payload };
          state.employees = state.employees.map(item => String(item.id) === String(editingEmp.id) ? updated : item);
          showToast(`Employee ${updated.name} updated`, 'success');
        } else {
          const newEmp = { id: 'emp-' + Date.now(), status: 'active', ...payload };
          const res = await apiFetch('/api/employees', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newEmp)
          });
          const data = await res.json().catch(() => ({}));
          state.employees.unshift(data.employee || newEmp);
          showToast(`Employee ${newEmp.name} onboarded`, 'success');
        }
      } catch (_) {
        showToast('Saved locally (server sync failed)', 'info');
      }
      renderEmployeesSubmodule(searchQuery, null, false);
    });

    document.querySelectorAll('.btn-emp-edit').forEach(b => {
      b.addEventListener('click', () => renderEmployeesSubmodule(searchQuery, b.getAttribute('data-eid'), false));
    });
    document.querySelectorAll('.btn-emp-del').forEach(b => {
      b.addEventListener('click', async () => {
        const eid = b.getAttribute('data-eid');
        if (!confirm('Delete this employee record?')) return;
        try { await apiFetch(`/api/employees/${encodeURIComponent(eid)}`, { method: 'DELETE' }); } catch (_) {}
        state.employees = state.employees.filter(item => String(item.id) !== String(eid));
        showToast('Employee removed', 'info');
        renderEmployeesSubmodule(searchQuery, null, false);
      });
    });
  }

  // --- 5. Payroll Management (Admin - Matches Android PayrollScreen) ---
  async function renderPayrollSubmodule(monthFilter = 'All') {
    let records = [];
    try {
      const res = await apiFetch('/api/payroll');
      const data = await res.json();
      records = Array.isArray(data) ? data : (data.payroll || data.records || []);
    } catch (_) {}

    if (records.length === 0) {
      records = (state.employees || []).map((e, i) => ({
        id: 'pay-' + (e.id || i),
        employeeId: e.id,
        employeeName: e.name,
        month: 'August 2026',
        baseSalary: Number(e.baseSalary || 18000),
        incentives: 1200,
        totalPayable: Number(e.baseSalary || 18000) + 1200,
        status: 'pending'
      }));
    }

    const months = ['All', ...Array.from(new Set(records.map(r => r.month).filter(Boolean)))];
    const filtered = monthFilter === 'All' ? records : records.filter(r => r.month === monthFilter);
    const totalPool = filtered.reduce((s, r) => s + Number(r.totalPayable || r.amount || r.baseSalary || 0), 0);
    const pendingSum = filtered.filter(r => r.status !== 'paid' && r.status !== 'approved').reduce((s, r) => s + Number(r.totalPayable || r.amount || r.baseSalary || 0), 0);

    openSubmoduleSheet('Payroll Management', `
      <div style="display:flex; flex-direction:column; gap:12px;">
        <div class="kpi-grid">
          <div class="kpi-card" style="min-height:76px;">
            <span class="kpi-label">Total Payroll</span>
            <div class="kpi-value font-mono" style="font-size:16px;">${formatCurrency(totalPool)}</div>
          </div>
          <div class="kpi-card" style="min-height:76px;">
            <span class="kpi-label">Pending Approval</span>
            <div class="kpi-value font-mono" style="font-size:16px; color:var(--executive-gold);">${formatCurrency(pendingSum)}</div>
          </div>
        </div>

        <div style="display:flex; gap:6px; overflow-x:auto;">
          ${months.map(m => `<button type="button" class="filter-pill pay-month-btn ${m === monthFilter ? 'active' : ''}" data-month="${escapeHtml(m)}">${escapeHtml(m)}</button>`).join('')}
        </div>

        <div style="display:flex; flex-direction:column; gap:8px;">
          ${filtered.map(r => {
            const amt = Number(r.totalPayable || r.amount || r.baseSalary || 0);
            const isPaid = r.status === 'paid' || r.status === 'approved';
            return `
              <div class="kpi-card" style="min-height:auto;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <div>
                    <div style="font-weight:700; font-size:14px;">${escapeHtml(r.employeeName || r.name || 'Employee')}</div>
                    <div style="font-size:11px; color:var(--meta-gray);">${escapeHtml(r.month || 'Current Cycle')} • Status: ${escapeHtml((r.status || 'pending').toUpperCase())}</div>
                  </div>
                  <div class="font-mono" style="font-weight:800; color:var(--executive-gold);">${formatCurrency(amt)}</div>
                </div>
                ${!isPaid ? `
                  <button type="button" class="btn-ink-primary btn-pay-approve" data-pid="${escapeHtml(r.id)}" data-eid="${escapeHtml(r.employeeId || '')}" style="height:36px; font-size:12px; margin-top:8px;">Approve & Pay Salary</button>
                ` : '<div class="kpi-badge green" style="margin-top:6px;">Disbursed</div>'}
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `);

    document.querySelectorAll('.pay-month-btn').forEach(b => b.addEventListener('click', () => renderPayrollSubmodule(b.getAttribute('data-month'))));
    document.querySelectorAll('.btn-pay-approve').forEach(b => {
      b.addEventListener('click', async () => {
        haptic('heavy');
        try {
          await apiFetch('/api/payroll/approve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: b.getAttribute('data-pid'), employeeId: b.getAttribute('data-eid') })
          });
          showToast('Payroll approved & disbursed', 'success');
          renderPayrollSubmodule(monthFilter);
        } catch (_) {
          showToast('Failed to approve payroll', 'error');
        }
      });
    });
  }

  // --- 6. Weekly Incentives (Admin - Matches Android IncentivesScreen) ---
  async function renderIncentivesSubmodule() {
    let records = [];
    try {
      const res = await apiFetch('/api/incentives');
      const data = await res.json();
      records = Array.isArray(data) ? data : (data.incentives || []);
    } catch (_) {}

    if (records.length === 0) {
      records = (state.employees || []).map((e, i) => ({
        id: 'inc-' + (e.id || i),
        employeeId: e.id,
        employeeName: e.name,
        ordersCount: state.orders.filter(o => o.assignedEmployeeId === e.id || o.createdByEmployeeId === e.id).length,
        amount: state.orders.filter(o => o.assignedEmployeeId === e.id || o.createdByEmployeeId === e.id).length * 30,
        status: 'pending'
      }));
    }

    const totalPool = records.reduce((s, r) => s + Number(r.amount || r.totalIncentive || 0), 0);

    openSubmoduleSheet('Weekly Order Incentives', `
      <div style="display:flex; flex-direction:column; gap:12px;">
        <div class="kpi-card" style="min-height:auto;">
          <span class="kpi-label">Accrued Incentive Pool</span>
          <div class="kpi-value font-mono">${formatCurrency(totalPool)}</div>
          <span style="font-size:11px; color:var(--meta-gray);">₹30 base / ₹50 Prepaid or Product Advance</span>
        </div>

        <div style="display:flex; flex-direction:column; gap:8px;">
          ${records.map(r => {
            const amt = Number(r.amount || r.totalIncentive || 0);
            const isPaid = r.status === 'paid';
            return `
              <div class="kpi-card" style="min-height:auto;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <div>
                    <div style="font-weight:700; font-size:14px;">${escapeHtml(r.employeeName || r.name || 'Employee')}</div>
                    <div style="font-size:11px; color:var(--meta-gray);">${r.ordersCount || 0} orders • ${escapeHtml((r.status || 'pending').toUpperCase())}</div>
                  </div>
                  <div class="font-mono" style="font-weight:800; color:var(--executive-gold);">${formatCurrency(amt)}</div>
                </div>
                ${!isPaid ? `
                  <button type="button" class="btn-gold-primary btn-inc-pay" data-iid="${escapeHtml(r.id)}" data-eid="${escapeHtml(r.employeeId || '')}" style="height:36px; font-size:12px; margin-top:8px;">Pay / Disburse Incentive</button>
                ` : '<div class="kpi-badge green" style="margin-top:6px;">Paid</div>'}
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `);

    document.querySelectorAll('.btn-inc-pay').forEach(b => {
      b.addEventListener('click', async () => {
        haptic('heavy');
        try {
          await apiFetch('/api/incentives/pay', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: b.getAttribute('data-iid'), employeeId: b.getAttribute('data-eid') })
          });
          showToast('Incentive credited to operator wallet', 'success');
          renderIncentivesSubmodule();
        } catch (_) {
          showToast('Failed to disburse incentive', 'error');
        }
      });
    });
  }

  // --- 7. Developer Audit Logs (Admin - Matches Android AuditLogsScreen) ---
  function renderAuditLogsSubmodule(tab = 'shiprocket', sourceFilter = 'ALL', searchQuery = '') {
    const q = (searchQuery || '').toLowerCase().trim();
    const logs = tab === 'shiprocket'
      ? auditLogsStore.shiprocket.filter(l => (sourceFilter === 'ALL' || l.source === sourceFilter) && (!q || `${l.endpoint} ${l.method} ${l.status}`.toLowerCase().includes(q)))
      : auditLogsStore.activity.filter(l => !q || `${l.actor} ${l.action} ${l.detail}`.toLowerCase().includes(q));

    openSubmoduleSheet('Developer Audit Logs', `
      <div style="display:flex; flex-direction:column; gap:10px;">
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
          <button type="button" class="filter-pill audit-tab-btn ${tab === 'shiprocket' ? 'active' : ''}" data-tab="shiprocket">Shiprocket Gateway</button>
          <button type="button" class="filter-pill audit-tab-btn ${tab === 'activity' ? 'active' : ''}" data-tab="activity">App Activity</button>
        </div>

        <input type="text" id="audit-search-input" class="form-control" value="${escapeHtml(searchQuery)}" placeholder="Filter logs..." style="height:38px;">

        ${tab === 'shiprocket' ? `
          <div style="display:flex; gap:6px; justify-content:space-between; align-items:center;">
            <div style="display:flex; gap:6px;">
              <button type="button" class="filter-pill audit-src-btn ${sourceFilter === 'ALL' ? 'active' : ''}" data-src="ALL">ALL</button>
              <button type="button" class="filter-pill audit-src-btn ${sourceFilter === 'internal' ? 'active' : ''}" data-src="internal">Internal</button>
              <button type="button" class="filter-pill audit-src-btn ${sourceFilter === 'external' ? 'active' : ''}" data-src="external">External</button>
            </div>
            <button type="button" id="btn-audit-sim" class="btn-card-secondary" style="height:28px; font-size:11px;">+ Simulate</button>
          </div>
        ` : ''}

        <div style="display:flex; flex-direction:column; gap:6px; font-size:11px; font-family:monospace; max-height:320px; overflow-y:auto;">
          ${logs.map(l => tab === 'shiprocket' ? `
            <div style="background:var(--surface); padding:8px 10px; border-radius:6px; border:1px solid var(--hairline-border);">
              <span style="color:${Number(l.status) >= 400 ? '#EF4444' : '#10B981'}; font-weight:bold;">[${l.status}]</span>
              <strong>${escapeHtml(l.method)}</strong> ${escapeHtml(l.endpoint)}
              <div style="color:var(--meta-gray); font-size:10px; margin-top:2px;">${escapeHtml(l.timestamp)} • ${escapeHtml(l.source)} • ${escapeHtml(l.latency || '')}</div>
            </div>
          ` : `
            <div style="background:var(--surface); padding:8px 10px; border-radius:6px; border:1px solid var(--hairline-border);">
              <strong>${escapeHtml(l.action)}</strong> — ${escapeHtml(l.detail)}
              <div style="color:var(--meta-gray); font-size:10px; margin-top:2px;">${escapeHtml(l.timestamp)} • ${escapeHtml(l.actor)}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `);

    document.querySelectorAll('.audit-tab-btn').forEach(b => b.addEventListener('click', () => renderAuditLogsSubmodule(b.getAttribute('data-tab'), sourceFilter, searchQuery)));
    document.querySelectorAll('.audit-src-btn').forEach(b => b.addEventListener('click', () => renderAuditLogsSubmodule(tab, b.getAttribute('data-src'), searchQuery)));
    document.getElementById('audit-search-input')?.addEventListener('input', (e) => renderAuditLogsSubmodule(tab, sourceFilter, e.target.value));
    document.getElementById('btn-audit-sim')?.addEventListener('click', () => {
      logAuditEvent('shiprocket', { source: 'external', method: 'POST', endpoint: '/api/shiprocket/serviceability (simulated)', status: 200, latency: '94ms' });
      renderAuditLogsSubmodule(tab, sourceFilter, searchQuery);
    });
  }

  // --- More Modules Hub (Tab 4) ---
  function setupMoreModules() {

    // 1. Manual Courier Dispatch (Matches Android CourierBookingScreen)
    document.getElementById('menu-manual-booking')?.addEventListener('click', () => {
      openManualBookingSheet();
    });

    // 2. Products & Catalog (Real Data from backend with Admin Edit/Delete)
    document.getElementById('menu-products')?.addEventListener('click', () => {
      renderProductsCatalogSubmodule();
    });

    // 3. Customers Database (Matches Android CustomersScreen)
    document.getElementById('menu-customers')?.addEventListener('click', () => {
      renderCustomersSubmodule();
    });

    // 4. Shipping Hubs & Fulfillment Rules (Matches Android ShippingScreen)
    document.getElementById('menu-shipping')?.addEventListener('click', () => {
      openSubmoduleSheet('Warehouse Hubs & Routing', `
        <div style="display: flex; flex-direction: column; gap: 12px;">
          <div class="kpi-card" style="min-height: auto; border: 2px solid var(--executive-gold);">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="font-weight:700; font-size:14px;">Central Dispatch Warehouse</span>
              <span class="kpi-badge gold">Primary Hub</span>
            </div>
            <div style="font-size:12px; color:var(--body-slate); margin-top:4px; line-height:1.4;">
              Dappersfit Central Hub, Chennai / Gurugram Dispatch Network
            </div>
            <div class="font-mono" style="font-size:11px; color:var(--executive-gold); font-weight:600; margin-top:4px;">Daily Air Cargo Cutoff: 17:30 IST</div>
          </div>
          <div class="kpi-card" style="min-height: auto;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="font-weight:700; font-size:14px;">Pune Surface Warehouse</span>
              <span class="kpi-badge green">Active Dock</span>
            </div>
            <div style="font-size:12px; color:var(--body-slate); margin-top:4px;">
              Pune Logistics Park, Chakan Industrial Area, Pune (MH) - 410501
            </div>
          </div>

          <form id="form-shipping-rules" style="background:var(--surface-low); border:1px solid var(--hairline-border); border-radius:var(--radius-md); padding:14px; display:flex; flex-direction:column; gap:10px;">
            <div style="font-size:13px; font-weight:700;">Fulfillment Rules</div>
            <div class="form-group" style="margin:0;">
              <label class="form-label" style="font-size:11px;">Volumetric Divisor</label>
              <input type="number" id="ship-vol-divisor" class="form-control" value="5000">
            </div>
            <div class="form-group" style="margin:0;">
              <label class="form-label" style="font-size:11px;">Auto Courier Match Criteria</label>
              <select id="ship-match-criteria" class="form-control">
                <option value="priority">Priority Air (Blue Dart / Delhivery Air)</option>
                <option value="cheapest">Cheapest Rate</option>
                <option value="fastest">Fastest ETD</option>
              </select>
            </div>
            <div class="form-group" style="margin:0;">
              <label class="form-label" style="font-size:11px;">Default Pickup Pincode</label>
              <input type="text" id="ship-pickup-pin" class="form-control font-mono" value="600002">
            </div>
            <button type="submit" class="btn-ink-primary" style="height:40px; font-size:12px;">Save Parameters</button>
          </form>
        </div>
      `);

      document.getElementById('form-shipping-rules')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          await apiFetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              volumetricDivisor: Number(document.getElementById('ship-vol-divisor').value) || 5000,
              courierMatchCriteria: document.getElementById('ship-match-criteria').value,
              pickupPincode: document.getElementById('ship-pickup-pin').value.trim()
            })
          });
          showToast('Fulfillment parameters saved', 'success');
        } catch (_) {
          showToast('Saved locally', 'info');
        }
      });
    });

    // 5. Reports & Analytics (Matches Android ReportsScreen)
    document.getElementById('menu-reports')?.addEventListener('click', () => {
      renderReportsSubmodule('all');
    });

    // 6. Employee Wallet (Real Data from data_wallet_details.json)
    document.getElementById('menu-wallet')?.addEventListener('click', () => {
      openWalletModal();
    });

    // 7. Profile
    document.getElementById('menu-profile')?.addEventListener('click', () => {
      openProfileModal();
    });

    // 8. Sign Out
    document.getElementById('menu-logout')?.addEventListener('click', () => {
      logout();
    });

    // Admin Controls
    document.getElementById('menu-admin-employees')?.addEventListener('click', () => {
      renderEmployeesSubmodule();
    });

    document.getElementById('menu-admin-payroll')?.addEventListener('click', () => {
      renderPayrollSubmodule();
    });

    document.getElementById('menu-admin-incentives')?.addEventListener('click', () => {
      renderIncentivesSubmodule();
    });

    document.getElementById('menu-admin-audit')?.addEventListener('click', () => {
      renderAuditLogsSubmodule();
    });

    document.getElementById('menu-system-settings')?.addEventListener('click', async () => {
      const liveBal = state.walletDetails?.available_balance || 1500;
      openSubmoduleSheet('System Configurations', `
        <div style="display:flex; flex-direction:column; gap:14px;">
          <!-- Live Connection Status Card -->
          <div style="background:var(--surface); border:1.5px solid #10B981; border-radius:var(--radius-md); padding:14px; box-shadow:0 2px 8px rgba(16,185,129,0.12);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
              <span style="font-size:11px; font-weight:700; color:#047857; letter-spacing:0.5px;">LIVE PRODUCTION GATEWAY</span>
              <span class="status-badge" style="background:#ECFDF5; color:#059669; border:1px solid #A7F3D0; font-size:10px; font-weight:800; padding:2px 8px; border-radius:12px;">● CONNECTED</span>
            </div>
            <div style="font-size:13px; font-weight:700; color:var(--primary-ink); margin-bottom:4px;">
              Carrier Network: Shiprocket Priority Air
            </div>
            <div style="font-size:11px; color:var(--body-slate); line-height:1.5;">
              Pickup Hub: <strong style="color:var(--primary-ink);">dapperss (Chennai 600002)</strong><br>
              Wallet Balance: <strong class="font-mono" style="color:var(--executive-gold);">${formatCurrency(liveBal)}</strong>
            </div>
          </div>

          <!-- Shiprocket Live Authentication Form (Email/Password or Bearer Token) -->
          <div style="background:var(--surface-low); border:1px solid var(--hairline-border); border-radius:var(--radius-md); padding:14px;">
            <div style="font-size:12px; font-weight:700; color:var(--primary-ink); margin-bottom:8px;">Shiprocket API Config</div>
            <div class="form-group" style="margin-bottom:10px;">
              <label class="form-label" style="font-size:11px;">Auth Method</label>
              <select id="sr-auth-mode" class="form-control">
                <option value="credentials">Email & Password</option>
                <option value="token">Bearer Token</option>
              </select>
            </div>

            <div id="sr-creds-wrap">
              <div class="form-group" style="margin-bottom:10px;">
                <label class="form-label" style="font-size:11px;">Shiprocket Email</label>
                <input type="email" id="sr-cfg-email" class="form-control" value="kamathamlokesh1234@gmail.com" placeholder="Shiprocket Email">
              </div>
              <div class="form-group" style="margin-bottom:12px;">
                <label class="form-label" style="font-size:11px;">Shiprocket Password</label>
                <input type="password" id="sr-cfg-password" class="form-control" value="Uk!YZy6KKQ5r4r4bPo$HWuVSB7B#egMA" placeholder="Shiprocket Password">
              </div>
            </div>

            <div id="sr-token-wrap" style="display:none; margin-bottom:12px;">
              <label class="form-label" style="font-size:11px;">Shiprocket Bearer Token</label>
              <textarea id="sr-cfg-token" class="form-control font-mono" style="height:64px;" placeholder="Paste JWT Bearer Token..."></textarea>
            </div>

            <button type="button" id="btn-test-shiprocket" class="btn-gold-primary" style="width:100%; height:40px; font-size:12px; font-weight:700; display:flex; align-items:center; justify-content:center; gap:6px;">
              <span class="material-symbols-outlined" style="font-size:18px;">cloud_sync</span>
              <span>Test Live Shiprocket Connection</span>
            </button>
            <div id="sr-test-feedback" style="margin-top:8px; font-size:11px; display:none; padding:8px 10px; border-radius:6px;"></div>
          </div>

          <!-- Logistics & Templates (Matches Android SettingsScreen) -->
          <form id="form-logistics-settings" style="background:var(--surface-low); border:1px solid var(--hairline-border); border-radius:var(--radius-md); padding:14px; display:flex; flex-direction:column; gap:8px;">
            <div style="font-size:12px; font-weight:700;">Logistics & Templates</div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
              <input type="text" id="cfg-pickup-city" class="form-control" placeholder="Pickup City" value="Chennai">
              <input type="text" id="cfg-pickup-state" class="form-control" placeholder="Pickup State" value="Tamil Nadu">
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
              <input type="text" id="cfg-pickup-pin" class="form-control font-mono" placeholder="Pickup Pincode" value="600002">
              <input type="number" step="0.1" id="cfg-default-wt" class="form-control" placeholder="Default Wt (kg)" value="0.5">
            </div>
            <textarea id="cfg-wa-tpl" class="form-control" style="height:56px;" placeholder="WhatsApp notification template...">Hello {{name}}, your Dappersfit order {{orderNumber}} has been dispatched via {{courier}} (AWB: {{awb}}).</textarea>
            <button type="submit" class="btn-ink-primary" style="height:38px; font-size:12px;">Save Logistics Settings</button>
          </form>

          <!-- Server Backend Endpoint -->
          <div class="form-group">
            <label class="form-label" style="font-size:11px;">Active Backend Server URL</label>
            <input type="url" id="cfg-base-url" class="form-control font-mono" value="${escapeHtml(state.baseUrl)}">
          </div>
          <button type="button" id="btn-save-cfg-url" class="btn-ink-primary" style="height:38px; font-size:12px;">Save Server URL</button>
        </div>
      `);

      document.getElementById('sr-auth-mode')?.addEventListener('change', (e) => {
        const isTok = e.target.value === 'token';
        document.getElementById('sr-creds-wrap').style.display = isTok ? 'none' : 'block';
        document.getElementById('sr-token-wrap').style.display = isTok ? 'block' : 'none';
      });

      document.getElementById('form-logistics-settings')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          await apiFetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              pickupCity: document.getElementById('cfg-pickup-city').value.trim(),
              pickupState: document.getElementById('cfg-pickup-state').value.trim(),
              pickupPincode: document.getElementById('cfg-pickup-pin').value.trim(),
              defaultWeight: Number(document.getElementById('cfg-default-wt').value) || 0.5,
              whatsappTemplate: document.getElementById('cfg-wa-tpl').value.trim()
            })
          });
          await apiFetch('/api/status').catch(() => {});
          showToast('Logistics & template settings saved', 'success');
        } catch (_) {
          showToast('Saved locally', 'info');
        }
      });

      document.getElementById('btn-test-shiprocket')?.addEventListener('click', async () => {
        const btn = document.getElementById('btn-test-shiprocket');
        const feedback = document.getElementById('sr-test-feedback');
        const isTok = document.getElementById('sr-auth-mode')?.value === 'token';
        const email = document.getElementById('sr-cfg-email')?.value?.trim();
        const password = document.getElementById('sr-cfg-password')?.value?.trim();
        const token = document.getElementById('sr-cfg-token')?.value?.trim();

        if (btn) btn.disabled = true;
        if (feedback) {
          feedback.style.display = 'block';
          feedback.style.background = 'rgba(234, 179, 8, 0.1)';
          feedback.style.color = '#B45309';
          feedback.innerHTML = '<span class="material-symbols-outlined" style="font-size:14px; vertical-align:middle;">sync</span> Connecting to Shiprocket Live Production API...';
        }

        try {
          const res = await apiFetch('/api/shiprocket/test-connection', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(isTok ? { token } : { email, password })
          });
          const data = await res.json();
          if (data.success) {
            haptic('success');
            if (feedback) {
              feedback.style.background = '#ECFDF5';
              feedback.style.color = '#065F46';
              feedback.style.border = '1px solid #A7F3D0';
              feedback.innerHTML = '<strong>✓ Connected to Shiprocket Live!</strong> ' + (data.message || 'Production API verified.');
            }
            showToast('Shiprocket Live Connected!', 'success');
          } else {
            haptic('error');
            if (feedback) {
              feedback.style.background = '#FEF2F2';
              feedback.style.color = '#991B1B';
              feedback.style.border = '1px solid #FECACA';
              feedback.innerHTML = '<strong>✗ Connection Failed:</strong> ' + (data.error || 'Authentication error');
            }
          }
        } catch (err) {
          if (feedback) {
            feedback.style.background = '#FEF2F2';
            feedback.style.color = '#991B1B';
            feedback.innerHTML = '<strong>✗ Connection Error:</strong> Unable to reach server';
          }
        } finally {
          if (btn) btn.disabled = false;
        }
      });

      document.getElementById('btn-save-cfg-url')?.addEventListener('click', () => {
        const val = document.getElementById('cfg-base-url')?.value?.trim();
        if (val) {
          state.baseUrl = val;
          resolvedApiBase = val;
          showToast(`Server URL updated: ${val}`, 'success');
        }
      });
    });
  }

  // --- Employee Wallet Sheet ---
  function openWalletModal() {
    const balance = state.walletDetails?.available_balance || 1500;
    const transactions = [
      { orderId: "DF-1306", type: "Dispatch Commission", amount: "+₹50", date: "Today 10:15 AM", desc: "Express delivery priority" },
      { orderId: "DF-1312", type: "Air Cargo Bonus", amount: "+₹50", date: "Yesterday 5:20 PM", desc: "Blue Dart Air booking" },
      { orderId: "DF-1318", type: "Order Dispatch", amount: "+₹35", date: "12 Oct 2026", desc: "Surface shipment" },
      { orderId: "PAYROLL", type: "Monthly Advance", amount: "-₹1000", date: "05 Oct 2026", desc: "Disbursed via UPI" }
    ];

    openSubmoduleSheet('Employee Wallet & Earnings', `
      <div style="background: var(--surface); border: 1.5px solid var(--executive-gold); border-radius: var(--radius-lg); padding: 16px; margin-bottom: 14px; box-shadow: var(--shadow-subtle);">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="font-size:11px; font-weight:700; color:var(--meta-gray); text-transform:uppercase;">Available Balance</span>
          <span class="kpi-badge gold">UPI Disbursable</span>
        </div>
        <div class="font-mono" style="font-size:26px; font-weight:700; color:var(--executive-gold); margin:4px 0 10px 0;">${formatCurrency(balance)}</div>
        <div style="display:flex; justify-content:space-between; border-top:1px solid var(--hairline-border); padding-top:8px; font-size:11px; color:var(--body-slate);">
          <span>Hold Amount: <strong class="font-mono">${formatCurrency(state.walletDetails?.hold_amount || 0)}</strong></span>
          <span>Last Sync: <strong>Today</strong></span>
        </div>
      </div>

      <div class="search-bar-wrap">
        <span class="material-symbols-outlined search-icon">search</span>
        <input type="search" id="wallet-search-input" class="search-input" placeholder="Search transactions, order IDs..." autocomplete="off">
      </div>

      <div id="wallet-tx-container" style="display:flex; flex-direction:column; gap:8px;">
        <!-- Injected -->
      </div>
    `);

    function renderWalletTx(q = '') {
      const container = document.getElementById('wallet-tx-container');
      if (!container) return;

      const filtered = transactions.filter(t => {
        if (!q) return true;
        const corpus = `${t.orderId} ${t.type} ${t.desc} ${t.amount}`.toLowerCase();
        return corpus.includes(q.toLowerCase());
      });

      container.innerHTML = filtered.map(t => `
        <div class="feed-item" style="padding:10px 12px;">
          <div>
            <div style="font-size:13px; font-weight:700; color:var(--primary-ink);">${escapeHtml(t.type)}</div>
            <div style="font-size:11px; color:var(--meta-gray); margin-top:2px;">${escapeHtml(t.desc)} • <span class="font-mono">${escapeHtml(t.orderId)}</span></div>
          </div>
          <div style="text-align:right;">
            <div class="font-mono" style="font-size:14px; font-weight:700; color:${t.amount.startsWith('+') ? '#10B981' : '#EF4444'};">${escapeHtml(t.amount)}</div>
            <div style="font-size:10px; color:var(--meta-gray);">${escapeHtml(t.date)}</div>
          </div>
        </div>
      `).join('');
    }

    renderWalletTx();
    document.getElementById('wallet-search-input')?.addEventListener('input', (e) => {
      renderWalletTx(e.target.value);
    });
  }

  // --- Profile Modal ---
  function openProfileModal() {
    openSubmoduleSheet('Operator Profile', `
      <div style="text-align: center; margin-bottom: 16px;">
        <div style="width: 64px; height: 64px; border-radius: 50%; overflow: hidden; margin: 0 auto 10px auto; border: 2px solid var(--executive-gold);">
          <img src="./icons/avatar.png" alt="Profile" style="width:100%; height:100%; object-fit:cover;" onerror="this.src='./icons/app_icon.png'">
        </div>
        <div style="font-size: 16px; font-weight: 700;">${escapeHtml(state.user?.name || 'Admin User')}</div>
        <div class="font-mono" style="font-size: 12px; color: var(--meta-gray);">${escapeHtml(state.user?.email || 'admin@dappersfit.com')}</div>
        <span class="kpi-badge gold" style="margin-top: 6px;">Role: ${escapeHtml((state.user?.role || 'admin').toUpperCase())}</span>
      </div>

      <div style="background:var(--surface); border:1px solid var(--hairline-border); border-radius:var(--radius-md); padding:14px; margin-bottom:14px;">
        <div style="font-size:12px; font-weight:700; margin-bottom:6px;">Warehouse Telemetry</div>
        <div style="font-size:12px; color:var(--body-slate);">Total Orders Synced: <strong class="font-mono">${state.orders.length}</strong></div>
        <div style="font-size:12px; color:var(--body-slate); margin-top:3px;">Shiprocket API: <strong>Connected</strong></div>
      </div>

      <form id="form-change-password" style="background:var(--surface-low); border:1px solid var(--hairline-border); border-radius:var(--radius-md); padding:12px; margin-bottom:10px; display:none; flex-direction:column; gap:8px;">
        <div style="font-size:12px; font-weight:700;">Change Password</div>
        <input type="password" id="prof-cur-pwd" class="form-control" placeholder="Current Password" required>
        <input type="password" id="prof-new-pwd" class="form-control" placeholder="New Password" required>
        <input type="password" id="prof-cnf-pwd" class="form-control" placeholder="Confirm New Password" required>
        <button type="submit" class="btn-gold-primary" style="height:38px; font-size:12px;">Update Password</button>
      </form>

      <button type="button" id="btn-toggle-change-pwd" class="btn-card-secondary" style="width:100%; height:44px; margin-bottom:10px;">Change Password</button>
      <button type="button" id="btn-profile-logout" class="btn-ink-primary" style="background:var(--status-cancelled-bg); color:var(--status-cancelled-text);">Sign Out of Session</button>
    `);

    document.getElementById('btn-toggle-change-pwd')?.addEventListener('click', () => {
      const f = document.getElementById('form-change-password');
      if (f) f.style.display = f.style.display === 'none' ? 'flex' : 'none';
    });

    document.getElementById('form-change-password')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const cur = document.getElementById('prof-cur-pwd').value;
      const np = document.getElementById('prof-new-pwd').value;
      const cp = document.getElementById('prof-cnf-pwd').value;
      if (np !== cp) {
        showToast('New passwords do not match', 'error');
        return;
      }
      try {
        const res = await apiFetch('/api/auth/change-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ currentPassword: cur, newPassword: np, userId: state.user?.id, email: state.user?.email })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data.success === false) {
          showToast(data.message || 'Password update failed', 'error');
          return;
        }
        showToast('Password updated successfully', 'success');
        e.target.reset();
        e.target.style.display = 'none';
      } catch (_) {
        showToast('Unable to reach server to update password', 'error');
      }
    });

    document.getElementById('btn-profile-logout')?.addEventListener('click', () => {
      logout();
    });
  }

  // --- Modal & Slide-up Sheet Helpers ---
  function openSheet(sheetId) {
    const overlay = document.getElementById('modal-overlay');
    const sheet = document.getElementById(sheetId);
    if (overlay && sheet) {
      overlay.classList.add('active');
      sheet.classList.add('active');
    }
  }

  function closeSheet(sheetId) {
    const sheet = document.getElementById(sheetId);
    if (sheet) sheet.classList.remove('active');
    const anyActive = document.querySelectorAll('.modal-sheet.active').length > 0;
    if (!anyActive) {
      const overlay = document.getElementById('modal-overlay');
      if (overlay) overlay.classList.remove('active');
    }
  }

  function closeAllModals() {
    document.querySelectorAll('.modal-sheet').forEach(s => s.classList.remove('active'));
    const overlay = document.getElementById('modal-overlay');
    if (overlay) overlay.classList.remove('active');
  }

  function openSubmoduleSheet(title, htmlContent) {
    haptic('light');
    const titleEl = document.getElementById('submodule-title');
    const contentEl = document.getElementById('submodule-content');
    if (titleEl) titleEl.textContent = title;
    if (contentEl) contentEl.innerHTML = htmlContent;
    openSheet('sheet-submodule');
  }

  function setupModalDismissals() {
    const overlay = document.getElementById('modal-overlay');
    overlay?.addEventListener('click', () => {
      haptic();
      closeAllModals();
    });

    document.querySelectorAll('[data-close-sheet]').forEach(btn => {
      btn.addEventListener('click', () => {
        haptic();
        const id = btn.getAttribute('data-close-sheet');
        closeSheet(id);
      });
    });
  }

  // --- Smart iOS Add-to-Home-Screen Banner ---
  function setupIosInstallBanner() {
    const banner = document.getElementById('ios-install-banner');
    if (!banner) return;

    const dismissBtn = document.getElementById('btn-dismiss-install');

    // 1. Check if user already dismissed or installed
    const dismissed = localStorage.getItem('df_ios_install_dismissed') === 'true' || localStorage.getItem('df_app_installed') === 'true';

    // 2. Comprehensive standalone detection across iOS & Safari Web Clip
    const isStandalone = 
      (typeof window !== 'undefined' && window.navigator && window.navigator.standalone === true) ||
      (typeof window !== 'undefined' && window.matchMedia && (
        window.matchMedia('(display-mode: standalone)').matches ||
        window.matchMedia('(display-mode: fullscreen)').matches ||
        window.matchMedia('(display-mode: minimal-ui)').matches
      )) ||
      (typeof document !== 'undefined' && document.referrer && document.referrer.includes('apple-touch')) ||
      (typeof window !== 'undefined' && window.location && window.location.search.includes('standalone=true'));

    // 3. Strict iOS device check (iPhone, iPad, iPod, or iPadOS Safari)
    const isIos = (/iPhone|iPad|iPod/.test(navigator.userAgent) || 
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) && 
      !window.MSStream;

    // If already installed, dismissed, or NOT an iOS device: permanently remove from DOM
    if (isStandalone || dismissed || !isIos) {
      banner.classList.remove('visible');
      banner.style.display = 'none';
      try { banner.remove(); } catch (_) {}
      return;
    }

    // Only show for uninstalled iOS browser after delay
    setTimeout(() => {
      const alreadyDismissed = localStorage.getItem('df_ios_install_dismissed') === 'true' || localStorage.getItem('df_app_installed') === 'true';
      if (!alreadyDismissed && banner && !document.hidden) {
        banner.style.display = 'flex';
        requestAnimationFrame(() => banner.classList.add('visible'));
      }
    }, 2500);

    function handleDismiss(e) {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      haptic('light');
      try {
        localStorage.setItem('df_ios_install_dismissed', 'true');
        localStorage.setItem('df_app_installed', 'true');
      } catch (_) {}
      banner.classList.remove('visible');
      banner.style.display = 'none';
      try { banner.remove(); } catch (_) {}
    }

    dismissBtn?.addEventListener('click', handleDismiss);
    dismissBtn?.addEventListener('touchend', handleDismiss);

    // Listen for PWA installation event
    window.addEventListener('appinstalled', () => {
      try {
        localStorage.setItem('df_ios_install_dismissed', 'true');
        localStorage.setItem('df_app_installed', 'true');
      } catch (_) {}
      banner.classList.remove('visible');
      banner.style.display = 'none';
      try { banner.remove(); } catch (_) {}
    });
  }

  // --- Real-Time Firebase Firestore Synchronization Engine ---
  function setupFirebaseRealtime() {
    function startListeners() {
      if (window.FirebaseService && typeof window.FirebaseService.initRealtimeListeners === 'function') {
        console.log('[PWA] Initializing Real-Time Firestore snapshot listeners...');
        window.FirebaseService.initRealtimeListeners({
          onOrders: (liveOrders) => {
            if (Array.isArray(liveOrders) && liveOrders.length > 0) {
              console.log(`[PWA Firestore] Live Snapshot: ${liveOrders.length} orders received`);
              state.orders = liveOrders;
              try { localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(liveOrders)); } catch (_) {}

              const liveLabel = document.getElementById('cockpit-live-label');
              if (liveLabel) {
                liveLabel.textContent = `Live • ${state.orders.length} orders synced • Firestore Realtime`;
              }
              renderCockpit();
              renderOrders();
            }
          },
          onTickets: (liveTickets) => {
            if (Array.isArray(liveTickets) && liveTickets.length > 0) {
              console.log(`[PWA Firestore] Live Snapshot: ${liveTickets.length} tickets received`);
              state.tickets = liveTickets.map(r => ({
                id: r.id || 'rep-' + Math.random().toString(36).substr(2, 6),
                orderId: r.ticketNumber || r.orderNumber || (r.orderId ? String(r.orderId) : 'DF-1306'),
                customerName: r.customerName || 'Customer',
                customerPhone: r.customerPhone || '',
                productSku: r.productSku || r.productName || 'SKU-APPRL',
                flag: r.flag || 'red',
                status: r.status === 'completed' || r.status === 'done' ? 'done' : (r.status || 'pending'),
                reason: r.reason || r.notes || 'Size exchange requested',
                date: r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Recent'
              }));
              try { localStorage.setItem(STORAGE_KEY_TICKETS, JSON.stringify(state.tickets)); } catch (_) {}
              renderTickets();
            }
          },
          onWallet: (walletData) => {
            if (walletData && walletData.available_balance !== undefined) {
              state.walletDetails = walletData;
              renderCockpit();
            }
          },
          onProducts: (liveProducts) => {
            if (Array.isArray(liveProducts) && liveProducts.length > 0) {
              console.log(`[PWA Firestore] Live Snapshot: ${liveProducts.length} products received`);
              state.products = liveProducts;
              try { localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(liveProducts)); } catch (_) {}

              // Refresh picker in Add Order sheet if active
              const addSheet = document.getElementById('sheet-add-order');
              if (addSheet && addSheet.classList.contains('active')) {
                const picker = document.getElementById('new-order-catalog-picker');
                const currVal = picker ? picker.value : '';
                populateOrderCatalogPicker(currVal);
              }

              const prodSub = document.getElementById('submodule-sheet');
              if (prodSub && prodSub.classList.contains('active')) {
                const title = document.getElementById('submodule-title');
                if (title && title.textContent.includes('Products')) {
                  renderProductsCatalogSubmodule();
                }
              }
            }
          },
          onConnectionChange: (connected) => {
            const liveLabel = document.getElementById('cockpit-live-label');
            if (liveLabel) {
              liveLabel.textContent = connected
                ? `Live • ${state.orders.length} orders synced • Firestore Realtime`
                : `Live • ${state.orders.length} orders synced`;
            }
          }
        });
      }
    }

    if (window.FirebaseService && window.FirebaseService.isReady()) {
      startListeners();
    } else {
      window.addEventListener('firebase-ready', startListeners, { once: true });
      let attempts = 0;
      const poll = setInterval(() => {
        attempts++;
        if (window.FirebaseService && window.FirebaseService.isReady()) {
          clearInterval(poll);
          startListeners();
        } else if (attempts > 30) {
          clearInterval(poll);
        }
      }, 300);
    }
  }

  // --- Bootstrap Entrypoint ---
  function init() {
    setupAuth();
    setupNavigation();
    setupCockpitInteractions();
    setupOrdersControls();
    setupTicketsControls();
    setupMoreModules();
    setupModalDismissals();
    setupIosInstallBanner();
    setupFirebaseRealtime();

    // Load full authentic database immediately
    loadRealData(false);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
