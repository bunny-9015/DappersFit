/**
 * Shiprocket Courier Booking & Shipping Label Generation Module
 * Production-ready Vanilla JavaScript Implementation
 * 
 * Strict Architectural Specifications:
 * 1. Idempotency & Duplicate Prevention:
 *    - Instantly disables 'Book Courier' button and changes text to "Processing..."
 *    - Backend database status checked first ('processing' or 'processed' -> 409 Rejected)
 *    - Backend locks status to 'processing' right away
 * 2. Sequential Shiprocket API Execution:
 *    - a. Create Order API (/v1/external/orders/create/adhoc)
 *    - b. Generate AWB API (/v1/external/courier/assign/awb)
 *    - c. Generate Shipping Label API (/v1/external/courier/generate/label)
 *    - Captures label URL returned by Shiprocket
 * 3. Success & Automatic Download Flow:
 *    - Updates database order status to 'processed' and saves label URL
 *    - Backend sends label URL back to frontend
 *    - Frontend triggers automatic PDF download in browser
 *    - Changes button state to 'Processed' with green background
 * 4. Failure & Retry Handling:
 *    - Catches error (e.g., low wallet balance or network error)
 *    - Updates database status to 'failed' and saves error message
 *    - Frontend catches error, changes button text to 'Failed - Retry', re-enables button
 *    - Shows toast/alert with exact error message
 */

// Global State
let ordersCache = [];
let currentOrder = null;
let currentSimulation = 'none';

// DOM Elements
const bookCourierBtn = document.getElementById('book-courier-btn');
const resetOrderBtn = document.getElementById('reset-order-btn');
const duplicateTestBtn = document.getElementById('duplicate-test-btn');
const orderSelect = document.getElementById('order-select');
const courierSelect = document.getElementById('courier-select');
const simSelect = document.getElementById('sim-select');
const toastContainer = document.getElementById('toast-container');

// Order Info Fields
const orderNumberEl = document.getElementById('order-number');
const orderStatusBadge = document.getElementById('order-status-badge');
const customerNameEl = document.getElementById('customer-name');
const customerPhoneEl = document.getElementById('customer-phone');
const customerAddressEl = document.getElementById('customer-address');
const orderAmountEl = document.getElementById('order-amount');
const orderWeightEl = document.getElementById('order-weight');
const awbDisplayEl = document.getElementById('awb-display');
const shipmentIdDisplayEl = document.getElementById('shipment-id-display');
const labelUrlDisplayEl = document.getElementById('label-url-display');
const errorAlertBox = document.getElementById('error-alert-box');
const errorAlertMessage = document.getElementById('error-alert-message');
const downloadLabelBtn = document.getElementById('download-label-btn');

/**
 * Display toast notification
 * @param {string} message 
 * @param {'success'|'error'|'info'|'warning'} type 
 * @param {number} duration 
 */
