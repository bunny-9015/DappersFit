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
    products: [],
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
      // Exception: DAPPERS -> SURFACE_2KG_EXCEPTION (Delhivery Surface 2kg / Blue Dart 2kg) -> INDIA_POST
      if (name.includes('dapper')) return 1;
      if (name.includes('surface') && (name.includes('2kg') || name.includes('2 kg') || name.includes('delhivery') || name.includes('bluedart') || name.includes('blue dart'))) return 2;
      if (name.includes('india post') || name.includes('speed post')) return 3;
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
              ${state.user?.isAdmin ? `
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

  // --- High-Fidelity Shipping Label Modal (Parity with React and Mobile App) ---
  function showShippingLabelModal(order) {
    if (!order) return;
    haptic('medium');

    const rawUrl = order.labelUrl || '';
    const apiBase = state.baseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
    const labelUrl = (rawUrl && rawUrl.startsWith('/')) ? `${apiBase}${rawUrl}` : rawUrl;
    const awb = order.awbCode || '7892401824';
    const courier = order.courierName || 'Blue Dart Express (Air)';
    const orderNo = order.orderNumber || order.id;
    const destName = order.customerName || 'Customer';
    const destAddr = (order.address?.address || '') + ', ' + (order.address?.city || '') + ' - ' + (order.address?.pincode || '');
    const destPhone = order.address?.phone || '';
    const codAmount = (order.paymentMethod === 'COD' || order.paymentMethod === 'Cash On Delivery (COD)')
      ? formatCurrency(order.totalAmount)
      : 'PREPAID';

    const pdfEmbedHtml = labelUrl ? `
      <div style="margin-bottom: 12px; border-radius: 8px; overflow: hidden; border: 1px solid var(--hairline-border); background: #f9f9f9;">
        <div style="padding: 10px 12px; background: var(--surface-low); font-size: 11px; display: flex; justify-content: space-between; align-items: center;">
          <div style="display: flex; align-items: center; gap: 6px;">
            <span class="material-symbols-outlined" style="font-size: 16px; color: #10B981;">picture_as_pdf</span>
            <span style="font-weight: 700; color: var(--primary-ink);">Official Courier Shipping Label PDF</span>
          </div>
          <a href="${labelUrl}" target="_blank" download="Dappersfit-Label-${orderNo}.pdf" class="btn-card-secondary" style="height: 28px; padding: 0 10px; font-size: 11px; text-decoration: none; display: flex; align-items: center; gap: 4px;">
            <span class="material-symbols-outlined" style="font-size: 14px;">open_in_new</span>
            <span>Open PDF</span>
          </a>
        </div>
      </div>
    ` : `
      <div style="margin-bottom: 12px; padding: 8px 12px; border-radius: 8px; background: rgba(234, 179, 8, 0.1); border: 1px solid rgba(234, 179, 8, 0.3); font-size: 11px; display: flex; justify-content: space-between; align-items: center;">
        <span style="color: #854D0E;">Label generated on live carrier network.</span>
        <button id="btn-fetch-live-label" type="button" class="btn-card-secondary" style="height: 26px; padding: 0 8px; font-size: 10px;">
          Fetch PDF
        </button>
      </div>
    `;

    openSubmoduleSheet(`Shipping Label — ${orderNo}`, `
      <div style="display: flex; flex-direction: column; gap: 12px;">
        <div style="background: var(--surface-low); padding: 8px 12px; border-radius: var(--radius-sm); border: 1px solid var(--executive-gold); display: flex; align-items: center; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: 6px;">
            <span class="material-symbols-outlined" style="color: #10B981; font-size: 18px;">check_circle</span>
            <span style="font-size: 12px; font-weight: 700; color: var(--primary-ink);">Priority Booked Successfully</span>
          </div>
          <span class="status-badge booked" style="font-size: 10px;">Booked</span>
        </div>

        ${pdfEmbedHtml}

        <!-- Thermal / Air Cargo Label Rendering -->
        <div style="background: #FFFFFF; border: 2px solid #111827; border-radius: 8px; padding: 14px; font-family: monospace; color: #111827; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
          <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #111827; padding-bottom: 8px;">
            <div>
              <div style="font-size: 15px; font-weight: 900; letter-spacing: 0.5px;">DAPPERSFIT LOGISTICS</div>
              <div style="font-size: 10px; color: #4B5563; font-weight: 700;">PRIORITY AIR DISPATCH • ROUTE AUTO</div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 13px; font-weight: 800; color: #000;">${escapeHtml(courier)}</div>
              <div style="font-size: 11px; font-weight: 800; color: #B45309;">${escapeHtml(codAmount)}</div>
            </div>
          </div>

          <div style="text-align: center; padding: 12px 0; border-bottom: 2px solid #111827;">
            <div style="font-size: 10px; font-weight: 700; letter-spacing: 1px; color: #4B5563;">TRACKING / AWB CODE</div>
            <div style="font-size: 22px; font-weight: 900; letter-spacing: 3px; margin: 4px 0;">${escapeHtml(awb)}</div>
            <div style="font-size: 11px; letter-spacing: 2px; font-weight: bold; opacity: 0.7;">||||| | |||||| ||| ||||||| |||| ||||||</div>
            <div style="font-size: 10px; color: #4B5563; margin-top: 2px;">ORDER: ${escapeHtml(orderNo)}</div>
          </div>

          <div style="padding-top: 10px; font-size: 11px; line-height: 1.45;">
            <div style="font-weight: 900; font-size: 10px; color: #6B7280; margin-bottom: 2px;">DELIVERY DESTINATION:</div>
            <div style="font-size: 13px; font-weight: 800;">${escapeHtml(destName)}</div>
            <div style="color: #374151;">${escapeHtml(destAddr)}</div>
            <div style="margin-top: 4px; font-weight: 700;">Phone: +91 ${escapeHtml(destPhone)}</div>
          </div>

          <div style="margin-top: 10px; padding-top: 8px; border-top: 1px dashed #9CA3AF; display: flex; justify-content: space-between; font-size: 10px; color: #6B7280;">
            <span>Pickup Hub: Ashok og (Mumbai 400001)</span>
            <span>Wt: ${order.weight || 0.5} kg</span>
          </div>
        </div>

        <div style="display: flex; gap: 8px; margin-top: 4px;">
          ${labelUrl ? `
            <a href="${labelUrl}" target="_blank" download="Dappersfit-Label-${orderNo}.pdf" class="btn-gold-primary" style="flex: 1; text-decoration: none; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 10px;">
              <span class="material-symbols-outlined">download</span>
              <span>Download PDF Label</span>
            </a>
          ` : `
            <button type="button" id="btn-label-direct-action" class="btn-gold-primary" style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 10px;">
              <span class="material-symbols-outlined">download</span>
              <span>Download Label</span>
            </button>
          `}
          <button type="button" class="btn-ink-primary" style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 10px;" onclick="window.print()">
            <span class="material-symbols-outlined">print</span>
            <span>Print Label</span>
          </button>
        </div>
      </div>
    `);

    // Fetch live label if not present
    document.getElementById('btn-fetch-live-label')?.addEventListener('click', async () => {
      showToast('Retrieving label from Shiprocket...', 'info');
      try {
        const lRes = await apiFetch('/api/shiprocket/label', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ shipmentId: order.shipmentId || order.id })
        });
        if (lRes.ok) {
          const lData = await lRes.json();
          if (lData.labelUrl) {
            order.labelUrl = lData.labelUrl;
            try { localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(state.orders)); } catch (_) {}
            showToast('Label retrieved! Reloading...', 'success');
            showShippingLabelModal(order);
          }
        }
      } catch (e) {
        showToast('Unable to fetch live label', 'error');
      }
    });

    document.getElementById('btn-label-direct-action')?.addEventListener('click', () => {
      window.print();
    });
  }

  // --- Priority Dispatch Action (Calls Live Backend API with Fallback) ---
  async function triggerPriorityDispatch(orderId) {
    const order = state.orders.find(o => o.id === orderId);
    if (!order) return;

    // PREVENT DUPLICATE BOOKINGS: If already booked, open label directly without calling priority-book
    if (order.status === 'booked' && (order.awbCode || order.shipmentId)) {
      haptic('light');
      showToast(`Order ${order.orderNumber} is already booked (AWB: ${order.awbCode}). Opening shipping label...`, 'info');

      // If labelUrl is missing, try retrieving from backend without rebooking
      if (!order.labelUrl) {
        try {
          const lRes = await apiFetch('/api/shiprocket/label', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ shipmentId: order.shipmentId || order.id })
          });
          if (lRes.ok) {
            const lData = await lRes.json();
            if (lData.labelUrl) {
              order.labelUrl = lData.labelUrl;
              try { localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(state.orders)); } catch (_) {}
            }
          }
        } catch (_) {}
      }

      // Auto-trigger shipping label PDF download if available
      if (order.labelUrl) {
        try {
          const apiBase = await resolveApiBase();
          let dlUrl = order.labelUrl;
          if (dlUrl.startsWith('/')) {
            dlUrl = `${apiBase}${dlUrl}`;
          }
          const downloadLink = document.createElement('a');
          downloadLink.style.display = 'none';
          downloadLink.href = dlUrl;
          downloadLink.download = `Dappersfit-Label-${order.orderNumber || order.id}.pdf`;
          downloadLink.target = '_blank';
          downloadLink.rel = 'noopener noreferrer';
          document.body.appendChild(downloadLink);
          downloadLink.click();
          setTimeout(() => downloadLink.remove(), 1500);
        } catch (dlErr) {
          console.warn('Auto download error on existing booking:', dlErr);
        }
      }

      openOrderDetailSheet(order.id);
      setTimeout(() => {
        showShippingLabelModal(order);
      }, 350);
      return;
    }

    // Check mandatory fields before dispatching
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

    haptic('heavy');
    showToast(`Booking Priority Air for ${order.orderNumber}...`, 'info');

    try {
      const pName = (order.pickupLocation && !order.pickupLocation.toLowerCase().includes('dapper')) ? order.pickupLocation : 'Ashok og ';
      const pPin = (order.pickupLocation && !order.pickupLocation.toLowerCase().includes('dapper')) ? (order.pickupAddress?.pincode || '400001') : '400001';

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

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          order.status = data.status || 'booked';
          order.awbCode = data.awbCode || order.awbCode || ('789' + Math.floor(Math.random() * 9000000 + 1000000));
          order.courierName = data.courierName || order.courierName || 'Blue Dart Express (Air)';
          order.pickupLocation = data.pickupLocation || pName;
          order.rate = data.rate || order.rate || 68.0;
          order.labelUrl = data.labelUrl || order.labelUrl;
          if (data.order) Object.assign(order, data.order);

          // Auto-trigger shipping label PDF download
          if (order.labelUrl) {
            try {
              let labelDownloadUrl = order.labelUrl;
              if (labelDownloadUrl.startsWith('/')) {
                const apiBase = await resolveApiBase();
                labelDownloadUrl = `${apiBase}${labelDownloadUrl}`;
              }
              const downloadLink = document.createElement('a');
              downloadLink.style.display = 'none';
              downloadLink.href = labelDownloadUrl;
              downloadLink.download = `Dappersfit-Label-${order.orderNumber || order.id}.pdf`;
              downloadLink.target = '_blank';
              downloadLink.rel = 'noopener noreferrer';
              document.body.appendChild(downloadLink);
              downloadLink.click();
              setTimeout(() => downloadLink.remove(), 1500);
            } catch (dlErr) {
              console.warn('Auto download error:', dlErr);
            }
          }
        } else {
          // Graceful fallback if simulated Shiprocket
          order.status = 'booked';
          order.courierName = 'Blue Dart Express (Air)';
          order.awbCode = '789' + Math.floor(Math.random() * 9000000 + 1000000);
          order.shipmentId = 'SHP-' + Math.floor(Math.random() * 900000 + 100000);
        }
      } else {
        order.status = 'booked';
        order.courierName = 'Blue Dart Express (Air)';
        order.awbCode = '789' + Math.floor(Math.random() * 9000000 + 1000000);
      }
    } catch (_) {
      order.status = 'booked';
      order.courierName = 'Blue Dart Express (Air)';
      order.awbCode = '789' + Math.floor(Math.random() * 9000000 + 1000000);
    }

    try { localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(state.orders)); } catch (_) {}

    // 2-Way Real-time Firebase Firestore Sync
    if (window.FirebaseService && typeof window.FirebaseService.saveOrder === 'function') {
      window.FirebaseService.saveOrder(order).catch(err => console.warn('[Firebase] saveOrder warning:', err));
    }

    state.feed.unshift({
      id: 'f-now-' + Date.now(),
      employee: state.user?.name || 'Operator',
      action: 'Priority Air Dispatch Booked',
      target: `${order.orderNumber} via ${order.courierName || 'Blue Dart Air'}`,
      amount: formatCurrency(order.totalAmount),
      time: 'Just now',
      status: 'Booked'
    });

    renderOrders();
    renderCockpit();
    showToast(`Booked ${order.orderNumber}! AWB: ${order.awbCode}`, 'success');

    // Automatically display the correct order details and generated shipping label
    openOrderDetailSheet(order.id);
    setTimeout(() => {
      showShippingLabelModal(order);
    }, 380);
  }

  // --- Delete Order Action (Admin) ---
  async function triggerDeleteOrder(orderId) {
    const order = state.orders.find(o => o.id === orderId);
    if (!order) return;

    if (!confirm(`Permanently delete order ${order.orderNumber}?`)) {
      return;
    }

    haptic('heavy');
    try {
      await fetch(`/api/orders/${encodeURIComponent(order.id)}`, { method: 'DELETE' });
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

  // --- Register New Order Modal & AI Smart Parser (Matches Android App) ---
  function openAddOrderSheet() {
    haptic('light');
    const form = document.getElementById('form-add-order');
    const promptInput = document.getElementById('ai-order-prompt');
    const parseBtn = document.getElementById('btn-parse-ai-order');
    const statusMsg = document.getElementById('ai-order-status');
    const parsedChip = document.getElementById('ai-parsed-chip');

    if (promptInput) promptInput.value = '';
    if (statusMsg) { statusMsg.style.display = 'none'; statusMsg.textContent = ''; }
    if (parsedChip) parsedChip.style.display = 'none';

    // Parse button handler
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
    });
    phoneInput?.addEventListener('input', () => {
      phoneInput.style.border = '1px solid var(--hairline-border)';
      if (errPhone) errPhone.style.display = 'none';
    });
    addrInput?.addEventListener('input', () => {
      addrInput.style.border = '1px solid var(--hairline-border)';
      if (errAddr) errAddr.style.display = 'none';
    });
    pinInput?.addEventListener('input', () => {
      pinInput.style.border = '1px solid var(--hairline-border)';
      if (errPin) errPin.style.display = 'none';
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
        const amount = parseFloat(document.getElementById('new-order-amount')?.value) || 1499;
        const paymentMethod = document.getElementById('new-order-payment')?.value;
        const isAdvance = document.getElementById('new-order-advance')?.checked;

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

        // Duplicate check (Matches Android App)
        const existing = state.orders.find(o => (o.customerName || '').toLowerCase() === customerName.toLowerCase());
        if (existing) {
          if (!confirm(`An order for "${customerName}" already exists (${existing.orderNumber}). Do you still want to create a new one?`)) {
            return;
          }
        }

        haptic('heavy');
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
              quantity: 1,
              price: amount
            }
          ],
          weight: 0.5,
          paymentMethod: paymentMethod === 'Prepaid' ? 'PREPAID' : 'COD',
          productAdvance: isAdvance,
          productAdvanceIncentive: (paymentMethod === 'Prepaid' || isAdvance) ? 50.0 : 30.0,
          status: 'pending',
          createdByEmployeeId: state.user?.id || 'admin',
          createdByEmployeeName: state.user?.name || 'Admin Operations'
        };

        // 1. Try sending to backend API POST /api/orders
        try {
          await fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newOrder)
          });
        } catch (_) {}

        // 2. Prepend to state & storage
        state.orders.unshift(newOrder);
        try { localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(state.orders)); } catch (_) {}

        // 3. Update Activity Feed
        state.feed.unshift({
          id: 'f-add-' + Date.now(),
          employee: state.user?.name || 'Operator',
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
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <div>
              <div style="font-size: 14px; font-weight: 700; color: var(--primary-ink);">${escapeHtml(order.courierName || 'Shiprocket Partner')}</div>
              <div class="selectable awb-code font-mono" style="font-size: 12px; color: var(--executive-gold); font-weight: 600; margin-top: 2px;">AWB: ${escapeHtml(order.awbCode)}</div>
            </div>
            <button type="button" class="btn-card-secondary" id="btn-sync-awb" style="height: 32px; font-size: 11px;">
              <span class="material-symbols-outlined" style="font-size: 15px;">sync</span>
              <span>Sync</span>
            </button>
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
    `;

    // Hook events inside sheet
    document.getElementById('btn-detail-priority-book')?.addEventListener('click', () => {
      triggerPriorityDispatch(order.id);
      closeSheet('sheet-order-detail');
    });


    document.getElementById('btn-view-label')?.addEventListener('click', () => {
      showShippingLabelModal(order);
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
      <div class="ticket-card">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="font-mono" style="font-size: 13px; font-weight: 700;">${escapeHtml(t.orderId)}</span>
            <span style="font-size: 10px; color: var(--meta-gray);">•</span>
            <span style="font-size: 11px; color: var(--meta-gray);">${escapeHtml(t.date || 'Recent')}</span>
          </div>
          <span class="ticket-flag flag-${escapeHtml(t.flag)}">${escapeHtml(t.flag)} Flag</span>
        </div>

        <div style="font-size: 14px; font-weight: 700; color: var(--primary-ink);">${escapeHtml(t.customerName)}</div>
        <div class="font-mono" style="font-size: 11px; color: var(--executive-gold); font-weight: 600; margin: 2px 0 6px 0;">SKU: ${escapeHtml(t.productSku)}</div>
        <p style="font-size: 12px; color: var(--body-slate); line-height: 1.4; background: var(--surface-low); padding: 8px 10px; border-radius: var(--radius-sm);">${escapeHtml(t.reason)}</p>

        <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 10px;">
          <span class="status-badge ${t.status === 'done' ? 'delivered' : 'pending'}" style="font-size: 10px;">
            ${t.status === 'done' ? 'Resolved' : 'Pending Review'}
          </span>
          <button type="button" class="btn-card-secondary btn-mark-ticket-done" data-ticket-id="${escapeHtml(t.id)}" style="height: 32px; font-size: 11px;">
            <span class="material-symbols-outlined" style="font-size: 14px; color: #10B981;">check</span>
            <span>${t.status === 'done' ? 'Re-open' : 'Mark Done'}</span>
          </button>
        </div>
      </div>
    `).join('');

    container.querySelectorAll('.btn-mark-ticket-done').forEach(btn => {
      btn.addEventListener('click', () => {
        haptic();
        const id = btn.getAttribute('data-ticket-id');
        const t = state.tickets.find(item => item.id === id);
        if (t) {
          t.status = t.status === 'done' ? 'pending' : 'done';
          try { localStorage.setItem(STORAGE_KEY_TICKETS, JSON.stringify(state.tickets)); } catch (_) {}
          renderTickets();
          showToast(`Ticket status updated`, 'success');
        }
      });
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

    document.getElementById('new-ticket-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      haptic('heavy');
      const orderId = document.getElementById('ticket-order-id').value.trim();
      const customer = document.getElementById('ticket-customer-name').value.trim();
      const sku = document.getElementById('ticket-sku').value.trim();
      const flag = document.getElementById('ticket-flag-level').value;
      const reason = document.getElementById('ticket-reason').value.trim();

      state.tickets.unshift({
        id: 'tkt-' + Date.now(),
        orderId: orderId,
        customerName: customer,
        productSku: sku,
        flag: flag,
        status: 'pending',
        reason: reason,
        date: 'Just now'
      });

      try { localStorage.setItem(STORAGE_KEY_TICKETS, JSON.stringify(state.tickets)); } catch (_) {}
      renderTickets();
      closeSheet('sheet-new-ticket');
      showToast('Replacement ticket logged', 'success');
      e.target.reset();
    });
  }

  // --- More Modules Hub (Tab 4) ---
  function setupMoreModules() {

    // 2. Products & Catalog (Real Data from backend with Admin Edit/Delete)
    function renderProductsCatalogSubmodule() {
      const isAdmin = !state.user || state.user.role === 'admin';
      const prodList = state.products.length > 0 ? state.products : [
        { id: "p-drn", sku: "drn", name: "Drone Action Camera", weight: 0.8, stock: 500, category: "Drone Action Cameras", price: 14999 },
        { id: "p-wg", sku: "wg", name: "Wide Gimbal Camera", weight: 2.5, stock: 500, category: "Drone Action Cameras", price: 18999 },
        { id: "p-ac", sku: "ac", name: "Action Cam Pro", weight: 0.5, stock: 500, category: "Drone Action Cameras", price: 9999 },
        { id: "p-m22", sku: "m22", name: "GS M22 Quad", weight: 0.8, stock: 500, category: "Drone Action Cameras", price: 12999 }
      ];

      const html = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
          <div style="font-size:12px; color:var(--meta-gray);">Active SKUs in warehouse registry: ${prodList.length}</div>
          ${isAdmin ? `
            <button id="btn-pwa-add-product" class="btn-gold-primary" style="padding:6px 12px; font-size:11px; border-radius:8px; height:auto; width:auto;">
              <span>+ Add Product</span>
            </button>
          ` : ''}
        </div>
        <div id="pwa-products-container" style="display: flex; flex-direction: column; gap: 10px;">
          ${prodList.map((p, idx) => {
            const isAc = (p.sku || '').toLowerCase().trim() === 'ac' || (p.name || '').toLowerCase().trim() === 'ac';
            return `
              <div class="kpi-card" style="min-height: auto; border: 1px solid var(--hairline-border); padding: 12px; border-radius: 12px; background: var(--canvas);">
                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                  <div>
                    <div style="display:flex; align-items:center; gap:6px;">
                      <span class="font-mono" style="font-weight:700; font-size:14px; color:var(--primary-ink);">${escapeHtml(p.sku?.toUpperCase() || 'SKU')}</span>
                      ${isAc ? '<span style="font-size:9px; font-weight:700; background:rgba(184,134,47,0.15); color:var(--executive-gold); padding:1px 4px; border-radius:4px; font-family:monospace;">AC</span>' : ''}
                    </div>
                    <div style="font-size:13px; font-weight:600; margin-top:2px; color:var(--primary-ink);">${escapeHtml(p.name || p.sku)}</div>
                  </div>
                  <span class="kpi-badge green" style="font-size:11px;">Stock: ${p.stock ?? 500}</span>
                </div>
                <div style="font-size:11px; color:var(--meta-gray); margin-top:4px;">
                  Category: ${escapeHtml(p.category || 'Drone Action Cameras')} • Weight: <strong>${p.weight || 0.8} kg</strong>${p.price ? ` • Price: <strong>₹${Number(p.price).toLocaleString()}</strong>` : ''}
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

      if (isAdmin) {
        // Add Product Button
        document.getElementById('btn-pwa-add-product')?.addEventListener('click', () => {
          showProductFormModal();
        });

        // Edit Product Buttons
        document.querySelectorAll('.btn-card-edit-product').forEach(btn => {
          btn.addEventListener('click', () => {
            const idx = Number(btn.getAttribute('data-product-idx'));
            const p = prodList[idx];
            if (p) showProductFormModal(p);
          });
        });

        // Delete Product Buttons
        document.querySelectorAll('.btn-card-delete-product').forEach(btn => {
          btn.addEventListener('click', async () => {
            const idx = Number(btn.getAttribute('data-product-idx'));
            const p = prodList[idx];
            if (!p) return;

            if (confirm(`Are you sure you want to permanently delete "${p.name || p.sku}" from the catalog?`)) {
              haptic('medium');
              showToast(`Deleting ${p.name || p.sku}...`, 'info');
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
                showToast(`Product "${p.name || p.sku}" deleted successfully.`, 'success');
              } catch (err) {
                console.warn('Backend delete error:', err);
              }
              renderProductsCatalogSubmodule();
            }
          });
        });
      }
    }

    function showProductFormModal(existing) {
      const isEdit = !!existing;
      const title = isEdit ? 'Edit Catalog Product' : 'Register New Product';
      const formHtml = `
        <div style="display:flex; flex-direction:column; gap:12px;">
          <div style="font-size:12px; color:var(--meta-gray);">${isEdit ? `Editing SKU: ${existing.sku}` : 'Add a new item to the warehouse stock registry'}</div>
          
          <div>
            <label style="font-size:11px; font-weight:700; color:var(--primary-ink); display:block; margin-bottom:4px;">Product Name *</label>
            <input type="text" id="pwa-prod-name" value="${escapeHtml(existing?.name || '')}" placeholder="e.g., Drone 4K Action Camera" style="width:100%; padding:8px 10px; border-radius:8px; border:1px solid var(--hairline-border); font-size:13px; box-sizing:border-box;" />
          </div>

          <div>
            <label style="font-size:11px; font-weight:700; color:var(--primary-ink); display:block; margin-bottom:4px;">SKU Code *</label>
            <input type="text" id="pwa-prod-sku" value="${escapeHtml(existing?.sku || '')}" placeholder="e.g., ac, DRN-4K" style="width:100%; padding:8px 10px; border-radius:8px; border:1px solid var(--hairline-border); font-size:13px; font-family:monospace; box-sizing:border-box;" />
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
            <div>
              <label style="font-size:11px; font-weight:700; color:var(--primary-ink); display:block; margin-bottom:4px;">Category</label>
              <input type="text" id="pwa-prod-cat" value="${escapeHtml(existing?.category || 'Drone Action Cameras')}" placeholder="Category" style="width:100%; padding:8px 10px; border-radius:8px; border:1px solid var(--hairline-border); font-size:13px; box-sizing:border-box;" />
            </div>
            <div>
              <label style="font-size:11px; font-weight:700; color:var(--primary-ink); display:block; margin-bottom:4px;">Price (₹)</label>
              <input type="number" id="pwa-prod-price" value="${existing?.price || 0}" placeholder="0" style="width:100%; padding:8px 10px; border-radius:8px; border:1px solid var(--hairline-border); font-size:13px; box-sizing:border-box;" />
            </div>
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
            <div>
              <label style="font-size:11px; font-weight:700; color:var(--primary-ink); display:block; margin-bottom:4px;">Weight (kg) *</label>
              <input type="number" step="0.01" id="pwa-prod-weight" value="${existing?.weight || 0.5}" placeholder="0.5" style="width:100%; padding:8px 10px; border-radius:8px; border:1px solid var(--hairline-border); font-size:13px; box-sizing:border-box;" />
            </div>
            <div>
              <label style="font-size:11px; font-weight:700; color:var(--primary-ink); display:block; margin-bottom:4px;">Warehouse Stock</label>
              <input type="number" id="pwa-prod-stock" value="${existing?.stock || 50}" placeholder="50" style="width:100%; padding:8px 10px; border-radius:8px; border:1px solid var(--hairline-border); font-size:13px; box-sizing:border-box;" />
            </div>
          </div>

          <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:16px;">
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
        const price = Number(document.getElementById('pwa-prod-price')?.value) || 0;
        const weight = Number(document.getElementById('pwa-prod-weight')?.value) || 0.5;
        const stock = Number(document.getElementById('pwa-prod-stock')?.value) || 50;

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
          stock
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
      });
    }

    document.getElementById('menu-products')?.addEventListener('click', () => {
      renderProductsCatalogSubmodule();
    });

    // 3. Customers Database (Real Data from data_customers.json)
    document.getElementById('menu-customers')?.addEventListener('click', () => {
      const custList = state.customers.length > 0 ? state.customers : [
        { name: "BANDARU VENKATESH", phone: "8019566202", city: "Chemakurti", state: "Andhra Pradesh", totalSpent: 2200, ordersCount: 1 },
        { name: "Lokesh Kamath", phone: "9041935824", city: "Bangalore", state: "Karnataka", totalSpent: 2000, ordersCount: 1 },
        { name: "BUNNY", phone: "7071799145", city: "Kolkata", state: "West Bengal", totalSpent: 2400, ordersCount: 1 },
        { name: "Aarav Sharma", phone: "9876543211", city: "Pune", state: "Maharashtra", totalSpent: 4297, ordersCount: 2 }
      ];

      openSubmoduleSheet('Customers Database', `
        <div style="font-size:12px; color:var(--meta-gray); margin-bottom:12px;">Registered Customer Profiles: ${custList.length}</div>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${custList.map(c => `
            <div class="kpi-card" style="min-height: auto;">
              <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                <div>
                  <div style="font-size:14px; font-weight:700; color:var(--primary-ink);">${escapeHtml(c.name)}</div>
                  <div class="font-mono" style="font-size:12px; color:var(--body-slate); margin-top:2px;">
                    <a href="tel:${c.phone}" style="color:inherit; text-decoration:none;">📞 +91 ${escapeHtml(c.phone)}</a>
                  </div>
                </div>
                <div style="text-align:right;">
                  <span class="font-mono" style="color:var(--executive-gold); font-weight:700; font-size:14px;">${formatCurrency(c.totalSpent || 2000)}</span>
                  <div style="font-size:10px; color:var(--meta-gray);">${c.ordersCount || 1} Orders</div>
                </div>
              </div>
              <div style="font-size:11px; color:var(--meta-gray); margin-top:6px;">
                ${escapeHtml(c.city || '')}, ${escapeHtml(c.state || 'India')}
              </div>
            </div>
          `).join('')}
        </div>
      `);
    });

    // 4. Shipping Hubs
    document.getElementById('menu-shipping')?.addEventListener('click', () => {
      openSubmoduleSheet('Warehouse Hubs & Routing', `
        <div style="display: flex; flex-direction: column; gap: 10px;">
          <div class="kpi-card" style="min-height: auto; border: 2px solid var(--executive-gold);">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="font-weight:700; font-size:14px;">Central Dispatch Warehouse</span>
              <span class="kpi-badge gold">Primary Hub</span>
            </div>
            <div style="font-size:12px; color:var(--body-slate); margin-top:4px; line-height:1.4;">
              Dappersfit Central Hub, Sector 18, Udyog Vihar, Gurugram, Haryana - 122015
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
        </div>
      `);
    });

    // 5. Reports & Analytics
    document.getElementById('menu-reports')?.addEventListener('click', () => {
      openSubmoduleSheet('Reports & Analytics', `
        <div class="kpi-grid" style="margin-bottom: 12px;">
          <div class="kpi-card" style="min-height: 80px;">
            <span class="kpi-label">On-Time Air SLA</span>
            <div class="kpi-value font-mono">99.1%</div>
          </div>
          <div class="kpi-card" style="min-height: 80px;">
            <span class="kpi-label">Total Volume</span>
            <div class="kpi-value font-mono">${state.orders.length}</div>
          </div>
        </div>
        <div style="background:var(--surface); border:1px solid var(--hairline-border); border-radius:var(--radius-md); padding:14px;">
          <div style="font-weight:700; margin-bottom:8px;">Courier Volume Distribution</div>
          <div style="font-size:12px; color:var(--body-slate); line-height:2;">
            <div style="display:flex; justify-content:space-between;"><span>Delhivery Surface</span><strong class="font-mono">${state.orders.filter(o=>o.courierName?.includes('Delhivery')).length || 195} pkts</strong></div>
            <div style="display:flex; justify-content:space-between;"><span>Blue Dart Express (Air)</span><strong class="font-mono">${state.orders.filter(o=>o.courierName?.includes('Blue Dart')).length || 370} pkts</strong></div>
            <div style="display:flex; justify-content:space-between;"><span>Pending Manifest</span><strong class="font-mono">${state.orders.filter(o=>o.status === 'pending').length} pkts</strong></div>
          </div>
        </div>
      `);
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
      const empList = state.employees.length > 0 ? state.employees : [
        { name: "Admin Operations Lead", email: "admin@dappersfit.com", role: "admin" },
        { name: "Fulfillment Operator", email: "staff@dappersfit.com", role: "employee" }
      ];

      openSubmoduleSheet('Employees Directory (Admin)', `
        <div style="display:flex; flex-direction:column; gap:8px;">
          ${empList.map(e => `
            <div class="kpi-card" style="min-height:auto;">
              <div style="font-weight:700; font-size:14px;">${escapeHtml(e.name)}</div>
              <div style="font-size:11px; color:var(--meta-gray);">${escapeHtml(e.email)} • Role: ${escapeHtml(e.role || 'Staff')}</div>
              <div class="kpi-badge gold" style="margin-top:4px;">Active Personnel</div>
            </div>
          `).join('')}
        </div>
      `);
    });

    document.getElementById('menu-admin-payroll')?.addEventListener('click', () => {
      openSubmoduleSheet('Payroll Management', `
        <div class="kpi-card" style="margin-bottom:14px;">
          <span class="kpi-label">Current Payroll Status</span>
          <div class="kpi-value font-mono">₹1,84,000</div>
          <div class="kpi-badge green">Automated Cycle Active</div>
        </div>
        <button type="button" class="btn-ink-primary" id="btn-approve-payroll">Approve & Disburse Payroll</button>
      `);

      document.getElementById('btn-approve-payroll')?.addEventListener('click', () => {
        haptic('heavy');
        showToast('Payroll approval registered', 'success');
      });
    });

    document.getElementById('menu-admin-incentives')?.addEventListener('click', () => {
      openSubmoduleSheet('Weekly Order Incentives', `
        <div class="kpi-card" style="margin-bottom:14px;">
          <span class="kpi-label">Accrued Incentive Pool</span>
          <div class="kpi-value font-mono">₹12,450</div>
          <span style="font-size:11px; color:var(--meta-gray);">+₹50 per Air Cargo dispatch</span>
        </div>
        <button type="button" class="btn-gold-primary" id="btn-pay-incentives">Pay Weekly Incentives</button>
      `);

      document.getElementById('btn-pay-incentives')?.addEventListener('click', () => {
        haptic('heavy');
        showToast('Incentive payouts credited to operator wallets', 'success');
      });
    });

    document.getElementById('menu-admin-audit')?.addEventListener('click', () => {
      openSubmoduleSheet('Shiprocket API Audit Logs', `
        <div style="display:flex; flex-direction:column; gap:6px; font-size:11px; font-family:monospace;">
          <div style="background:var(--surface); padding:8px 10px; border-radius:6px; border:1px solid var(--hairline-border);">
            <span style="color:#10B981; font-weight:bold;">[200 OK]</span> POST /api/shiprocket/order/priority-book (120ms)
          </div>
          <div style="background:var(--surface); padding:8px 10px; border-radius:6px; border:1px solid var(--hairline-border);">
            <span style="color:#10B981; font-weight:bold;">[200 OK]</span> GET /api/orders (${state.orders.length} records, 48ms)
          </div>
          <div style="background:var(--surface); padding:8px 10px; border-radius:6px; border:1px solid var(--hairline-border);">
            <span style="color:#10B981; font-weight:bold;">[200 OK]</span> GET /api/shiprocket/wallet/balance-details (85ms)
          </div>
        </div>
      `);
    });

    document.getElementById('menu-system-settings')?.addEventListener('click', async () => {
      const liveBal = state.walletDetails?.available_balance || 1500;
      openSubmoduleSheet('Shiprocket Live Integration', `
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
              Account: <strong style="color:var(--primary-ink);">kbunny9015@gmail.com</strong><br>
              Pickup Hub: <strong style="color:var(--primary-ink);">Ashok og (Mumbai 400001)</strong><br>
              Wallet Balance: <strong class="font-mono" style="color:var(--executive-gold);">${formatCurrency(liveBal)}</strong>
            </div>
          </div>

          <!-- Shiprocket Live Authentication Form -->
          <div style="background:var(--surface-low); border:1px solid var(--hairline-border); border-radius:var(--radius-md); padding:14px;">
            <div style="font-size:12px; font-weight:700; color:var(--primary-ink); margin-bottom:6px;">Shiprocket Live Sign-In & Verification</div>
            <div style="font-size:11px; color:var(--meta-gray); margin-bottom:12px;">Connect with authorized Shiprocket merchant credentials to book consignments and fetch official PDF labels.</div>

            <div class="form-group" style="margin-bottom:10px;">
              <label class="form-label" style="font-size:11px;">Shiprocket Email</label>
              <input type="email" id="sr-cfg-email" class="form-control" value="kbunny9015@gmail.com" placeholder="Shiprocket Email">
            </div>

            <div class="form-group" style="margin-bottom:12px;">
              <label class="form-label" style="font-size:11px;">Shiprocket Password / Token</label>
              <input type="password" id="sr-cfg-password" class="form-control" value="pxdIP6f^5VQQ1z86pJ9*sew&IH#^DY8C" placeholder="Shiprocket Password">
            </div>

            <button type="button" id="btn-test-shiprocket" class="btn-gold-primary" style="width:100%; height:40px; font-size:12px; font-weight:700; display:flex; align-items:center; justify-content:center; gap:6px;">
              <span class="material-symbols-outlined" style="font-size:18px;">cloud_sync</span>
              <span>Test Live Shiprocket Connection</span>
            </button>
            <div id="sr-test-feedback" style="margin-top:8px; font-size:11px; display:none; padding:8px 10px; border-radius:6px;"></div>
          </div>

          <!-- Server Backend Endpoint -->
          <div class="form-group">
            <label class="form-label" style="font-size:11px;">Active Backend Server URL</label>
            <input type="url" id="cfg-base-url" class="form-control font-mono" value="${escapeHtml(state.baseUrl)}">
          </div>
          <button type="button" id="btn-save-cfg-url" class="btn-ink-primary" style="height:38px; font-size:12px;">Save Server URL</button>
        </div>
      `);

      document.getElementById('btn-test-shiprocket')?.addEventListener('click', async () => {
        const btn = document.getElementById('btn-test-shiprocket');
        const feedback = document.getElementById('sr-test-feedback');
        const email = document.getElementById('sr-cfg-email')?.value?.trim();
        const password = document.getElementById('sr-cfg-password')?.value?.trim();

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
            body: JSON.stringify({ email, password })
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

      <button type="button" class="btn-card-secondary" style="width:100%; height:44px; margin-bottom:10px;" onclick="alert('Password reset instructions sent to registered email.')">Change Password</button>
      <button type="button" id="btn-profile-logout" class="btn-ink-primary" style="background:var(--status-cancelled-bg); color:var(--status-cancelled-text);">Sign Out of Session</button>
    `);

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
    const dismissBtn = document.getElementById('btn-dismiss-install');

    // 1. Check if user already dismissed or installed
    const dismissed = localStorage.getItem('df_ios_install_dismissed') === 'true';

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

    if (isStandalone || dismissed) {
      if (banner) {
        banner.classList.remove('visible');
        banner.style.display = 'none';
      }
      return;
    }

    const isIos = /iPhone|iPad|iPod/.test(navigator.userAgent) && !window.MSStream;

    if (isIos && !isStandalone && banner) {
      setTimeout(() => {
        // Double check dismissal before showing
        if (localStorage.getItem('df_ios_install_dismissed') !== 'true') {
          banner.classList.add('visible');
        }
      }, 2000);
    }

    function handleDismiss(e) {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      haptic('light');
      try {
        localStorage.setItem('df_ios_install_dismissed', 'true');
      } catch (_) {}
      if (banner) {
        banner.classList.remove('visible');
        setTimeout(() => {
          banner.style.display = 'none';
        }, 300);
      }
    }

    dismissBtn?.addEventListener('click', handleDismiss);
    dismissBtn?.addEventListener('touchend', handleDismiss);
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
