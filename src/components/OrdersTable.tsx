/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, Eye, FileText, Download, Truck, Ban, CheckCircle2, 
  MapPin, Clock, Calendar, ChevronDown, RefreshCw, AlertCircle, Sparkles, Filter, Check, RotateCw, Plus, X, Loader2, Edit, Trash2, MessageSquare, Users, AlertTriangle, Wallet
} from 'lucide-react';
import { Order, CourierServiceability } from '../types';
import { ShiprocketService } from '../services/shiprocketService';
import { getTodayDateString, getYesterdayDateString } from '../utils/dateUtils';
import { downloadFileFromUrl } from '../utils/downloadHelper';
import OrderDetailsModal from './OrderDetailsModal';
import ShippingLabelModal from './ShippingLabelModal';

const CATALOG_ITEMS: any[] = [];

const EMPLOYEES_LIST: any[] = [];

interface OrdersTableProps {
  orders: Order[];
  onCheckServiceability: (order: Order) => void;
  onCancelShipment: (orderId: string) => void;
  onRefreshTrack: (orderId: string) => void;
  onGenerateLabel: (orderId: string) => void;
  onGenerateInvoice: (orderId: string) => void;
  onAddOrder?: (parsedOrder: Partial<Order>) => void;
  
  // Synchronized state props from App
  dateFilter: string;
  setDateFilter: (filter: string) => void;
  customDate: string;
  setCustomDate: (date: string) => void;
  statusFilter: string;
  setStatusFilter: (filter: string) => void;

  walletBalance?: number;
  walletSimulated?: boolean;
  walletDetails?: {
    available_balance: number;
    hold_amount: number;
    last_sync_time: string;
    is_simulated: boolean;
  } | null;
  isSyncingWallet?: boolean;
  onSyncWalletDetails?: () => void;
  onFetchWalletDetails?: () => void;
  onPriorityBook?: (orderId: string) => void;
  currentUser?: { name: string; email: string; role: string } | null;
  onDeleteOrder?: (orderId: string) => void;
  onShowWhatsApp?: (order: Order) => void;
  processingOrderIds?: string[];
}