function showToast(message, type = 'info', duration = 5000) {
  if (!toastContainer) {
    alert(message);
    return;
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  const icon = document.createElement('span');
  icon.className = 'toast-icon';
  if (type === 'success') icon.innerHTML = '&#10004;';
  else if (type === 'error') icon.innerHTML = '&#9888;';
  else icon.innerHTML = '&#8505;';

  const text = document.createElement('span');
  text.className = 'toast-message';
  text.textContent = message;

  const closeBtn = document.createElement('button');
  closeBtn.className = 'toast-close';
  closeBtn.innerHTML = '&times;';
  closeBtn.onclick = () => toast.remove();

  toast.appendChild(icon);
  toast.appendChild(text);
  toast.appendChild(closeBtn);
  toastContainer.appendChild(toast);

  // Entrance animation
  setTimeout(() => toast.classList.add('show'), 10);

  // Auto dismissal
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/**
 * Trigger programmatic browser PDF download
 * @param {string} url 
 * @param {string} filename 
 */
function triggerPDFDownload(url, filename) {
  if (!url) return;
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename || 'Shipping_Label.pdf');
  link.setAttribute('target', '_blank');
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Fetch available orders from backend
 */
async function loadOrders() {
  try {
    const res = await fetch('/api/orders');
    const data = await res.json();
    if (data.orders && Array.isArray(data.orders)) {
      ordersCache = data.orders;
      populateOrderDropdown(ordersCache);
    }
  } catch (err) {
    console.error('Failed to load orders:', err);
    showToast('Failed to load orders from database', 'error');
  }
}

/**
 * Populate order selector dropdown
 * @param {Array} orders 
 */
function populateOrderDropdown(orders) {
  if (!orderSelect) return;
  orderSelect.innerHTML = '';

  if (orders.length === 0) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = 'No orders available';
    orderSelect.appendChild(opt);
    return;
  }

  orders.forEach((order) => {
    const opt = document.createElement('option');
    opt.value = order.id;
    const statusText = order.status ? `[${order.status.toUpperCase()}]` : '[PENDING]';
    opt.textContent = `${order.orderNumber} - ${order.customerName} - ₹${order.totalAmount} ${statusText}`;
    orderSelect.appendChild(opt);
  });

  // Select first order by default or keep current
  if (!currentOrder || !orders.some(o => o.id === currentOrder.id)) {
    selectOrder(orders[0].id);
  } else {
    selectOrder(currentOrder.id);
  }
}

/**
 * Select and display details of a specific order
 * @param {string} orderId 
 */
function selectOrder(orderId) {
  const order = ordersCache.find(o => String(o.id) === String(orderId));
  if (!order) return;

  currentOrder = order;
  if (orderSelect) orderSelect.value = order.id;

  // Update view fields
  if (orderNumberEl) orderNumberEl.textContent = order.orderNumber || order.id;
  if (customerNameEl) customerNameEl.textContent = order.customerName || 'N/A';
  if (customerPhoneEl) customerPhoneEl.textContent = (order.address && order.address.phone) || 'N/A';
  if (customerAddressEl) {
    const addr = order.address || {};
    customerAddressEl.textContent = `${addr.address || ''}, ${addr.city || ''}, ${addr.state || ''} - ${addr.pincode || ''}`;
  }
  if (orderAmountEl) orderAmountEl.textContent = `₹${order.totalAmount || 0}`;
  if (orderWeightEl) orderWeightEl.textContent = `${order.weight || 0.5} kg`;

  // Live AWB & Shipment Details
  if (awbDisplayEl) awbDisplayEl.textContent = order.awbCode || 'Not Assigned';
  if (shipmentIdDisplayEl) shipmentIdDisplayEl.textContent = order.shipmentId || 'Not Generated';
  
  if (labelUrlDisplayEl) {
    labelUrlDisplayEl.textContent = order.labelUrl ? 'Generated & Ready' : 'None';
  }
  if (downloadLabelBtn) {
    if (order.labelUrl) {
      downloadLabelBtn.style.display = 'inline-flex';
      downloadLabelBtn.onclick = () => triggerPDFDownload(order.labelUrl, `Label_${order.orderNumber}.pdf`);
    } else {
      downloadLabelBtn.style.display = 'none';
    }
  }

  // Update status badge
  updateStatusBadge(order.status || 'pending');

  // Update Error box if order has errorMessage
  if (errorAlertBox && errorAlertMessage) {
    if (order.status === 'failed' && order.errorMessage) {
      errorAlertBox.style.display = 'block';
      errorAlertMessage.textContent = order.errorMessage;
    } else {
      errorAlertBox.style.display = 'none';
    }
  }

  // Synchronize button state based on order status
  syncButtonState(order.status);
}

/**
 * Update the status badge appearance
 * @param {string} status 
 */
function updateStatusBadge(status) {
  if (!orderStatusBadge) return;
  orderStatusBadge.className = 'status-badge';
  orderStatusBadge.textContent = (status || 'pending').toUpperCase();

  switch ((status || '').toLowerCase()) {
    case 'processed':
    case 'shipped':
    case 'delivered':
      orderStatusBadge.classList.add('status-processed');
      break;
    case 'processing':
      orderStatusBadge.classList.add('status-processing');
      break;
    case 'failed':
      orderStatusBadge.classList.add('status-failed');
      break;
    default:
      orderStatusBadge.classList.add('status-pending');
      break;
  }
}

/**
 * Synchronize the 'Book Courier' button state to match requirements
 * @param {string} status 
 */
function syncButtonState(status) {
  if (!bookCourierBtn) return;

  const normalized = (status || '').toLowerCase();

  if (normalized === 'processed' || normalized === 'shipped') {
    // "change the button state to 'Processed' with a green background"
    bookCourierBtn.textContent = 'Processed';
    bookCourierBtn.disabled = true;
    bookCourierBtn.style.backgroundColor = '#16a34a';
    bookCourierBtn.style.color = '#ffffff';
    bookCourierBtn.style.cursor = 'default';
  } else if (normalized === 'processing') {
    // "instantly disable the 'Book Courier' button and change its text to a loading state ("Processing...")."
    bookCourierBtn.textContent = 'Processing...';
    bookCourierBtn.disabled = true;
    bookCourierBtn.style.backgroundColor = '#d97706';
    bookCourierBtn.style.color = '#ffffff';
    bookCourierBtn.style.cursor = 'not-allowed';
  } else if (normalized === 'failed') {
    // "change the button text to 'Failed - Retry', re-enable the button so the user can fix their wallet/details"
    bookCourierBtn.textContent = 'Failed - Retry';
    bookCourierBtn.disabled = false;
    bookCourierBtn.style.backgroundColor = '#dc2626';
    bookCourierBtn.style.color = '#ffffff';
    bookCourierBtn.style.cursor = 'pointer';
  } else {
    // Default initial / pending state
    bookCourierBtn.textContent = 'Book Courier';
    bookCourierBtn.disabled = false;
    bookCourierBtn.style.backgroundColor = '';
    bookCourierBtn.style.color = '';
    bookCourierBtn.style.cursor = 'pointer';
  }
}

/**
 * CORE EXECUTION: Book Courier Order via Shiprocket
 * Strictly adheres to Idempotency, Sequential Execution, Success, and Failure rules
 */
async function handleBookCourier() {
  if (!currentOrder) {
    showToast('Please select an order first.', 'warning');
    return;
  }

  // =========================================================================
  // 1. FRONTEND IDEMPOTENCY & LOADING STATE
  // "The frontend must instantly disable the 'Book Courier' button and change
  // its text to a loading state ("Processing...")."
  // =========================================================================
  bookCourierBtn.disabled = true;
  bookCourierBtn.textContent = 'Processing...';
  bookCourierBtn.style.backgroundColor = '#d97706';
  bookCourierBtn.style.color = '#ffffff';
  bookCourierBtn.style.cursor = 'not-allowed';

  // Optimistically set status badge to processing
  updateStatusBadge('processing');
  if (errorAlertBox) errorAlertBox.style.display = 'none';

  const orderId = currentOrder.id;
  const courierName = courierSelect ? courierSelect.value : 'Delhivery Surface';
  const simVal = simSelect ? simSelect.value : 'sandbox';
  const isSandbox = simVal === 'sandbox';
  const simulateFailure = (simVal === 'wallet' || simVal === 'network') ? simVal : 'none';

  try {
    // =========================================================================
    // 2. BACKEND CALL TO SEQUENTIAL SHIPROCKET HANDLER
    // Backend checks database status first (rejects if processing/processed)
    // and locks database status to 'processing' right away.
    // Sequential execution:
    // a. Create Order API (/v1/external/orders/create/adhoc)
    // b. Generate AWB API (/v1/external/courier/assign/awb)
    // c. Generate Shipping Label API (/v1/external/courier/generate/label)
    // =========================================================================
    const response = await fetch('/api/shiprocket/book-courier', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        orderId,
        courierName,
        sandbox: isSandbox,
        simulateFailure
      })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      // Backend returned error (e.g. 409 already processing/processed, or 400 failure)
      throw new Error(data.error || `HTTP error ${response.status}: Failed to book courier.`);
    }

    // =========================================================================
    // 3. SUCCESS & AUTOMATIC DOWNLOAD FLOW
    // "On success, update the database order status to 'processed' and save the label URL.
    // Send the label URL back to the frontend.
    // The frontend must automatically trigger a PDF download of the shipping label
    // in the browser and change the button state to 'Processed' with a green background."
    // =========================================================================
    
    // Update local cache & UI
    currentOrder.status = 'processed';
    currentOrder.awbCode = data.awbCode;
    currentOrder.shipmentId = data.shipmentId;
    currentOrder.shiprocketOrderId = data.shiprocketOrderId;
    currentOrder.courierName = data.courierName;
    currentOrder.labelUrl = data.labelUrl;
    currentOrder.errorMessage = null;

    updateStatusBadge('processed');
    if (awbDisplayEl) awbDisplayEl.textContent = data.awbCode || 'Assigned';
    if (shipmentIdDisplayEl) shipmentIdDisplayEl.textContent = data.shipmentId || 'Generated';
    if (labelUrlDisplayEl) labelUrlDisplayEl.textContent = 'Captured & Downloaded';
    if (downloadLabelBtn) {
      downloadLabelBtn.style.display = 'inline-flex';
      downloadLabelBtn.onclick = () => triggerPDFDownload(data.labelUrl, `Label_${currentOrder.orderNumber}.pdf`);
    }

    // Update button state: "Processed" with green background
    bookCourierBtn.textContent = 'Processed';
    bookCourierBtn.disabled = true;
    bookCourierBtn.style.backgroundColor = '#16a34a';
    bookCourierBtn.style.color = '#ffffff';
    bookCourierBtn.style.cursor = 'default';

    // Automatic trigger PDF download of shipping label in the browser
    if (data.labelUrl) {
      console.log('[Vanilla JS] Automatically triggering shipping label PDF download:', data.labelUrl);
      triggerPDFDownload(data.labelUrl, `Label_${currentOrder.orderNumber || data.awbCode}.pdf`);
    }

    showToast(`Order processed successfully! AWB: ${data.awbCode}. Shipping label downloaded.`, 'success', 6000);
    
    // Refresh dropdown items to reflect new status
    loadOrders();

  } catch (err) {
    // =========================================================================
    // 4. FAILURE & RETRY HANDLING
    // "The frontend must catch the error, change the button text to 'Failed - Retry',
    // re-enable the button so the user can fix their wallet/details, and show an
    // alert/toast with the exact error message."
    // =========================================================================
    console.error('[Vanilla JS] Courier booking failed:', err);

    const errorMessage = err.message || 'Courier booking failed. Please try again.';

    // Update order status in UI
    currentOrder.status = 'failed';
    currentOrder.errorMessage = errorMessage;
    updateStatusBadge('failed');

    // Change button text to 'Failed - Retry' and re-enable button
    bookCourierBtn.textContent = 'Failed - Retry';
    bookCourierBtn.disabled = false;
    bookCourierBtn.style.backgroundColor = '#dc2626';
    bookCourierBtn.style.color = '#ffffff';
    bookCourierBtn.style.cursor = 'pointer';

    // Show alert box with exact error
    if (errorAlertBox && errorAlertMessage) {
      errorAlertBox.style.display = 'block';
      errorAlertMessage.textContent = errorMessage;
    }

    // Show toast with exact error message
    showToast(errorMessage, 'error', 7000);

    // Refresh orders in background to keep statuses synced
    loadOrders();
  }
}

/**
 * Reset order back to 'pending' state for quick re-testing
 */
async function handleResetOrder() {
  if (!currentOrder) return;
  try {
    resetOrderBtn.disabled = true;
    resetOrderBtn.textContent = 'Resetting...';

    const res = await fetch(`/api/orders/${currentOrder.id}/reset-status`, { method: 'POST' });
    const data = await res.json();
    if (data.success && data.order) {
      currentOrder = data.order;
      showToast(`Order ${currentOrder.orderNumber} reset to PENDING status`, 'info');
      await loadOrders();
      selectOrder(currentOrder.id);
    }
  } catch (err) {
    console.error('Reset failed:', err);
    showToast('Failed to reset order status', 'error');
  } finally {
    resetOrderBtn.disabled = false;
    resetOrderBtn.textContent = 'Reset Order Status';
  }
}

/**
 * Trigger intentional concurrent duplicate booking to test backend idempotency check
 */
async function handleDuplicateTest() {
  if (!currentOrder) return;
  showToast('Firing 2 simultaneous booking requests to test idempotency...', 'info');

  // Trigger 2 requests simultaneously
  const req1 = fetch('/api/shiprocket/book-courier', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderId: currentOrder.id, courierName: courierSelect?.value })
  });

  const req2 = fetch('/api/shiprocket/book-courier', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderId: currentOrder.id, courierName: courierSelect?.value })
  });

  try {
    const [res1, res2] = await Promise.all([req1, req2]);
    const data1 = await res1.json();
    const data2 = await res2.json();

    console.log('Concurrent Response 1:', res1.status, data1);
    console.log('Concurrent Response 2:', res2.status, data2);

    if (res1.status === 409 || res2.status === 409) {
      showToast('Idempotency verified! One of the duplicate requests was rejected with HTTP 409.', 'success', 7000);
    } else {
      showToast('Test completed: check network tab for status responses.', 'info');
    }
    loadOrders();
  } catch (e) {
    console.error('Duplicate test error:', e);
  }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  if (bookCourierBtn) {
    bookCourierBtn.addEventListener('click', handleBookCourier);
  }
  if (resetOrderBtn) {
    resetOrderBtn.addEventListener('click', handleResetOrder);
  }
  if (duplicateTestBtn) {
    duplicateTestBtn.addEventListener('click', handleDuplicateTest);
  }
  if (orderSelect) {
    orderSelect.addEventListener('change', (e) => {
      selectOrder(e.target.value);
    });
  }
  if (simSelect) {
    simSelect.addEventListener('change', (e) => {
      currentSimulation = e.target.value;
    });
  }

  // Initial load
  loadOrders();
});