export default function OrdersTable({
  orders,
  onCheckServiceability,
  onCancelShipment,
  onRefreshTrack,
  onGenerateLabel,
  onGenerateInvoice,
  onAddOrder,
  
  dateFilter,
  setDateFilter,
  customDate,
  setCustomDate,
  statusFilter,
  setStatusFilter,

  walletBalance,
  walletSimulated,
  walletDetails,
  isSyncingWallet,
  onSyncWalletDetails,
  onFetchWalletDetails,
  onPriorityBook,
  currentUser,
  onDeleteOrder,
  onShowWhatsApp,
  processingOrderIds = []
}: OrdersTableProps) {
  const [catalogItems, setCatalogItems] = useState<any[]>(() => {
    const saved = localStorage.getItem('dappersfit_products');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(p => ({
            name: p.name,
            price: p.price,
            sku: p.sku,
            weight: p.weight
          }));
        }
      } catch (e) {
        console.error(e);
      }
    }
    return CATALOG_ITEMS;
  });

  const currentCatalog = catalogItems;

  const [employeesList, setEmployeesList] = useState<any[]>(EMPLOYEES_LIST);

  useEffect(() => {
    async function fetchProducts() {
      try {
        const res = await fetch('/api/products');
        const data = await res.json();
        if (Array.isArray(data.products) && data.products.length > 0) {
          const formatted = data.products.map((p: any) => ({
            name: p.name,
            price: p.price,
            sku: p.sku,
            weight: p.weight
          }));
          setCatalogItems(formatted);
          localStorage.setItem('dappersfit_products', JSON.stringify(data.products));
        }
      } catch (err) {
        console.error('Failed to load products for OrdersTable catalog:', err);
      }
    }
    fetchProducts();
  }, []);

  useEffect(() => {
    async function fetchEmployees() {
      try {
        const res = await fetch('/api/employees');
        const data = await res.json();
        if (data.employees) {
          setEmployeesList(data.employees);
        }
      } catch (err) {
        console.error('Failed to load employees for OrdersTable:', err);
        const saved = localStorage.getItem('dappersfit_employees');
        if (saved) {
          setEmployeesList(JSON.parse(saved));
        }
      }
    }
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (!walletDetails && onFetchWalletDetails) {
      onFetchWalletDetails();
    }
  }, [walletDetails, onFetchWalletDetails]);

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [downloadedIds, setDownloadedIds] = useState<string[]>([]);
  
  // Modals & confirmation alerts
  const [selectedOrderForDetails, setSelectedOrderForDetails] = useState<Order | null>(null);
  const [selectedOrderForLabel, setSelectedOrderForLabel] = useState<Order | null>(null);

  // New Order / Edit Order Form state
  const [isNewOrderOpen, setIsNewOrderOpen] = useState<boolean>(false);
  const [isEditingOrder, setIsEditingOrder] = useState<boolean>(false);
  const [editOrderId, setEditOrderId] = useState<string | null>(null);
  const [rawAddress, setRawAddress] = useState<string>('');
  const [parsingAddress, setParsingAddress] = useState<boolean>(false);
  const [parseError, setParseError] = useState<string | null>(null);

  // Editable customer info
  const [customerName, setCustomerName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [addressText, setAddressText] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [state, setState] = useState<string>('');
  const [pincode, setPincode] = useState<string>('');
  
  const [assignedEmployee, setAssignedEmployee] = useState<string>('');
  const [createdByEmployeeId, setCreatedByEmployeeId] = useState<string>('');
  const [createdByEmployeeName, setCreatedByEmployeeName] = useState<string>('');
  const [selectedCatalogItem, setSelectedCatalogItem] = useState<string>('');
  const [productName, setProductName] = useState<string>('');
  const [productOption, setProductOption] = useState<string>('Variant: Standard Black');
  const [amount, setAmount] = useState<string>('');
  const [weight, setWeight] = useState<string>('0.5');
  const [paymentMethod, setPaymentMethod] = useState<string>('COD');
  const [productAdvance, setProductAdvance] = useState<boolean>(false);

  const [quantity, setQuantity] = useState<number>(1);
  const [boxLength, setBoxLength] = useState<string>('22');
  const [boxWidth, setBoxWidth] = useState<string>('15');
  const [boxHeight, setBoxHeight] = useState<string>('6');

  const handleParseAddress = async () => {
    if (!rawAddress.trim()) {
      setParseError('Please paste address text first.');
      return;
    }
    try {
      setParsingAddress(true);
      setParseError(null);
      const response = await fetch('/api/gemini/parse-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: rawAddress })
      });
      if (!response.ok) {
        throw new Error('Failed to connect to order parser.');
      }
      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }
      if (data.parsedOrder) {
        const p = data.parsedOrder;
        const extractedName = (p.customerName || p.address?.name || '').trim();
        const lower = extractedName.toLowerCase();
        if (!extractedName || lower === 'unknown' || lower === 'n/a' || lower === 'walkin customer' || lower === 'walk-in customer' || lower === 'none') {
          setCustomerName('');
          setNameError('⚠️ Customer Name is required. AI could not detect customer name, please fill in manually.');
        } else {
          setCustomerName(extractedName);
          setNameError(null);
        }
        setPhone(p.address?.phone || '');
        setAddressText(p.address?.address || '');
        setCity(p.address?.city || '');
        setState(p.address?.state || '');
        setPincode(p.address?.pincode || '');
        
        if (p.items && p.items.length > 0) {
          setProductName(p.items[0].name || '');
          setAmount(String(p.items[0].price || ''));
        } else if (p.totalAmount) {
          setAmount(String(p.totalAmount));
        }
      }
    } catch (err: any) {
      setParseError(err.message || 'Error occurred while contacting parser.');
    } finally {
      setParsingAddress(false);
    }
  };

  const handleCatalogItemSelect = (itemName: string) => {
    setSelectedCatalogItem(itemName);
    const found = currentCatalog.find(i => i.name === itemName);
    if (found) {
      setProductName(found.name);
      setAmount(String(found.price));
      setWeight(String(found.weight));
    }
  };

  const handleCloseForm = () => {
    setIsNewOrderOpen(false);
    setIsEditingOrder(false);
    setEditOrderId(null);
    setRawAddress('');
    setCustomerName('');
    setPhone('');
    setNameError(null);
    setPhoneError(null);
    setAddressText('');
    setCity('');
    setState('');
    setPincode('');
    setProductName('');
    setProductOption('Variant: Standard Black');
    setAmount('');
    setWeight('0.5');
    setPaymentMethod('COD');
    setSelectedCatalogItem('');
    setAssignedEmployee('');
    setCreatedByEmployeeId('');
    setCreatedByEmployeeName('');
    setQuantity(1);
    setBoxLength('22');
    setBoxWidth('15');
    setBoxHeight('6');
    setProductAdvance(false);
  };

  const handleOpenNewOrder = () => {
    handleCloseForm();
    if (currentUser) {
      setCreatedByEmployeeId(currentUser.email || '');
      setCreatedByEmployeeName(currentUser.name || '');
    } else {
      setCreatedByEmployeeId('');
      setCreatedByEmployeeName('Guest');
    }
    setIsNewOrderOpen(true);
  };

  const handleStartEdit = (order: Order) => {
    setEditOrderId(order.id);
    setIsEditingOrder(true);
    setIsNewOrderOpen(true);
    
    setCustomerName(order.customerName || '');
    setPhone(order.address?.phone || '');
    setAddressText(order.address?.address || '');
    setCity(order.address?.city || '');
    setState(order.address?.state || '');
    setPincode(order.address?.pincode || '');
    
    setAssignedEmployee(order.assignedEmployeeId || '');
    setCreatedByEmployeeId(order.createdByEmployeeId || '');
    setCreatedByEmployeeName(order.createdByEmployeeName || '');
    
    const firstItem = order.items?.[0];
    setProductName(firstItem?.name || '');
    setQuantity(firstItem?.quantity || 1);
    setAmount(String(firstItem?.price || ''));
    setProductOption(firstItem?.option || 'Variant: Standard Black');
    
    setWeight(String(order.weight || '0.5'));
    setBoxLength(String(order.dimensions?.length || '22'));
    setBoxWidth(String(order.dimensions?.width || '15'));
    setBoxHeight(String(order.dimensions?.height || '6'));
    setPaymentMethod(order.paymentMethod || 'COD');
    setProductAdvance(!!order.productAdvance);
  };

  const handleSubmitNewOrder = (e: React.FormEvent) => {
    e.preventDefault();
    
    let hasError = false;
    
    const trimmedName = (customerName || '').trim();
    const lowerName = trimmedName.toLowerCase();
    if (!trimmedName) {
      setNameError('⚠️ Customer Name is required. Please do not leave it blank.');
      hasError = true;
    } else if (lowerName === 'unknown' || lowerName === 'n/a' || lowerName === 'walkin customer' || lowerName === 'walk-in customer' || lowerName === 'none' || lowerName === 'null') {
      setNameError('⚠️ Customer Name is required. Placeholder names like "Unknown" or "N/A" are not allowed.');
      hasError = true;
    } else {
      setNameError(null);
    }

    const trimmedPhone = (phone || '').trim();
    if (!trimmedPhone) {
      setPhoneError('⚠️ Phone Number is required. Please do not leave it blank.');
      hasError = true;
    } else {
      setPhoneError(null);
    }

    if (hasError) {
      return;
    }
    
    if (!productName || !amount) {
      alert("Please fill in Product Name and Amount.");
      return;
    }
    
    const customerEmail = "customer@dappersfit.com";
    const existing = isEditingOrder ? orders.find(o => o.id === editOrderId) : null;
    
    let finalAssigned = assignedEmployee;
    if (!finalAssigned && currentUser && currentUser.role === 'employee') {
      const matched = employeesList.find(e => 
        (e.email || '').toLowerCase().trim() === currentUser.email.toLowerCase().trim() || 
        (e.username || '').toLowerCase().trim() === currentUser.email.toLowerCase().trim()
      );
      if (matched) {
        finalAssigned = matched.id;
      } else {
        finalAssigned = currentUser.name;
      }
    }

    const newOrderPayload: any = {
      id: isEditingOrder ? editOrderId : undefined,
      orderNumber: existing ? existing.orderNumber : undefined,
      date: existing ? existing.date : undefined,
      customerName: customerName.trim(),
      address: {
        name: customerName.trim(),
        phone: phone.trim(),
        address: addressText || "Flat 402, Sunshine Heights, MG Road",
        city: city || "Pune",
        state: state || "Maharashtra",
        pincode: pincode || "411001",
        email: customerEmail
      },
      items: [
        {
          id: existing?.items?.[0]?.id || `i-new-0`,
          name: productName,
          sku: currentCatalog.find(i => i.name === productName)?.sku || "SKU-NEW-1",
          quantity: Number(quantity),
          price: Number(amount),
          option: productOption || "Variant: Standard Black"
        }
      ],
      totalAmount: Number(amount) * Number(quantity),
      weight: Number(weight),
      dimensions: {
        length: Number(boxLength),
        width: Number(boxWidth),
        height: Number(boxHeight)
      },
      status: isEditingOrder ? (existing?.status || 'pending') : 'pending',
      assignedEmployeeId: finalAssigned || undefined,
      createdByEmployeeId: createdByEmployeeId || undefined,
      createdByEmployeeName: createdByEmployeeName || undefined,
      paymentMethod: paymentMethod,
      productAdvance: productAdvance,
      productAdvanceIncentive: productAdvance ? 50 : 30,
      shiprocketOrderId: existing ? existing.shiprocketOrderId : undefined,
      shipmentId: existing ? existing.shipmentId : undefined,
      awbCode: existing ? existing.awbCode : undefined,
      courierName: existing ? existing.courierName : undefined,
      deliveryDate: existing ? existing.deliveryDate : undefined
    };

    if (onAddOrder) {
      onAddOrder(newOrderPayload);
    }

    handleCloseForm();
  };

  // Load downloaded state from localStorage
  const refreshDownloadedStatus = () => {
    try {
      const saved = localStorage.getItem('dappersfit_downloaded_labels');
      if (saved) {
        setDownloadedIds(JSON.parse(saved));
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    refreshDownloadedStatus();
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedOrderId(expandedOrderId === id ? null : id);
  };

  // 1. FILTER: Date-wise Filtering
  const getFilteredByDateOrders = () => {
    const todayStr = getTodayDateString();
    const yesterdayStr = getYesterdayDateString();
    return orders.filter(order => {
      if (!order) return false;
      const orderDateStr = order.date ? String(order.date).slice(0, 10) : '';
      if (dateFilter === 'today') {
        return orderDateStr === todayStr;
      }
      if (dateFilter === 'yesterday') {
        return orderDateStr === yesterdayStr;
      }
      if (dateFilter === 'custom') {
        return orderDateStr === customDate;
      }
      return true; // all dates
    });
  };

  // 2. FILTER: Status Filtering
  const getFilteredByStatusOrders = (dateFiltered: Order[]) => {
    return dateFiltered.filter(order => {
      if (!order) return false;
      if (statusFilter === 'pending') {
        return order.status === 'pending' || order.status === 'processing' || order.status === 'failed';
      }
      if (statusFilter === 'active') {
        return ['booked', 'awb_assigned', 'shipped', 'delivered'].includes(order.status);
      }
      if (statusFilter === 'rejected') {
        return order.status === 'cancelled';
      }
      return true; // all statuses
    });
  };

  const groupOrdersByDay = (orderList: Order[]) => {
    const todayStr = getTodayDateString();
    const yesterdayStr = getYesterdayDateString();
    
    const groups: { [key: string]: Order[] } = {
      'Today': [],
      'Yesterday': [],
      'Earlier / Other': []
    };

    (orderList || []).forEach(order => {
      if (!order) return;
      const orderDateStr = order.date ? String(order.date).slice(0, 10) : '';
      if (orderDateStr === todayStr) {
        groups['Today'].push(order);
      } else if (orderDateStr === yesterdayStr) {
        groups['Yesterday'].push(order);
      } else {
        groups['Earlier / Other'].push(order);
      }
    });

    return groups;
  };

  const dateFilteredList = getFilteredByDateOrders();
  const fullyFilteredOrders = getFilteredByStatusOrders(dateFilteredList).filter((order) => {
    if (!order) return false;
    const matchesSearch = 
      (order.orderNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.awbCode && String(order.awbCode).toLowerCase().includes(searchTerm.toLowerCase())) ||
      (order.shiprocketOrderId && String(order.shiprocketOrderId).toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesSearch;
  });

  // Get active bookable labels count for current filtered date (to support bulk download label)
  const bookableOrdersInDay = dateFilteredList.filter(o => 
    o && ['booked', 'awb_assigned', 'shipped', 'delivered'].includes(o.status)
  );

  const getStatusBadge = (status: Order['status']) => {
    const configs: Record<string, { bg: string; label: string }> = {
      pending: { bg: 'bg-amber-500/10 border-amber-500/20 text-amber-500', label: 'Pending Book' },
      processing: { bg: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500', label: 'Processing...' },
      booked: { bg: 'bg-sky-500/10 border-sky-500/20 text-sky-600', label: 'Booked' },
      awb_assigned: { bg: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-600', label: 'AWB Assigned' },
      shipped: { bg: 'bg-purple-500/10 border-purple-500/20 text-purple-600', label: 'In Transit' },
      delivered: { bg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600', label: 'Delivered' },
      cancelled: { bg: 'bg-red-500/10 border-red-500/20 text-red-600', label: 'Cancelled' },
      failed: { bg: 'bg-rose-500/10 border-rose-500/20 text-rose-600', label: 'Booking Failed' },
    };
    const config = configs[status] || configs.pending;
    return (
      <span className={`px-2.5 py-1 text-[11px] font-mono border font-semibold rounded-full uppercase tracking-wider ${config.bg}`}>
        {config.label}
      </span>
    );
  };

  // Trigger individual download helper
  const handleSingleLabelClick = (order: Order) => {
    setSelectedOrderForLabel(order);
  };

  // Bulk downloader logic (creates a single HTML page-break document for bulk A6 printing)
  const executeBulkDownload = (ordersToDownload: Order[]) => {
    try {
      const inlineBarcodeSVG = (val: string) => {
        let bars = '';
        let x = 10;
        for (let i = 0; i < val.length; i++) {
          const charCode = val.charCodeAt(i);
          const w1 = (charCode % 4) + 1.5;
          const w2 = ((charCode + i) % 3) + 1;
          bars += `<rect x="${x}" y="2" width="${w1}" height="42" fill="black" />`;
          x += w1 + 2;
          bars += `<rect x="${x}" y="2" width="${w2}" height="42" fill="black" />`;
          x += w2 + 2;
        }
        return `<svg viewBox="0 0 ${x + 10} 46" style="width:100%; height:44px;" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="white"/><g>${bars}</g></svg>`;
      };

      let compiledLabels = '';

      ordersToDownload.forEach((o, idx) => {
        const customerName = o.customerName || 'BANDARU VENKATESH';
        const addr = (o.address || {}) as any;
        const addressLine1 = addr.address || 'Ramnagar 6th line, Chemakurti';
        const cityStateZip = `${addr.city || ''}, ${addr.state || ''}, India, ${addr.pincode || ''}`;
        const phoneNo = addr.phone || '8019566202';
        const orderIdText = o.orderNumber || `ord_${o.id}`;
        const awbCodeText = o.awbCode || '1904193592071';
        const courierNameText = o.courierName || 'Delhivery Surface';
        const weightText = `${(o.weight || 0.50).toFixed(2)} kg`;
        const paymentText = o.totalAmount > 0 ? 'COD' : 'PREPAID';
        const amountFormatted = `₹${(Number(o.totalAmount) || 0).toLocaleString()}`;
        const invoiceNoText = `INV-5899${o.id.slice(-4)}`;
        const invoiceDateText = o.date || '10/07/2026';

        compiledLabels += `
          <div class="label-card ${idx < ordersToDownload.length - 1 ? 'page-break' : ''}">
            <div class="header-row">
              <span class="courier-title">${courierNameText}</span>
              <span class="surface-badge">SURFACE</span>
            </div>
            <div class="barcode-section">
              ${inlineBarcodeSVG(awbCodeText)}
              <span class="barcode-value">${awbCodeText}</span>
            </div>
            <div class="routing-row">
              <span class="routing-code">Routing Code: AUTO</span>
              <span class="cod-badge">${paymentText} ${amountFormatted}</span>
            </div>
            <div class="ship-to-section">
              <span class="ship-to-title">SHIP TO</span>
              <span class="customer-name">${customerName}</span>
              <span class="customer-address">
                ${addressLine1},<br>
                ${cityStateZip}
              </span>
              <span class="customer-pin">PIN: ${addr.pincode || ''}</span>
              <span class="customer-phone">Phone: ${phoneNo}</span>
            </div>
            <div class="details-split">
              <div class="split-left">
                <span class="info-label">SHIPPED BY (RETURN TO)</span>
                <span class="info-value-bold">Dapper Fit</span>
                <span class="info-block" style="font-size: 10px; font-weight: 600; color: #374151;">
                  shop no 64, 4th floor, The platinum mall, by rubberwala,<br>
                  Mumbai - 400004
                </span>
              </div>
              <div class="split-right">
                <span class="info-label">ORDER INFO</span>
                <div class="info-item">
                  <span>Order #:</span>
                  <span>${orderIdText}</span>
                </div>
                <div class="info-item">
                  <span>Invoice:</span>
                  <span>${invoiceNoText}</span>
                </div>
                <div class="info-item">
                  <span>Date:</span>
                  <span>${invoiceDateText}</span>
                </div>
                <div class="info-item">
                  <span>Payment:</span>
                  <span>${paymentText}</span>
                </div>
                <div class="info-item">
                  <span>Weight:</span>
                  <span>${weightText}</span>
                </div>
              </div>
            </div>
            <div class="footer-text">
              THIS IS AN AUTO-GENERATED LABEL AND DOES NOT NEED SIGNATURE.<br>
              All disputes are subject to Mumbai jurisdiction only. Powered by Shiprocket.
            </div>
          </div>
        `;
      });

      const fullHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Shiprocket Bulk Labels - Dispatch ${dateFilter}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              background-color: #ffffff;
              color: #000000;
              margin: 0;
              padding: 20px;
              display: flex;
              flex-direction: column;
              align-items: center;
            }
            .label-card {
              width: 450px;
              border: 2px solid #000000;
              padding: 12px;
              box-sizing: border-box;
              margin-bottom: 30px;
            }
            .header-row {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 2px solid #000000;
              padding-bottom: 6px;
            }
            .courier-title {
              font-size: 20px;
              font-weight: 850;
              text-transform: uppercase;
              letter-spacing: -0.5px;
            }
            .surface-badge {
              background-color: #000000;
              color: #ffffff;
              font-size: 11px;
              font-weight: 900;
              padding: 4px 10px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .barcode-section {
              border-bottom: 2px solid #000000;
              padding: 8px 0;
              text-align: center;
            }
            .barcode-value {
              font-size: 13px;
              font-weight: 800;
              letter-spacing: 4px;
              margin-top: 4px;
              display: block;
              font-family: monospace;
            }
            .routing-row {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 2px solid #000000;
              padding: 6px 0;
            }
            .routing-code {
              font-size: 13px;
              font-weight: 800;
            }
            .cod-badge {
              background-color: #dc2626;
              color: #ffffff;
              font-size: 13px;
              font-weight: 900;
              padding: 4px 12px;
              letter-spacing: 0.5px;
            }
            .ship-to-section {
              border-bottom: 2px solid #000000;
              padding: 10px 0;
              text-align: left;
            }
            .ship-to-title {
              font-size: 9px;
              text-transform: uppercase;
              font-weight: 700;
              color: #4b5563;
              display: block;
              margin-bottom: 2px;
            }
            .customer-name {
              font-size: 18px;
              font-weight: 900;
              text-transform: uppercase;
              display: block;
              margin-bottom: 4px;
              letter-spacing: -0.3px;
            }
            .customer-address {
              font-size: 12px;
              font-weight: 600;
              line-height: 1.4;
              display: block;
            }
            .customer-pin {
              font-size: 14px;
              font-weight: 900;
              margin-top: 4px;
              display: block;
            }
            .customer-phone {
              font-size: 12px;
              font-weight: 800;
              margin-top: 2px;
              display: block;
            }
            .details-split {
              display: flex;
              border-bottom: 2px solid #000000;
            }
            .split-left {
              width: 50%;
              border-right: 2px solid #000000;
              padding: 10px 10px 10px 0;
              text-align: left;
            }
            .split-right {
              width: 50%;
              padding: 10px 0 10px 10px;
              text-align: left;
            }
            .info-block {
              font-size: 11px;
              line-height: 1.4;
            }
            .info-label {
              font-size: 9px;
              font-weight: 700;
              color: #4b5563;
              text-transform: uppercase;
              display: block;
              margin-bottom: 3px;
            }
            .info-value-bold {
              font-size: 13px;
              font-weight: 800;
              display: block;
            }
            .info-item {
              display: flex;
              justify-content: space-between;
              font-size: 11px;
              margin-bottom: 2px;
              font-weight: 600;
            }
            .info-item span:first-child {
              color: #4b5563;
            }
            .info-item span:last-child {
              font-weight: 800;
            }
            .footer-text {
              font-size: 8px;
              color: #4b5563;
              font-weight: 600;
              text-align: center;
              margin-top: 8px;
              line-height: 1.3;
            }
            @media print {
              body {
                padding: 0;
                background-color: white;
              }
              .label-card {
                margin-bottom: 0;
                box-shadow: none;
                border: 2px solid #000000 !important;
              }
              .page-break {
                page-break-after: always;
                break-after: page;
              }
            }
          </style>
        </head>
        <body>
          ${compiledLabels}
        </body>
        </html>
      `;

      const blob = new Blob([fullHTML], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `shiprocket-bulk-labels-${dateFilter === 'custom' ? customDate : dateFilter}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Save all IDs as downloaded
      const saved = localStorage.getItem('dappersfit_downloaded_labels');
      const downloadedList = saved ? JSON.parse(saved) : [];
      ordersToDownload.forEach(o => {
        if (!downloadedList.includes(o.id)) {
          downloadedList.push(o.id);
        }
      });
      localStorage.setItem('dappersfit_downloaded_labels', JSON.stringify(downloadedList));
      refreshDownloadedStatus();

    } catch (err) {
      console.error('Failed to download bulk labels:', err);
    }
  };

  const handleDownloadAllInvoicesPDF = async () => {
    const ordersToDownload = bookableOrdersInDay.filter(o => o.shiprocketOrderId || o.shipmentId || o.id);
    if (ordersToDownload.length === 0) {
      alert("No booked orders available to download invoices.");
      return;
    }

    ordersToDownload.forEach(async (order, index) => {
      const orderIdToUse = order.shiprocketOrderId || order.shipmentId || order.id;
      setTimeout(async () => {
        try {
          const res = await ShiprocketService.fetchInvoice(String(orderIdToUse));
          if (res.success && res.url) {
            await downloadFileFromUrl(res.url, `Invoice_${order.orderNumber || order.id}.pdf`);
          }
        } catch (err) {
          console.error(`Failed to download invoice for order ${order.orderNumber}:`, err);
        }
      }, index * 400);
    });
  };

  const handleDownloadAllLabelsPDF = async () => {
    const ordersToDownload = bookableOrdersInDay.filter(o => o.shipmentId || o.shiprocketOrderId || o.id);
    if (ordersToDownload.length === 0) {
      alert("No booked orders available to download labels.");
      return;
    }

    ordersToDownload.forEach(async (order, index) => {
      const shipmentIdToUse = order.shipmentId || order.shiprocketOrderId || order.id;
      setTimeout(async () => {
        try {
          const res = await ShiprocketService.fetchLabel(String(shipmentIdToUse));
          if (res.success && res.url) {
            await downloadFileFromUrl(res.url, `Label_${order.orderNumber || order.id}.pdf`);
          }
        } catch (err) {
          console.error(`Failed to download label for order ${order.orderNumber}:`, err);
        }
      }, index * 400);
    });
  };

  const handleDownloadAllLabelsForDay = () => {
    if (bookableOrdersInDay.length === 0) {
      return;
    }
    executeBulkDownload(bookableOrdersInDay);
  };

  const selectedDateLabel = () => {
    if (dateFilter === 'today') {
      const d = new Date(getTodayDateString());
      return `${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} (Today)`;
    }
    if (dateFilter === 'yesterday') {
      const d = new Date(getYesterdayDateString());
      return `${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} (Yesterday)`;
    }
    if (dateFilter === 'custom') return customDate;
    return 'All Dates';
  };

  const handleDownloadExcel = () => {
    const headers = [
      "Order Number",
      "Date",
      "Status",
      "Customer Name",
      "Phone",
      "Email",
      "Address",
      "City",
      "State",
      "Pincode",
      "Payment Method",
      "Total Amount",
      "Assigned Employee",
      "Created By Name",
      "Created By Email",
      "Product Advance",
      "Incentive Amount"
    ];

    const rows = fullyFilteredOrders.map(order => {
      const emp = employeesList.find(e => e.id === order.assignedEmployeeId || e.name === order.assignedEmployeeId);
      const empName = emp ? emp.name : order.assignedEmployeeId || 'Unassigned';
      const addr = (order.address || {}) as any;

      return [
        order.orderNumber,
        order.date,
        order.status.toUpperCase(),
        order.customerName,
        addr.phone || '',
        addr.email || '',
        addr.address || '',
        addr.city || '',
        addr.state || '',
        addr.pincode || '',
        order.paymentMethod || 'COD',
        order.totalAmount,
        empName,
        order.createdByEmployeeName || 'System',
        order.createdByEmployeeId || '',
        order.productAdvance ? 'Yes' : 'No',
        order.productAdvanceIncentive !== undefined ? order.productAdvanceIncentive : (order.productAdvance ? 50 : 30)
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map(row => 
        row.map(val => {
          const stringVal = String(val ?? '');
          if (stringVal.includes(',') || stringVal.includes('"') || stringVal.includes('\n')) {
            return `"${stringVal.replace(/"/g, '""')}"`;
          }
          return stringVal;
        }).join(",")
      )
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `shiprocket_orders_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const groupedOrders = groupOrdersByDay(fullyFilteredOrders);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 font-sans text-slate-800" id="orders-panel-root">
      
      {/* Title Header matches exactly Image 1 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4" id="orders-header">
        <div>
          <h1 className="df-display font-extrabold text-3xl tracking-tight text-[#1c1b1a]">Orders</h1>
          <p className="text-sm text-slate-500 mt-1">
            {fullyFilteredOrders.length} orders · statuses from Shiprocket
          </p>
        </div>
        <div className="flex items-center space-x-3 shrink-0">
          <button 
            onClick={handleDownloadExcel}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center space-x-2 shadow-sm transition cursor-pointer"
            id="download-excel-btn"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Excel File</span>
          </button>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2.5 bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 text-xs font-bold rounded-xl flex items-center space-x-2 shadow-sm transition"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            <span>Refresh</span>
          </button>
          <button 
            onClick={handleOpenNewOrder}
            className="px-4 py-2.5 bg-[#1c1b1a] hover:bg-slate-900 text-white text-xs font-bold rounded-xl flex items-center space-x-2 shadow-md transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Order</span>
          </button>
        </div>
      </div>

      {/* Synchronized Date Filter Tabs exactly as in Image 1 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#efe9de]/50 border border-slate-200/60 p-1.5 rounded-xl" id="date-and-status-filters">
        <div className="flex flex-wrap items-center gap-2" id="date-selector-tabs">
          {[
            { id: 'today', label: 'Today' },
            { id: 'yesterday', label: 'Yesterday' },
            { id: 'custom', label: 'Custom' },
            { id: 'all', label: 'All Dates' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setDateFilter(tab.id)}
              className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition duration-150 ${
                dateFilter === tab.id
                  ? 'bg-[#1c1b1a] text-white font-black shadow'
                  : 'text-slate-650 hover:bg-slate-200/50'
              }`}
              id={`date-tab-${tab.id}`}
            >
              {tab.label}
            </button>
          ))}

          {/* Inline Custom Date Picker when custom date is active */}
          {dateFilter === 'custom' && (
            <input
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-300 text-slate-900 rounded-lg text-xs outline-none focus:border-[#b8862f] font-mono"
              id="custom-date-picker-input"
            />
          )}
        </div>

        {/* Sync Status/Stats summary inside date banner */}
        <div className="text-xs text-slate-500 font-mono flex items-center gap-2 pr-2">
          <Clock className="w-4 h-4 text-[#b8862f]" />
          <span>Fulfillment timezone synced: GMT-07:00</span>
        </div>
      </div>

      {/* Status Filtering Tabs exactly as in Image 1 */}
      <div className="flex flex-wrap gap-2" id="status-tabs-row">
        {[
          { id: 'all', label: 'All' },
          { id: 'pending', label: 'Pending Approval' },
          { id: 'active', label: 'Active Shipments' },
          { id: 'rejected', label: 'Rejected' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide border transition duration-155 ${
              statusFilter === tab.id
                ? 'bg-[#1c1b1a] border-[#1c1b1a] text-white font-black shadow-sm'
                : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-55 shadow-sm'
            }`}
            id={`status-tab-${tab.id}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Top High-Visibility "Download Label" Banner for the day's dispatch matching request */}
      {bookableOrdersInDay.length > 0 && (
        <div className="bg-[#e8c987]/15 border border-[#b8862f]/25 p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-sm" id="top-download-label-banner">
          <div className="flex items-start space-x-3.5">
            <div className="p-2.5 bg-[#b8862f]/10 rounded-xl border border-[#b8862f]/20">
              <Download className="w-5 h-5 text-[#b8862f] animate-bounce" />
            </div>
            <div>
              <span className="font-extrabold text-[#4a3510] text-sm block">Simultaneous Daily Label Dispatcher</span>
              <p className="text-xs text-slate-650 mt-1 leading-relaxed">
                Clicking the bulk label action compiles and downloads all <span className="font-black text-[#b8862f]">{bookableOrdersInDay.length} labels</span> for {selectedDateLabel()} on a single print layout.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0 self-end sm:self-center">
            <button 
              onClick={handleDownloadAllLabelsForDay}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-[11px] uppercase tracking-wider rounded-xl flex items-center space-x-1.5 transition shadow-lg shadow-blue-500/10 cursor-pointer"
              id="bulk-download-all-labels-btn"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Bulk A6 Print</span>
            </button>
            <button 
              onClick={handleDownloadAllLabelsPDF}
              className="px-4 py-2 bg-[#2563eb] hover:bg-blue-700 text-white font-extrabold text-[11px] uppercase tracking-wider rounded-xl flex items-center space-x-1.5 transition shadow-lg shadow-indigo-500/10 cursor-pointer"
              id="bulk-download-shiprocket-labels-pdf-btn"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Bulk PDF Labels</span>
            </button>
            <button 
              onClick={handleDownloadAllInvoicesPDF}
              className="px-4 py-2 bg-[#7c3aed] hover:bg-purple-700 text-white font-extrabold text-[11px] uppercase tracking-wider rounded-xl flex items-center space-x-1.5 transition shadow-lg shadow-purple-500/10 cursor-pointer"
              id="bulk-download-shiprocket-invoices-pdf-btn"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Bulk PDF Invoices</span>
            </button>
          </div>
        </div>
      )}

      {/* Search Input Bar with "Search" Button matching Image 1 */}
      <div className="flex gap-2 bg-[#efe9de] p-4 rounded-xl border border-slate-200 shadow-sm" id="orders-search-and-action-bar">
        <div className="relative flex-1" id="search-input-container">
          <Search className="w-4 h-4 text-slate-450 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            id="order-search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Order ID, customer, AWB, Shiprocket ID..."
            className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm bg-white text-slate-900 focus:border-[#b8862f] focus:ring-1 focus:ring-[#b8862f] outline-none transition"
          />
        </div>
        <button
          onClick={() => {}} // Simple trigger
          className="px-6 py-2.5 bg-[#1c1b1a] hover:bg-slate-900 text-white font-extrabold text-xs uppercase tracking-widest rounded-lg transition"
          id="search-trigger-btn"
        >
          Search
        </button>
      </div>

      {/* Main Table Layout matching Image 1 */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden" id="orders-table-wrapper">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse" id="orders-data-table">
            <thead>
              <tr className="bg-[#fcfaf7] border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <th className="px-6 py-4">Order / Date</th>
                <th className="px-6 py-4">Employee</th>
                <th className="px-6 py-4">Created By</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Address</th>
                <th className="px-6 py-4">Payment</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Status / AWB</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800 text-sm">
              <AnimatePresence initial={false}>
                {['Today', 'Yesterday', 'Earlier / Other'].map(groupKey => {
                  const groupOrders = groupedOrders[groupKey];
                  if (groupOrders.length === 0) return null;

                  return (
                    <React.Fragment key={groupKey}>
                        <tr className="bg-slate-50 border-y border-slate-200" id={`group-header-${groupKey}`}>
                          <td colSpan={9} className="px-6 py-2.5 text-xs font-extrabold uppercase tracking-wider text-slate-600 bg-slate-50/80">
                            <div className="flex items-center justify-between">
                              <span className="flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-[#b8862f]" />
                                {groupKey}
                              </span>
                              <span className="px-2 py-0.5 text-[10px] font-mono bg-white border border-slate-200 rounded-md text-slate-500 font-bold">
                                {groupOrders.length} {groupOrders.length === 1 ? 'order' : 'orders'}
                              </span>
                            </div>
                          </td>
                        </tr>
                        {groupOrders.map((order) => {
                          const isThisDownloaded = downloadedIds.includes(order.id);
                          
                          return (
                            <React.Fragment key={order.id}>
                              <tr 
                                className={`hover:bg-slate-50/50 transition duration-150 ${expandedOrderId === order.id ? 'bg-[#b8862f]/5' : ''}`}
                                id={`order-row-${order.id}`}
                              >
                        {/* Order / Date */}
                        <td className="px-6 py-4 space-y-1">
                          <span className="font-mono font-bold text-slate-900 block">{order.orderNumber}</span>
                          <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-450" />
                            {order.date}
                          </span>
                        </td>

                        {/* Employee */}
                        <td className="px-6 py-4 text-slate-600 font-mono text-xs">
                          {order.assignedEmployeeId ? (
                            <span className="font-semibold text-slate-800">
                              {employeesList.find(e => e.id === order.assignedEmployeeId || e.name === order.assignedEmployeeId)?.name || order.assignedEmployeeId}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-normal">—</span>
                          )}
                        </td>

                        {/* Created By */}
                        <td className="px-6 py-4 text-slate-600 font-sans text-xs">
                          {order.createdByEmployeeName ? (
                            <div className="flex flex-col">
                              <span className="font-semibold text-slate-800">{order.createdByEmployeeName}</span>
                              {order.createdByEmployeeId && (
                                <span className="text-[10px] text-slate-400 font-mono">{order.createdByEmployeeId}</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 font-normal">System</span>
                          )}
                        </td>

                        {/* Customer */}
                        <td className="px-6 py-4 space-y-0.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-bold text-slate-900 block">{order.customerName || <span className="text-red-500 italic font-medium">No Name</span>}</span>
                            {isThisDownloaded && (
                              <span className="text-blue-600" title="Label Downloaded (Blue Tick)">
                                <Check className="w-4 h-4 stroke-[3px]" />
                              </span>
                            )}
                            {(!order.customerName || String(order.customerName).trim() === '' || String(order.customerName).trim().toLowerCase() === 'walkin customer' || String(order.customerName).trim().toLowerCase() === 'walk-in customer') && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold text-white bg-red-600 border border-red-700 rounded-full shadow-sm animate-pulse whitespace-nowrap" id={`name-warn-badge-${order.id}`}>
                                <span className="w-1 h-1 rounded-full bg-white"></span>
                                Name Required
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-500 block font-mono">{order.address?.phone || '—'}</span>
                        </td>

                        {/* Address */}
                        <td className="px-6 py-4 max-w-xs truncate">
                          <span className="text-slate-700 block text-xs truncate font-medium">{order.address?.address || '—'}</span>
                          <span className="text-[10px] text-slate-450 font-mono block mt-0.5">
                            {order.address?.city || '—'}, {order.address?.pincode || '—'}
                          </span>
                        </td>

                        {/* Payment */}
                        <td className="px-6 py-4">
                          {order.paymentMethod === 'Prepaid' || Number(order.totalAmount) === 0 ? (
                            <span className="df-pill df-pill-delivered">PREPAID</span>
                          ) : (
                            <span className="df-pill df-pill-approved">COD</span>
                          )}
                        </td>

                        {/* Amount */}
                        <td className="px-6 py-4 font-bold font-mono text-slate-900">
                          ₹{(Number(order.totalAmount) || 0).toLocaleString()}
                        </td>

                        {/* Status / AWB */}
                        <td className="px-6 py-4 space-y-1">
                          <span className="block">
                            {order.status === 'pending' && <span className="df-pill df-pill-pending">Pending</span>}
                            {order.status === 'processing' && <span className="df-pill bg-amber-100 text-amber-800 border border-amber-300 font-bold animate-pulse">Processing...</span>}
                            {order.status === 'failed' && (
                              <span className="df-pill bg-rose-100 text-rose-800 border border-rose-300 font-bold" title={order.errorMessage || 'Booking failed on Shiprocket'}>
                                Booking Failed
                              </span>
                            )}
                            {order.status === 'booked' && <span className="df-pill df-pill-approved">Booked</span>}
                            {order.status === 'awb_assigned' && <span className="df-pill df-pill-approved">AWB Linked</span>}
                            {order.status === 'shipped' && <span className="df-pill df-pill-shipped">Shipped</span>}
                            {order.status === 'delivered' && <span className="df-pill df-pill-delivered">Delivered</span>}
                            {order.status === 'cancelled' && <span className="df-pill df-pill-cancelled">Cancelled</span>}
                          </span>
                          {order.errorMessage && order.status === 'failed' && (
                            <span className="text-[10px] text-rose-600 font-sans block max-w-[160px] truncate" title={order.errorMessage}>
                              {order.errorMessage}
                            </span>
                          )}
                          {order.awbCode && (
                            <div className="space-y-0.5 mt-1">
                              <span className="text-xs text-[#b8862f] font-mono block font-bold">{order.awbCode}</span>
                              <span className="text-[9px] text-slate-450 font-sans block">{order.courierName}</span>
                            </div>
                          )}
                        </td>

                        {/* Actions matches style perfectly */}
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              id={`sync-btn-${order.id}`}
                              onClick={() => onRefreshTrack(order.id)}
                              className="px-2.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1 shadow-sm transition"
                              title="Sync tracking statuses"
                            >
                              <RefreshCw className="w-3 h-3 text-slate-500" />
                              <span>Sync</span>
                            </button>

                            <button
                              id={`details-btn-${order.id}`}
                              onClick={() => setSelectedOrderForDetails(order)}
                              className="px-2.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1 shadow-sm transition"
                              title="Details"
                            >
                              <Eye className="w-3 h-3 text-slate-500" />
                              <span>Details</span>
                            </button>

                            <button
                              id={`edit-btn-${order.id}`}
                              onClick={() => handleStartEdit(order)}
                              className="px-2.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1 shadow-sm transition"
                              title="Edit Order"
                            >
                              <Edit className="w-3 h-3 text-[#b8862f]" />
                              <span>Edit</span>
                            </button>

                            {/* Label download button styled exactly as Image 1 */}
                            {['booked', 'awb_assigned', 'shipped', 'delivered'].includes(order.status) && (
                              <button
                                id={`label-btn-${order.id}`}
                                onClick={() => handleSingleLabelClick(order)}
                                className={`px-2.5 py-1.5 border font-extrabold text-xs rounded-lg flex items-center gap-1 transition ${
                                  isThisDownloaded 
                                    ? 'bg-blue-600 hover:bg-blue-500 border-blue-500 text-white shadow shadow-blue-500/10' 
                                    : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                                }`}
                                title={isThisDownloaded ? "Already Downloaded. Click to print/re-download." : "Generate & Download shipping manifest"}
                              >
                                {isThisDownloaded ? <CheckCircle2 className="w-3.5 h-3.5 text-white" /> : <Download className="w-3.5 h-3.5 text-[#b8862f]" />}
                                <span>Label {isThisDownloaded ? '✔️' : ''}</span>
                              </button>
                            )}

                            {/* WhatsApp Preview button */}
                            {['booked', 'awb_assigned', 'shipped', 'delivered'].includes(order.status) && onShowWhatsApp && (
                              <button
                                id={`whatsapp-btn-${order.id}`}
                                onClick={() => onShowWhatsApp(order)}
                                className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 hover:border-emerald-300 rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm transition"
                                title="View WhatsApp notification sent to customer"
                              >
                                <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                                <span>WhatsApp</span>
                              </button>
                            )}

                            {/* Trigger verification/booking button for pending and failed orders */}
                            {(order.status === 'pending' || order.status === 'processing' || order.status === 'failed') && (() => {
                              const isOrderProcessing = processingOrderIds.includes(order.id);
                              return (
                                <div className="flex items-center space-x-1">
                                  <button
                                    id={`courier-btn-${order.id}`}
                                    data-testid={`courier-btn-${order.id}`}
                                    data-legacy-id={`pending-verify-btn-${order.id}`}
                                    onClick={() => {
                                      if (isOrderProcessing) return;
                                      onCheckServiceability(order);
                                    }}
                                    disabled={isOrderProcessing}
                                    className={`px-2.5 py-1.5 font-extrabold text-xs rounded-lg flex items-center gap-1 border transition ${
                                      isOrderProcessing
                                        ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
                                        : order.status === 'failed'
                                          ? 'bg-rose-50 hover:bg-rose-100 text-rose-800 border-rose-300'
                                          : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                                    }`}
                                    title={order.status === 'failed' ? (order.errorMessage ? `Booking failed: ${order.errorMessage}. Click to retry courier options.` : "Booking failed. Click to retry courier options.") : "Query serviceability and courier this order"}
                                  >
                                    {isOrderProcessing ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-500" />
                                    ) : (
                                      <Truck className={`w-3.5 h-3.5 ${order.status === 'failed' ? 'text-rose-600' : 'text-slate-500'}`} />
                                    )}
                                    <span>{isOrderProcessing ? 'Processing...' : order.status === 'failed' ? 'Retry Courier' : 'Courier'}</span>
                                  </button>

                                  {onPriorityBook && (
                                    <button
                                      id={`pending-priority-btn-${order.id}`}
                                      onClick={() => {
                                        if (isOrderProcessing) return;
                                        onPriorityBook(order.id);
                                      }}
                                      disabled={isOrderProcessing}
                                      className={`px-3 py-1.5 font-black text-xs uppercase tracking-wider rounded-lg flex items-center gap-1 shadow-sm transition ${
                                        isOrderProcessing
                                          ? 'bg-amber-300 text-slate-700 cursor-not-allowed opacity-60'
                                          : 'bg-amber-500 hover:bg-amber-400 text-slate-950 hover:shadow-md'
                                      }`}
                                      title="Automated matching and booking using configured priority hierarchy"
                                    >
                                      {isOrderProcessing ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-950" />
                                      ) : (
                                        <Sparkles className="w-3.5 h-3.5 text-slate-950 fill-slate-950" />
                                      )}
                                      <span>{isOrderProcessing ? 'Booking...' : order.status === 'failed' ? '⚡ Retry Priority' : '⚡ Priority Book'}</span>
                                    </button>
                                  )}
                                </div>
                              );
                            })()}

                            {currentUser?.role === 'admin' && onDeleteOrder && (
                              <button
                                id={`admin-delete-order-btn-${order.id}`}
                                onClick={() => onDeleteOrder(order.id)}
                                className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 font-extrabold text-xs rounded-lg flex items-center gap-1 border border-red-200 hover:border-red-300 transition"
                                title="Delete this order"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                <span>Delete</span>
                              </button>
                            )}

                            <button
                              id={`expand-toggle-${order.id}`}
                              onClick={() => toggleExpand(order.id)}
                              className={`p-1.5 rounded-lg border transition flex items-center justify-center ${
                                expandedOrderId === order.id 
                                  ? 'border-[#b8862f] bg-[#b8862f]/10 text-[#b8862f]' 
                                  : 'border-slate-200 hover:bg-slate-50 text-slate-400 hover:text-slate-700'
                              }`}
                            >
                              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-150 ${expandedOrderId === order.id ? 'rotate-180' : ''}`} />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Section (Logs, cancellation, invoice buttons) */}
                      {expandedOrderId === order.id && (
                        <tr id={`order-expand-row-${order.id}`}>
                          <td colSpan={9} className="bg-[#efe9de]/20 px-8 py-5 border-t border-b border-slate-200">
                            <motion.div
                              initial={{ opacity: 0, y: -8 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -8 }}
                              transition={{ duration: 0.18 }}
                              className="grid grid-cols-1 md:grid-cols-2 gap-6"
                            >
                              {/* Left Box: Manifest specs */}
                              <div className="space-y-3">
                                <h4 className="font-sans font-bold text-xs text-slate-500 uppercase tracking-wider">Manifest Parameters</h4>
                                <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2.5 font-mono text-xs text-slate-700 shadow-sm">
                                  <div className="flex justify-between border-b border-slate-100 pb-1.5">
                                    <span className="text-slate-500">Pickup Hub</span>
                                    <span className="font-bold text-slate-800">Pune Primary Hub (411037)</span>
                                  </div>
                                  <div className="flex justify-between border-b border-slate-100 pb-1.5">
                                    <span className="text-slate-500">Fulfillment Weight</span>
                                    <span className="font-bold text-slate-800">{order.weight} kg</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-500">L x W x H Dimension</span>
                                    <span className="font-bold text-slate-800">{order.dimensions?.length || 22}x{order.dimensions?.width || 15}x{order.dimensions?.height || 6} cm</span>
                                  </div>
                                </div>
                              </div>

                              {/* Right Box: Action tools */}
                              <div className="space-y-3">
                                <h4 className="font-sans font-bold text-xs text-slate-500 uppercase tracking-wider">Logistical Controls</h4>
                                <div className="flex flex-wrap gap-2">
                                  {['booked', 'awb_assigned', 'shipped', 'delivered'].includes(order.status) && (
                                    <>
                                      <button
                                        id={`gen-invoice-${order.id}`}
                                        onClick={() => onGenerateInvoice(order.id)}
                                        className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-bold text-xs rounded-xl flex items-center space-x-1.5 transition shadow-sm"
                                      >
                                        <Download className="w-3.5 h-3.5 text-[#b8862f]" />
                                        <span>Download Tax Invoice</span>
                                      </button>

                                      {order.status !== 'delivered' && (
                                        <button
                                          id={`cancel-shipment-${order.id}`}
                                          onClick={() => onCancelShipment(order.id)}
                                          className="px-4 py-2 bg-white hover:bg-red-50 text-red-600 border border-red-200 font-bold text-xs rounded-xl flex items-center space-x-1.5 transition shadow-sm"
                                        >
                                          <Ban className="w-3.5 h-3.5" />
                                          <span>Void Shiprocket Order</span>
                                        </button>
                                      )}
                                    </>
                                  )}
                                  {order.status === 'cancelled' && (
                                    <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs flex items-start space-x-2 font-mono">
                                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                      <span>Voided. This physical manifest has been successfully deleted from the Shiprocket courier roster.</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </React.Fragment>
            );
          })}
      </AnimatePresence>

              {fullyFilteredOrders.length === 0 && (
                <tr id="empty-results-row">
                  <td colSpan={9} className="px-6 py-16 text-center text-slate-500 font-sans" id="empty-results-cell">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Search className="w-8 h-8 text-slate-400 animate-pulse" />
                      <span className="text-sm font-extrabold text-slate-600">No matching orders found.</span>
                      <p className="text-xs text-slate-450">Try relaxing your search terms or changing your date/status filters.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* NEW ORDER MODAL POPUP SUBMIT FOR APPROVAL */}
      {isNewOrderOpen && (
        <div className="fixed inset-0 bg-[#1c1b1a]/75 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto" id="new-order-modal-overlay">
          <div className="bg-white text-slate-800 rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col animate-fade-in" id="new-order-modal">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h2 className="text-lg font-bold text-slate-900 df-display flex items-center gap-1.5">
                <Sparkles className="w-5 h-5 text-[#b8862f] animate-pulse" />
                <span>{isEditingOrder ? 'Edit Order Details' : 'New Order — Submit for Approval'}</span>
              </h2>
              <button 
                onClick={handleCloseForm}
                className="p-1 text-slate-400 hover:text-slate-650 rounded-lg hover:bg-slate-50 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleSubmitNewOrder} noValidate className="p-6 space-y-4 overflow-y-auto flex-1 text-xs text-slate-700">
              
              {/* Address Parser Field */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">AI Quick Assist: Paste raw text to pre-fill address fields</label>
                <div className="relative">
                  <textarea
                    rows={2}
                    value={rawAddress}
                    onChange={(e) => setRawAddress(e.target.value)}
                    placeholder="E.g. Flat 402 Sunshine MG Road Pune 411001..."
                    className="w-full p-3 pr-24 border border-slate-200 rounded-xl focus:border-[#b8862f] focus:ring-1 focus:ring-[#b8862f] outline-none font-mono text-xs bg-slate-50/50 resize-none transition"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      await handleParseAddress();
                    }}
                    disabled={parsingAddress}
                    className="absolute right-2.5 bottom-2.5 bg-slate-900 text-white hover:bg-slate-800 disabled:bg-slate-300 font-bold text-[10px] uppercase tracking-wide py-1.5 px-3 rounded-lg flex items-center space-x-1 transition shadow-sm"
                  >
                    {parsingAddress ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin text-white" />
                        <span>Parsing...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3 h-3 text-yellow-300" />
                        <span>AI Parse</span>
                      </>
                    )}
                  </button>
                </div>
                {parseError && (
                  <p className="text-[10px] text-red-500 font-mono mt-1">{parseError}</p>
                )}
              </div>

              {/* Customer Contact Info (Direct Inputs) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block text-xs">Customer Name *</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => {
                      setCustomerName(e.target.value);
                      if (e.target.value.trim()) {
                        setNameError(null);
                      }
                    }}
                    placeholder="Customer Name"
                    className={`w-full p-2.5 bg-white border rounded-lg outline-none transition ${
                      nameError 
                        ? 'border-red-500 focus:border-red-500 ring-2 ring-red-100' 
                        : 'border-slate-200 focus:border-[#b8862f]'
                    }`}
                  />
                  {nameError && (
                    <p className="text-[11px] text-red-650 font-bold mt-1 flex items-center gap-1" id="customer-name-error-msg">
                      {nameError}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block text-xs">Phone Number *</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      if (e.target.value.trim()) {
                        setPhoneError(null);
                      }
                    }}
                    placeholder="Phone number"
                    className={`w-full p-2.5 bg-white border rounded-lg outline-none transition font-mono ${
                      phoneError 
                        ? 'border-red-500 focus:border-red-500 ring-2 ring-red-100' 
                        : 'border-slate-200 focus:border-[#b8862f]'
                    }`}
                  />
                  {phoneError && (
                    <p className="text-[11px] text-red-650 font-bold mt-1 flex items-center gap-1" id="customer-phone-error-msg">
                      {phoneError}
                    </p>
                  )}
                </div>
              </div>

              {/* Catalog & Employee Assignment */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Assign Employee (optional)</label>
                  <select
                    value={assignedEmployee}
                    onChange={(e) => setAssignedEmployee(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-lg focus:border-[#b8862f] outline-none transition"
                  >
                    <option value="">Unassigned</option>
                    {employeesList.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name} ({emp.role || 'Staff'})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Pick from Catalog (optional)</label>
                  <select
                    value={selectedCatalogItem}
                    onChange={(e) => handleCatalogItemSelect(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-lg focus:border-[#b8862f] outline-none transition"
                  >
                    <option value="">Choose item...</option>
                    {currentCatalog.map((item, idx) => (
                      <option key={idx} value={item.name}>{item.name} - ₹{item.price}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Creator Info (Offline/Guest/Dynamic Employee Support) */}
              {!currentUser ? (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#b8862f] flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    <span>Order Placed / Created By Details</span>
                  </h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="font-bold text-slate-700 block text-xs">Select Creator Employee</label>
                      <select
                        value={createdByEmployeeId}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCreatedByEmployeeId(val);
                          if (val === 'custom') {
                            setCreatedByEmployeeName('');
                          } else {
                            const emp = employeesList.find(emp => emp.id === val);
                            setCreatedByEmployeeName(emp ? emp.name : (val ? val : 'Guest'));
                          }
                        }}
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-lg focus:border-[#b8862f] outline-none transition text-xs"
                      >
                        <option value="">Guest / Offline User</option>
                        {employeesList.map(emp => (
                          <option key={emp.id} value={emp.id}>{emp.name} ({emp.role || 'Staff'})</option>
                        ))}
                        <option value="custom">✍️ Custom Name...</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-slate-700 block text-xs">Creator / Employee Name</label>
                      <input
                        type="text"
                        disabled={createdByEmployeeId !== '' && createdByEmployeeId !== 'custom'}
                        value={createdByEmployeeName}
                        onChange={(e) => setCreatedByEmployeeName(e.target.value)}
                        placeholder="E.g. Operator"
                        className="w-full p-2.5 bg-white disabled:bg-slate-100 border border-slate-200 rounded-lg focus:border-[#b8862f] outline-none transition text-xs"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-200 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-emerald-800 font-medium">
                    <Users className="w-4 h-4 text-emerald-600" />
                    <span>Attributed Creator: <strong>{currentUser.name}</strong> ({currentUser.email})</span>
                  </div>
                  <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Auto attributed</span>
                </div>
              )}

              {/* Product and Quantity */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 space-y-1">
                  <label className="font-bold text-slate-700">Product Name *</label>
                  <input
                    type="text"
                    required
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    placeholder="Enter item name"
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-lg focus:border-[#b8862f] outline-none transition"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Quantity *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-lg focus:border-[#b8862f] outline-none transition font-mono"
                  />
                </div>
              </div>

              {/* Product Advance Checkbox */}
              <div className="flex items-center space-x-3 bg-[#efe9de]/30 border border-slate-200/80 p-3 rounded-xl">
                <input
                  type="checkbox"
                  id="product-advance-checkbox"
                  checked={productAdvance}
                  onChange={(e) => setProductAdvance(e.target.checked)}
                  className="w-4 h-4 rounded text-[#b8862f] border-slate-300 focus:ring-[#b8862f] cursor-pointer"
                />
                <div className="flex-1">
                  <label htmlFor="product-advance-checkbox" className="font-bold text-slate-800 text-xs cursor-pointer flex items-center justify-between">
                    <span>Product Advance</span>
                    <span className="font-mono text-[10px] bg-[#efe9de] text-[#a67527] px-2 py-0.5 rounded-md uppercase font-bold">
                      Incentive: ₹{productAdvance ? '50' : '30'}
                    </span>
                  </label>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Check if this is a product advance order. Confirmed orders earn ₹50 incentive instead of standard ₹30.
                  </p>
                </div>
              </div>



              {/* Amount, Weight and Payment Method */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Unit Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="E.g. 1499"
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-lg focus:border-[#b8862f] outline-none transition font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Weight (kg) *</label>
                  <input
                    type="text"
                    required
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder="E.g. 0.5"
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-lg focus:border-[#b8862f] outline-none transition font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Payment Method *</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-lg focus:border-[#b8862f] outline-none transition"
                  >
                    <option value="COD">Cash On Delivery (COD)</option>
                    <option value="Prepaid">Prepaid</option>
                  </select>
                </div>
              </div>

              {/* Dimensions (Length, Width, Height) */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block">Dimensions (cm) *</label>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-500 font-semibold uppercase">Length</span>
                    <input
                      type="number"
                      required
                      min={1}
                      value={boxLength}
                      onChange={(e) => setBoxLength(e.target.value)}
                      placeholder="L"
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-center font-mono outline-none focus:border-[#b8862f]"
                    />
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-500 font-semibold uppercase">Width</span>
                    <input
                      type="number"
                      required
                      min={1}
                      value={boxWidth}
                      onChange={(e) => setBoxWidth(e.target.value)}
                      placeholder="W"
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-center font-mono outline-none focus:border-[#b8862f]"
                    />
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-500 font-semibold uppercase">Height</span>
                    <input
                      type="number"
                      required
                      min={1}
                      value={boxHeight}
                      onChange={(e) => setBoxHeight(e.target.value)}
                      placeholder="H"
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-center font-mono outline-none focus:border-[#b8862f]"
                    />
                  </div>
                </div>
              </div>

              {/* Separator / Divider */}
              <div className="df-tape shrink-0 my-3" />

              {/* Address Fields ONLY - Strictly No Customer Name/Phone Inside Address */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-900 block font-sans uppercase tracking-wide">
                  Shipping Destination Address (Address Fields Only)
                </span>

                <div className="space-y-1">
                  <label className="font-bold text-slate-600">Full Street Address *</label>
                  <input
                    type="text"
                    required
                    value={addressText}
                    onChange={(e) => setAddressText(e.target.value)}
                    placeholder="House/flat number, street name, locality landmark"
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-lg focus:border-[#b8862f] outline-none transition"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-600">City *</label>
                    <input
                      type="text"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="City"
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg focus:border-[#b8862f] outline-none transition"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-600">State *</label>
                    <input
                      type="text"
                      required
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      placeholder="State"
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg focus:border-[#b8862f] outline-none transition"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-600">Pincode *</label>
                    <input
                      type="text"
                      required
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value)}
                      placeholder="6-digit pincode"
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg focus:border-[#b8862f] outline-none transition font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-2 shrink-0">
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold rounded-lg border border-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#b8862f] hover:bg-[#a67527] text-white font-extrabold rounded-lg shadow-md transition flex items-center space-x-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{isEditingOrder ? 'Save Changes' : 'Submit for Approval'}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Overlay details modal */}
      {selectedOrderForDetails && (
        <OrderDetailsModal 
          order={selectedOrderForDetails}
          onClose={() => setSelectedOrderForDetails(null)}
          onRefreshTrack={onRefreshTrack}
          onShowWhatsApp={onShowWhatsApp}
        />
      )}

      {/* Shipping label modal matching exactly Image 3 */}
      {selectedOrderForLabel && (
        <ShippingLabelModal 
          order={selectedOrderForLabel}
          onClose={() => {
            setSelectedOrderForLabel(null);
            refreshDownloadedStatus();
          }}
          onDownloadStatusChange={refreshDownloadedStatus}
        />
      )}
    </div>
  );
}
