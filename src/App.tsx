/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import ProfileModal from './components/ProfileModal';
import Dashboard from './components/Dashboard';
import OrdersTable from './components/OrdersTable';
import OrderParser from './components/OrderParser';
import SettingsPanel from './components/SettingsPanel';
import ServiceabilityModal from './components/ServiceabilityModal';
import WhatsAppPreviewModal from './components/WhatsAppPreviewModal';
import ProductsPanel from './components/ProductsPanel';
import ReplacementRequestsPanel from './components/ReplacementRequestsPanel';
import EmployeesPanel from './components/EmployeesPanel';
import CustomersPanel from './components/CustomersPanel';
import Login from './components/Login';
import PayrollPanel from './components/PayrollPanel';
import IncentivesPanel from './components/IncentivesPanel';
import ReportsPanel from './components/ReportsPanel';
import ShippingPanel from './components/ShippingPanel';
import AuditLogsPanel from './components/AuditLogsPanel';
import { Order, AppSettings, CourierServiceability } from './types';
import { RefreshCw, CheckCircle2, Menu, X } from 'lucide-react';
import { ShiprocketService } from './services/shiprocketService';
import { getTodayDateString } from './utils/dateUtils';
import { downloadFileFromUrl } from './utils/downloadHelper';

const DEFAULT_ORDERS: Order[] = [];

const DEFAULT_SETTINGS: AppSettings = {
  shiprocketEmail: '',
  shiprocketPassword: '',
  shiprocketToken: '',
  defaultPickupPincode: '411037',
  defaultPickupCity: 'Pune',
  defaultPickupState: 'Maharashtra',
  defaultWeight: 0.5,
  whatsappTemplate: 'Hey {{name}}, your Dappersfit order {{id}} has been shipped via {{courier}}! Trace your packet using tracking code {{awb}}.',
  emailTemplate: 'Hello {{name}},\n\nWe are delighted to inform you that your Dappersfit order {{id}} is on its way. It is being shipped via our express delivery partner {{courier}} under tracking number {{awb}}.\n\nThank you for choosing Dappersfit!'
};

export default function App() {
  const [user, setUser] = useState<{ name: string; email: string; role: 'admin' | 'employee' } | null>(() => {
    const saved = localStorage.getItem('dappersfit_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [orders, setOrders] = useState<Order[]>([]);

  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [activeTab, setActiveTab] = useState<string>('orders');
  const [isSimulated, setIsSimulated] = useState<boolean>(true);

  // Wallet State
  const [walletBalance, setWalletBalance] = useState<number>(500.00);
  const [walletSimulated, setWalletSimulated] = useState<boolean>(true);
  const [walletDetails, setWalletDetails] = useState<{
    available_balance: number;
    hold_amount: number;
    last_sync_time: string;
    is_simulated: boolean;
  } | null>(null);
  const [isSyncingWallet, setIsSyncingWallet] = useState<boolean>(false);

  // Synchronized logistics filtering state
  const [dateFilter, setDateFilter] = useState<string>('today');
  const [customDate, setCustomDate] = useState<string>(getTodayDateString());
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Serviceability Modal State
  const [selectedOrderForCheck, setSelectedOrderForCheck] = useState<Order | null>(null);
  const [selectedOrderForWhatsApp, setSelectedOrderForWhatsApp] = useState<Order | null>(null);

  // Success Notification banner
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);

  // Active in-flight booking order IDs for duplicate click protection
  const [processingOrderIds, setProcessingOrderIds] = useState<string[]>([]);
  const bookingInProgressRef = useRef<Set<string>>(new Set());

  // Responsive Mobile Navigation State
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);

  // Dashboard box navigation click callback
  const handleNavigateToOrders = (filterStatus?: string) => {
    setActiveTab('orders');
    setDateFilter('all');
    if (filterStatus) {
      setStatusFilter(filterStatus);
    } else {
      setStatusFilter('all');
    }
  };

  const fetchWalletBalance = async () => {
    try {
      const res = await ShiprocketService.fetchWalletDetails();
      if (res.success) {
        setWalletDetails({
          available_balance: res.available_balance,
          hold_amount: res.hold_amount,
          last_sync_time: res.last_sync_time,
          is_simulated: res.is_simulated
        });
        setWalletBalance(res.available_balance);
        setWalletSimulated(res.is_simulated);
      } else {
        // Fallback to fetchWallet if details fail
        const resBasic = await ShiprocketService.fetchWallet();
        if (resBasic.success) {
          setWalletBalance(resBasic.balance);
          setWalletSimulated(resBasic.isSimulated);
        }
      }
    } catch (err) {
      console.error('Failed to fetch wallet balance:', err);
    }
  };

  const handleSyncWalletDetails = async () => {
    setIsSyncingWallet(true);
    try {
      const res = await ShiprocketService.syncWalletDetails();
      if (res.success) {
        setWalletDetails({
          available_balance: res.available_balance,
          hold_amount: res.hold_amount,
          last_sync_time: res.last_sync_time,
          is_simulated: res.is_simulated
        });
        setWalletBalance(res.available_balance);
        setWalletSimulated(res.is_simulated);
        triggerBanner('Wallet balance synchronized successfully with Shiprocket API.');
      } else {
        triggerBanner(res.error || 'Failed to sync wallet balance.');
      }
    } catch (err: any) {
      console.error('Failed to sync wallet details:', err);
      triggerBanner(err.message || 'Error syncing wallet details.');
    } finally {
      setIsSyncingWallet(false);
    }
  };

  const handlePriorityBook = async (orderId: string) => {
    // Duplicate click prevention
    if (bookingInProgressRef.current.has(orderId)) {
      console.warn(`Priority booking already in progress for order ${orderId}, preventing duplicate request.`);
      return;
    }

    const targetOrder = orders.find(o => o.id === orderId);
    if (!targetOrder) return;

    const nameTrimmed = (targetOrder.customerName || '').trim();
    if (!nameTrimmed || nameTrimmed.toLowerCase() === 'walkin customer' || nameTrimmed.toLowerCase() === 'walk-in customer') {
      triggerBanner("There is no customer name. Please provide a valid customer name before booking this order.");
      return;
    }

    // 1. Capture exact previous status/state dynamically
    const previousStatus = targetOrder.status;

    bookingInProgressRef.current.add(orderId);
    setProcessingOrderIds(prev => prev.includes(orderId) ? prev : [...prev, orderId]);

    // 2. Set order status to "processing" during booking execution
    setOrders(prevOrders =>
      prevOrders.map(order =>
        order.id === orderId ? { ...order, status: 'processing' as const } : order
      )
    );

    try {
      // Find logged-in employee ID if role is employee
      let empId = undefined;
      if (user && user.role === 'employee') {
        const saved = localStorage.getItem('dappersfit_employees');
        const emps = saved ? JSON.parse(saved) : [];
        const matched = emps.find((e: any) => (e.email || '').toLowerCase().trim() === user.email.toLowerCase().trim() || (e.username || '').toLowerCase().trim() === user.email.toLowerCase().trim());
        empId = matched ? matched.id : user.name;
      }

      const res = await ShiprocketService.priorityBookOrder(orderId, empId);
      if (res.success) {
        const originalOrder = orders.find(o => o.id === orderId);
        const actualStatus: Order['status'] = (res.order?.status as Order['status']) || ((res as any).status as Order['status']) || 'booked';
        const updatedOrder: Order | null = res.order ? { ...res.order, status: actualStatus, errorMessage: undefined } : originalOrder ? {
          ...originalOrder,
          status: actualStatus,
          shiprocketOrderId: res.shiprocketOrderId,
          shipmentId: res.shipmentId,
          awbCode: res.awbCode,
          courierName: res.courierName,
          labelUrl: (res as any).labelUrl || originalOrder.labelUrl,
          errorMessage: undefined
        } : null;

        // Update React state reflecting actual Shiprocket status
        if (updatedOrder) {
          setOrders(prevOrders => 
            prevOrders.map(order => 
              order.id === orderId ? updatedOrder : order
            )
          );
          setSelectedOrderForWhatsApp(updatedOrder);
        }

        triggerBanner(`⚡ Successfully booked via ${res.courierName} (₹${res.rate?.toFixed(2)})! AWB: ${res.awbCode}. Status: Booked.`);
        fetchWalletBalance();

        // Safe background refresh from database
        try {
          const fetchRes = await fetch('/api/orders');
          const data = await fetchRes.json();
          if (data.orders && Array.isArray(data.orders)) {
            setOrders(data.orders.map((o: Order) => o.id === orderId && updatedOrder ? updatedOrder : o));
          }
        } catch (fetchErr) {
          console.warn('Background sync failed:', fetchErr);
        }

        // Only download shipping label if Shiprocket confirmed it was generated
        const hasLabel = (res as any).labelGenerated || (res as any).labelUrl || updatedOrder?.labelUrl;
        if (hasLabel) {
          try {
            const targetFilename = `Label_${originalOrder?.orderNumber || orderId}.pdf`;
            let downloadUrl = (res as any).labelUrl || updatedOrder?.labelUrl;
            if (!downloadUrl && res.shipmentId) {
              const labelRes = await ShiprocketService.fetchLabel(res.shipmentId);
              if (labelRes.success && labelRes.url) {
                downloadUrl = labelRes.url;
              }
            }
            if (downloadUrl) {
              await downloadFileFromUrl(downloadUrl, targetFilename);
              triggerBanner(`⚡ Auto-booked via ${res.courierName} and Shiprocket label downloaded!`);
              
              // Mark as downloaded in localStorage
              try {
                const prevSaved = localStorage.getItem('dappersfit_downloaded_labels');
                const prevList: string[] = prevSaved ? JSON.parse(prevSaved) : [];
                if (!prevList.includes(orderId)) {
                  localStorage.setItem('dappersfit_downloaded_labels', JSON.stringify([...prevList, orderId]));
                }
              } catch {}
            }
          } catch (labelErr) {
            console.error('Label auto-download error:', labelErr);
          }
        }
      } else {
        // Booking failed on Shiprocket: Mark clearly as failed, do NOT mark as Booked, keep courier options open for retry
        const errMessage = res.error || 'Priority booking failed on Shiprocket.';
        setOrders(prevOrders =>
          prevOrders.map(order =>
            order.id === orderId ? { ...order, status: 'failed' as const, errorMessage: errMessage } : order
          )
        );

        const errStr = (res.error || '').toLowerCase();
        if (
          errStr.includes('balance') ||
          errStr.includes('recharge') ||
          errStr.includes('insufficient') ||
          errStr.includes('payment') ||
          errStr.includes('wallet') ||
          errStr.includes('money invalid')
        ) {
          triggerBanner("⚠️ Warning: There is no balance in your Shiprocket wallet. Please recharge your wallet on the Shiprocket website.");
        } else {
          triggerBanner(errMessage);
        }
      }
    } catch (err: any) {
      console.error(err);
      const errMsg = err?.message || String(err);
      // Mark as failed so user can see it and retry
      setOrders(prevOrders =>
        prevOrders.map(order =>
          order.id === orderId ? { ...order, status: 'failed' as const, errorMessage: errMsg } : order
        )
      );
      const errStr = errMsg.toLowerCase();
      if (
        errStr.includes('balance') ||
        errStr.includes('recharge') ||
        errStr.includes('insufficient') ||
        errStr.includes('payment') ||
        errStr.includes('wallet') ||
        errStr.includes('money invalid')
      ) {
        triggerBanner("⚠️ Warning: There is no balance in your Shiprocket wallet. Please recharge your wallet on the Shiprocket website.");
      } else {
        triggerBanner(`Priority booking error: ${errMsg}`);
      }
    } finally {
      bookingInProgressRef.current.delete(orderId);
      setProcessingOrderIds(prev => prev.filter(id => id !== orderId));
    }
  };

  // Read backend settings/status and orders on startup
  useEffect(() => {
    async function checkStatus() {
      try {
        const response = await fetch('/api/status');
        const data = await response.json();
        setIsSimulated(data.isSimulated);
        setSettings(prev => ({
          ...prev,
          shiprocketEmail: data.email || '',
          shiprocketToken: data.token || ''
        }));
      } catch (err) {
        console.error('Failed to communicate with fullstack server:', err);
      }
    }

    async function fetchOrders() {
      try {
        const res = await fetch('/api/orders');
        const data = await res.json();
        if (data.orders) {
          setOrders(data.orders);
        }
      } catch (err) {
        console.error('Failed to load orders from backend:', err);
      }
    }

    checkStatus();
    fetchOrders();
    fetchWalletBalance();
  }, []);

  const triggerBanner = (message: string) => {
    setBannerMessage(message);
    setTimeout(() => setBannerMessage(null), 3000);
  };

  // Orchestrations: Reload orders
  const handleReloadOrders = async () => {
    try {
      const res = await fetch('/api/orders');
      const data = await res.json();
      if (data.orders) {
        setOrders(data.orders);
        triggerBanner('Orders reloaded successfully from database.');
      }
    } catch (err) {
      console.error('Failed to reload orders:', err);
      triggerBanner('Failed to reload orders from server.');
    }
    fetchWalletBalance();
  };

  // Orchestrations: Book Shipment via modal
  const handleBookShipment = async (
    courier: CourierServiceability,
    deliveryAddress?: any,
    pickupLocationName?: string,
    pickupPostcode?: string
  ) => {
    if (!selectedOrderForCheck) return;
    const orderId = selectedOrderForCheck.id;

    // Duplicate click prevention
    if (bookingInProgressRef.current.has(orderId)) {
      console.warn(`Courier booking already in progress for order ${orderId}, preventing duplicate request.`);
      return;
    }

    const nameTrimmed = (selectedOrderForCheck.customerName || '').trim();
    if (!nameTrimmed || nameTrimmed.toLowerCase() === 'walkin customer' || nameTrimmed.toLowerCase() === 'walk-in customer') {
      triggerBanner("There is no customer name. Please provide a valid customer name before booking this order.");
      return;
    }

    // 1. Capture exact previous status/state dynamically
    const previousStatus = selectedOrderForCheck.status;

    bookingInProgressRef.current.add(orderId);
    setProcessingOrderIds(prev => prev.includes(orderId) ? prev : [...prev, orderId]);

    // 2. Set order status to "processing" during booking execution
    setOrders(prevOrders =>
      prevOrders.map(order =>
        order.id === orderId ? { ...order, status: 'processing' as const } : order
      )
    );

    try {
      // Find logged-in employee ID if role is employee
      let empId = undefined;
      if (user && user.role === 'employee') {
        const saved = localStorage.getItem('dappersfit_employees');
        const emps = saved ? JSON.parse(saved) : [];
        const matched = emps.find((e: any) => (e.email || '').toLowerCase().trim() === user.email.toLowerCase().trim() || (e.username || '').toLowerCase().trim() === user.email.toLowerCase().trim());
        empId = matched ? matched.id : user.name;
      }

      const res = await ShiprocketService.bookOrder(
        orderId, 
        courier, 
        empId,
        deliveryAddress,
        pickupLocationName,
        pickupPostcode
      );
      
      if (res.success) {
        const actualStatus: Order['status'] = (res.order?.status as Order['status']) || ((res as any).status as Order['status']) || 'booked';
        const updatedOrder: Order = { 
          ...(res.order || selectedOrderForCheck), 
          status: actualStatus, 
          shiprocketOrderId: res.shiprocketOrderId || selectedOrderForCheck.shiprocketOrderId,
          shipmentId: res.shipmentId || selectedOrderForCheck.shipmentId,
          awbCode: res.awbCode || selectedOrderForCheck.awbCode,
          courierName: res.courierName || selectedOrderForCheck.courierName,
          labelUrl: (res as any).labelUrl || res.order?.labelUrl || selectedOrderForCheck.labelUrl,
          errorMessage: undefined,
          trackingHistory: [
            { 
              date: new Date().toISOString().replace('T', ' ').slice(0, 16), 
              status: actualStatus === 'shipped' ? 'Shipped' : 'Booked', 
              location: `${settings.defaultPickupCity} Dispatch (MH)`, 
              activity: `Shipment booked via ${res.courierName}. Shiprocket ID: ${res.shiprocketOrderId}` 
            }
          ]
        };

        // Update React state reflecting actual Shiprocket status (Booked, NOT Shipped)
        setOrders(prevOrders => 
          prevOrders.map(order => 
            order.id === orderId ? updatedOrder : order
          )
        );

        setSelectedOrderForCheck(null);
        setSelectedOrderForWhatsApp(updatedOrder);
        triggerBanner(`AWB ${res.awbCode} successfully booked via ${res.courierName}. Status: Booked.`);
        fetchWalletBalance();

        // Background refresh from database preserving synced state
        try {
          const fetchRes = await fetch('/api/orders');
          const data = await fetchRes.json();
          if (data.orders && Array.isArray(data.orders)) {
            setOrders(data.orders.map((o: Order) => o.id === orderId ? updatedOrder : o));
          }
        } catch (fetchErr) {
          console.warn('Background sync failed:', fetchErr);
        }

        // Only download shipping label if Shiprocket confirmed it was generated
        const hasLabel = (res as any).labelGenerated || (res as any).labelUrl || updatedOrder.labelUrl;
        if (hasLabel) {
          try {
            const targetFilename = `Label_${selectedOrderForCheck.orderNumber || orderId}.pdf`;
            let downloadUrl = (res as any).labelUrl || updatedOrder.labelUrl;
            if (!downloadUrl && res.shipmentId) {
              const labelRes = await ShiprocketService.fetchLabel(res.shipmentId);
              if (labelRes.success && labelRes.url) {
                downloadUrl = labelRes.url;
              }
            }
            if (downloadUrl) {
              await downloadFileFromUrl(downloadUrl, targetFilename);
              triggerBanner(`AWB ${res.awbCode} booked and Shiprocket label downloaded!`);
              
              // Mark as downloaded in localStorage
              try {
                const prevSaved = localStorage.getItem('dappersfit_downloaded_labels');
                const prevList: string[] = prevSaved ? JSON.parse(prevSaved) : [];
                if (!prevList.includes(orderId)) {
                  localStorage.setItem('dappersfit_downloaded_labels', JSON.stringify([...prevList, orderId]));
                }
              } catch {}
            }
          } catch (labelErr) {
            console.error('Failed to auto-download label after booking:', labelErr);
          }
        }
      } else {
        // Booking failed on Shiprocket: Mark order clearly as failed (not Booked) so courier options remain available
        const errMessage = res.error || 'Booking failed on Shiprocket.';
        setOrders(prevOrders =>
          prevOrders.map(order =>
            order.id === orderId ? { ...order, status: 'failed' as const, errorMessage: errMessage } : order
          )
        );

        const errStr = (res.error || '').toLowerCase();
        if (
          errStr.includes('balance') ||
          errStr.includes('recharge') ||
          errStr.includes('insufficient') ||
          errStr.includes('payment') ||
          errStr.includes('wallet') ||
          errStr.includes('money invalid')
        ) {
          triggerBanner("⚠️ Warning: There is no balance in your Shiprocket wallet. Please recharge your wallet on the Shiprocket website.");
        } else {
          triggerBanner(errMessage);
        }
      }
    } catch (err: any) {
      console.error(err);
      const errMsg = err?.message || String(err);
      // Mark as failed so user can clearly see failure and retry
      setOrders(prevOrders =>
        prevOrders.map(order =>
          order.id === orderId ? { ...order, status: 'failed' as const, errorMessage: errMsg } : order
        )
      );
      const errStr = errMsg.toLowerCase();
      if (
        errStr.includes('balance') ||
        errStr.includes('recharge') ||
        errStr.includes('insufficient') ||
        errStr.includes('payment') ||
        errStr.includes('wallet') ||
        errStr.includes('money invalid')
      ) {
        triggerBanner("⚠️ Warning: There is no balance in your Shiprocket wallet. Please recharge your wallet on the Shiprocket website.");
      } else {
        triggerBanner(`Booking failed: ${errMsg}`);
      }
    } finally {
      bookingInProgressRef.current.delete(orderId);
      setProcessingOrderIds(prev => prev.filter(id => id !== orderId));
    }
  };

  // Orchestrations: Generate Label PDF
  const handleGenerateLabel = async (orderId: string) => {
    let order = orders.find(o => o.id === orderId);
    if (!order) return;

    let targetShipmentId = order.shipmentId;

    // Fallback: If shipmentId is missing but we have shiprocketOrderId, reconcile it!
    if (!targetShipmentId && order.shiprocketOrderId) {
      triggerBanner('Shipment ID missing. Querying Shiprocket to retrieve shipment details...');
      try {
        const response = await fetch('/api/shiprocket/reconcile-shipment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: order.id, shiprocketOrderId: order.shiprocketOrderId })
        });
        const data = await response.json();
        if (data.success && data.shipmentId) {
          targetShipmentId = data.shipmentId;
          // Update order locally
          setOrders(prev => prev.map(o => o.id === orderId ? { ...o, shipmentId: data.shipmentId, awbCode: data.awbCode, courierName: data.courierName, status: data.order.status } : o));
          // Refresh current order object reference
          order = { ...order, shipmentId: data.shipmentId, awbCode: data.awbCode, courierName: data.courierName, status: data.order.status };
          triggerBanner('Shipment details retrieved and synced successfully.');
        } else {
          triggerBanner(`Could not retrieve shipment details: ${data.error || 'Unknown error'}`);
          return;
        }
      } catch (err: any) {
        console.error('Failed to reconcile shipment details:', err);
        triggerBanner('Error reconciling shipment details.');
        return;
      }
    }

    if (!targetShipmentId) {
      triggerBanner('This order does not have a shipment ID yet.');
      return;
    }

    try {
      const res = await ShiprocketService.fetchLabel(String(targetShipmentId));
      if (res.success && res.url) {
        await downloadFileFromUrl(res.url, `Label_${order.orderNumber || order.id}.pdf`);
        triggerBanner('Courier routing label downloaded successfully.');
      } else {
        triggerBanner(`Label retrieval failed: ${res.error}`);
      }
    } catch (err) {
      console.error(err);
      triggerBanner('Error fetching shipping label.');
    }
  };

  // Orchestrations: Generate Invoice PDF
  const handleGenerateInvoice = async (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    const targetOrderId = order.shiprocketOrderId || order.shipmentId || order.id;

    try {
      const res = await ShiprocketService.fetchInvoice(String(targetOrderId));
      if (res.success && res.url) {
        await downloadFileFromUrl(res.url, `Invoice_${order.orderNumber || order.id}.pdf`);
        triggerBanner('Tax invoice document downloaded successfully.');
      } else {
        triggerBanner(`Invoice retrieval failed: ${res.error}`);
      }
    } catch (err) {
      console.error(err);
      triggerBanner('Error fetching tax invoice.');
    }
  };

  // Orchestrations: Cancel Shipment
  const handleCancelShipment = async (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    try {
      const res = await ShiprocketService.cancelShipment(order.shiprocketOrderId || order.id);
      if (res.success) {
        try {
          const fetchRes = await fetch('/api/orders');
          const data = await fetchRes.json();
          if (data.orders) {
            setOrders(data.orders);
          }
        } catch {
          setOrders(prevOrders => 
            prevOrders.map(o => 
              o.id === orderId ? { ...o, status: 'cancelled' } : o
            )
          );
        }
        triggerBanner(`Shipment for Order ${order.orderNumber} successfully voided.`);
      } else {
        triggerBanner(`Cancellation failed: ${res.error}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Orchestrations: Sync / Query live tracking details
  const handleRefreshTrack = async (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    try {
      // Sync real status directly with Shiprocket API
      const syncRes = await ShiprocketService.syncOrderStatus(orderId);
      if (syncRes.success && syncRes.order) {
        const updated = syncRes.order;
        setOrders(prevOrders => 
          prevOrders.map(o => o.id === orderId ? updated : o)
        );
        triggerBanner(`Order ${order.orderNumber} status synced with Shiprocket: ${updated.status.toUpperCase()}`);
        return;
      }

      // Fallback to tracking query if AWB code is present
      if (order.awbCode) {
        const res = await ShiprocketService.trackShipment(order.awbCode);
        if (res.success) {
          try {
            const fetchRes = await fetch('/api/orders');
            const data = await fetchRes.json();
            if (data.orders) {
              setOrders(data.orders);
            }
          } catch {
            setOrders(prevOrders => 
              prevOrders.map(o => 
                o.id === orderId 
                  ? { ...o, trackingHistory: res.trackingHistory } 
                  : o
              )
            );
          }
          triggerBanner(`Tracking milestones synced for ${order.orderNumber}.`);
        } else {
          triggerBanner(`Tracking sync failed: ${res.error}`);
        }
      } else {
        triggerBanner(`Status check: Order ${order.orderNumber} is ${order.status}.`);
      }
    } catch (err: any) {
      console.error(err);
      triggerBanner(`Sync error: ${err.message || 'Failed to sync with Shiprocket'}`);
    }
  };

  // Orchestrations: Ingest or Update order
  const handleImportOrder = async (parsed: Partial<Order>) => {
    const isEdit = !!parsed.id;
    const existingOrder = isEdit ? orders.find(o => o.id === parsed.id) : null;
    
    let orderNum = parsed.orderNumber || (existingOrder ? existingOrder.orderNumber : undefined);
    if (!orderNum) {
      let maxNum = 1090;
      orders.forEach(o => {
        if (o.orderNumber && o.orderNumber.startsWith('DF-')) {
          const num = parseInt(o.orderNumber.replace('DF-', ''), 10);
          if (!isNaN(num) && num > maxNum) {
            maxNum = num;
          }
        }
      });
      orderNum = `DF-${maxNum + 1}`;
    }

    const newOrder: Order = {
      id: parsed.id || `${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
      orderNumber: orderNum,
      date: parsed.date || (existingOrder ? existingOrder.date : new Date().toISOString().slice(0, 10)),
      customerName: parsed.customerName || parsed.address?.name || 'Walkin Customer',
      address: {
        name: parsed.address?.name || parsed.customerName || 'Walkin Customer',
        phone: parsed.address?.phone || '9999999999',
        address: parsed.address?.address || 'No Address Provided',
        city: parsed.address?.city || 'Pune',
        state: parsed.address?.state || 'Maharashtra',
        pincode: parsed.address?.pincode || '411001',
        email: parsed.address?.email || 'customer@dappersfit.com'
      },
      items: (parsed.items || []).map((item, idx) => ({
        id: item.id || `i-new-${idx}`,
        name: item.name,
        sku: item.sku || `SKU-NEW-${idx}`,
        quantity: item.quantity || 1,
        price: item.price || 999
      })),
      totalAmount: parsed.totalAmount || (parsed.items || []).reduce((sum, i) => sum + ((i.price || 0) * (i.quantity || 1)), 0),
      status: parsed.status || (existingOrder ? existingOrder.status : 'pending'),
      weight: parsed.weight !== undefined ? parsed.weight : (existingOrder ? existingOrder.weight : settings.defaultWeight),
      dimensions: parsed.dimensions || (existingOrder ? existingOrder.dimensions : { length: 22, width: 15, height: 6 }),
      assignedEmployeeId: parsed.assignedEmployeeId !== undefined ? parsed.assignedEmployeeId : (existingOrder ? existingOrder.assignedEmployeeId : undefined),
      paymentMethod: parsed.paymentMethod || (existingOrder ? existingOrder.paymentMethod : 'COD'),
      productAdvance: parsed.productAdvance !== undefined ? parsed.productAdvance : (existingOrder ? existingOrder.productAdvance : false),
      productAdvanceIncentive: parsed.productAdvanceIncentive !== undefined ? parsed.productAdvanceIncentive : (existingOrder ? existingOrder.productAdvanceIncentive : undefined),
      shiprocketOrderId: parsed.shiprocketOrderId || (existingOrder ? existingOrder.shiprocketOrderId : undefined),
      shipmentId: parsed.shipmentId || (existingOrder ? existingOrder.shipmentId : undefined),
      awbCode: parsed.awbCode || (existingOrder ? existingOrder.awbCode : undefined),
      courierName: parsed.courierName || (existingOrder ? existingOrder.courierName : undefined),
      deliveryDate: parsed.deliveryDate || (existingOrder ? existingOrder.deliveryDate : undefined),
      createdByEmployeeId: parsed.createdByEmployeeId !== undefined 
        ? parsed.createdByEmployeeId 
        : (existingOrder ? existingOrder.createdByEmployeeId : (user ? user.email : 'System')),
      createdByEmployeeName: parsed.createdByEmployeeName !== undefined 
        ? parsed.createdByEmployeeName 
        : (existingOrder ? existingOrder.createdByEmployeeName : (user ? user.name : 'System'))
    };

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newOrder)
      });
      const data = await response.json();
      if (data.success && data.orders) {
        setOrders(data.orders);
      } else {
        setOrders(prev => {
          if (isEdit) {
            return prev.map(o => o.id === newOrder.id ? newOrder : o);
          } else {
            return [newOrder, ...prev];
          }
        });
      }
    } catch (err) {
      console.error('Failed to sync order with server:', err);
      setOrders(prev => {
        if (isEdit) {
          return prev.map(o => o.id === newOrder.id ? newOrder : o);
        } else {
          return [newOrder, ...prev];
        }
      });
    }

    if (isEdit) {
      triggerBanner(`Successfully updated order ${orderNum}.`);
    } else {
      triggerBanner(`Ingested parsed order ${orderNum} into active pipeline.`);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!window.confirm('Are you sure you want to delete this order?')) {
      return;
    }
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      
      if (data.success && data.orders) {
        setOrders(data.orders);
        triggerBanner('Order deleted permanently.');
      } else {
        setOrders(prev => prev.filter(o => o.id !== orderId));
        triggerBanner('Order deleted permanently.');
      }
    } catch (err) {
      console.error('Failed to delete order:', err);
      setOrders(prev => prev.filter(o => o.id !== orderId));
      triggerBanner('Order deleted permanently.');
    }
  };

  const handleSaveSettings = async (updated: AppSettings) => {
    setSettings(updated);
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shiprocketEmail: updated.shiprocketEmail,
          shiprocketPassword: updated.shiprocketPassword,
          shiprocketToken: updated.shiprocketToken
        })
      });
      const data = await response.json();
      setIsSimulated(data.isSimulated);
      triggerBanner('Administrative settings updated and synced with server.');
    } catch (err) {
      console.error('Failed to sync settings with server:', err);
      triggerBanner('Administrative settings updated.');
    }
  };

  const handleLoginSuccess = (loggedInUser: { name: string; email: string; role: 'admin' | 'employee' }) => {
    setUser(loggedInUser);
    localStorage.setItem('dappersfit_user', JSON.stringify(loggedInUser));
    setActiveTab('dashboard');
    triggerBanner(`Welcome back, ${loggedInUser.name}!`);
  };

  const handleSignOut = () => {
    setUser(null);
    localStorage.removeItem('dappersfit_user');
    triggerBanner('Signed out successfully.');
  };

  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="flex h-screen bg-slate-950 font-sans text-slate-100 overflow-hidden" id="app-viewport">
      {/* Desktop Sidebar (visible on lg and larger) */}
      <div className="hidden lg:flex lg:w-64 h-full shrink-0" id="desktop-sidebar-container">
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          isSimulated={isSimulated} 
          user={user}
          onSignOut={handleSignOut}
          onOpenProfile={() => setIsProfileModalOpen(true)}
        />
      </div>

      {/* Mobile Drawer Navigation (visible on screens smaller than lg) */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden" id="mobile-sidebar-overlay">
          {/* Blur backdrop click-off */}
          <div 
            className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity duration-300"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
          {/* Sliding menu panel */}
          <div className="relative flex w-72 max-w-xs flex-1 flex-col bg-[#1c1b1a] h-full shadow-2xl border-r border-[#2a2826] animate-in slide-in-from-left duration-200">
            {/* Close button icon */}
            <div className="absolute top-4 right-4 z-50">
              <button 
                onClick={() => setIsMobileSidebarOpen(false)}
                className="p-1.5 rounded-lg bg-white/5 text-slate-400 hover:text-white border border-white/10 transition"
                title="Close navigation"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {/* Sidebar component with auto-closing on tab selection */}
            <Sidebar 
              activeTab={activeTab} 
              setActiveTab={(tab) => {
                setActiveTab(tab);
                setIsMobileSidebarOpen(false);
              }} 
              isSimulated={isSimulated} 
              user={user}
              onSignOut={() => {
                handleSignOut();
                setIsMobileSidebarOpen(false);
              }}
              onOpenProfile={() => {
                setIsProfileModalOpen(true);
                setIsMobileSidebarOpen(false);
              }}
            />
          </div>
        </div>
      )}

      {/* Main Panel */}
      <div className="flex-1 flex flex-col h-full overflow-hidden" id="app-main-panel">
        
        {/* Mobile Navbar Header (visible only on screens smaller than lg) */}
        <div className="lg:hidden flex items-center justify-between px-4 py-3.5 bg-[#1c1b1a] border-b border-[#2a2826] shrink-0" id="mobile-navbar">
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => setIsMobileSidebarOpen(true)}
              className="p-2 rounded-lg bg-white/5 text-slate-300 hover:text-white border border-white/10 transition"
              id="mobile-hamburger-btn"
              title="Open Navigation Drawer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-md bg-[#b8862f] flex items-center justify-center text-white font-sans font-black text-sm">
                D
              </div>
              <span className="text-md font-bold text-white tracking-tight font-sans">Dapper Fit</span>
            </div>
          </div>
          
          <div className="flex items-center">
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
              isSimulated 
                ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' 
                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
            }`}>
              {isSimulated ? 'SANDBOX' : 'LIVE'}
            </span>
          </div>
        </div>
        
        {/* Banner Alert Toast */}
        {bannerMessage && (
          <div className="bg-slate-900 border-b border-slate-800/80 px-6 py-3 flex items-center justify-between text-xs text-sky-400 font-mono animate-fade-in" id="banner-notification">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0 animate-bounce" />
              <span>{bannerMessage}</span>
            </div>
          </div>
        )}

        {/* Scrollable View Area */}
        <div className="flex-1 overflow-y-auto" id="app-scrollable-viewport">
          {activeTab === 'dashboard' && (
            <Dashboard 
              orders={orders} 
              onReloadOrders={handleReloadOrders} 
              isSimulated={isSimulated} 
              onNavigateToOrders={handleNavigateToOrders}
              user={user}
            />
          )}

          {activeTab === 'orders' && (
            <OrdersTable 
              orders={orders}
              onAddOrder={handleImportOrder}
              onCheckServiceability={(order) => setSelectedOrderForCheck(order)}
              onCancelShipment={handleCancelShipment}
              onRefreshTrack={handleRefreshTrack}
              onGenerateLabel={handleGenerateLabel}
              onGenerateInvoice={handleGenerateInvoice}
              dateFilter={dateFilter}
              setDateFilter={setDateFilter}
              customDate={customDate}
              setCustomDate={setCustomDate}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              walletBalance={walletBalance}
              walletSimulated={walletSimulated}
              walletDetails={walletDetails}
              isSyncingWallet={isSyncingWallet}
              onSyncWalletDetails={handleSyncWalletDetails}
              onFetchWalletDetails={fetchWalletBalance}
              onPriorityBook={handlePriorityBook}
              currentUser={user}
              onDeleteOrder={handleDeleteOrder}
              onShowWhatsApp={(order) => setSelectedOrderForWhatsApp(order)}
              processingOrderIds={processingOrderIds}
            />
          )}

          {activeTab === 'courier-booking' && (
            <div className="w-full h-full p-4 md:p-6 bg-[#0f172a] text-white flex flex-col overflow-y-auto" id="courier-booking-tab-container">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase font-mono tracking-wider text-slate-400">Integrated Vanilla JS Module</span>
                </div>
                <a 
                  href="/courier-booking" 
                  target="_blank" 
                  rel="noreferrer" 
                  className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1 font-medium bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700"
                >
                  Open Standalone Full Page &nearr;
                </a>
              </div>
              <iframe 
                src="/courier-booking" 
                className="w-full flex-1 min-h-[960px] border border-slate-800 rounded-xl shadow-lg bg-[#0f172a]"
                title="Shiprocket Courier Booking Engine"
              />
            </div>
          )}

          {activeTab === 'parser' && (
            <OrderParser 
              onImportOrder={handleImportOrder} 
            />
          )}

          {activeTab === 'products' && (
            <ProductsPanel />
          )}

          {activeTab === 'replacements' && (
            <ReplacementRequestsPanel user={user} />
          )}

          {activeTab === 'employees' && (
            <EmployeesPanel currentUser={user} />
          )}

          {activeTab === 'customers' && (
            <CustomersPanel currentUser={user} />
          )}

          {activeTab === 'payroll' && (
            <PayrollPanel />
          )}

          {activeTab === 'incentives' && (
            <IncentivesPanel orders={orders} />
          )}

          {activeTab === 'reports' && (
            <ReportsPanel 
              orders={orders} 
              dateFilter={dateFilter}
              setDateFilter={setDateFilter}
              customDate={customDate}
              setCustomDate={setCustomDate}
            />
          )}

          {activeTab === 'shipping' && (
            <ShippingPanel />
          )}

          {activeTab === 'audit-logs' && (
            <AuditLogsPanel />
          )}

          {activeTab === 'settings' && (
            <SettingsPanel 
              settings={settings} 
              onSaveSettings={handleSaveSettings} 
              isSimulated={isSimulated} 
            />
          )}
        </div>
      </div>

      {/* Overlay Serviceability Modal check */}
      {selectedOrderForCheck && (
        <ServiceabilityModal
          order={selectedOrderForCheck}
          onClose={() => setSelectedOrderForCheck(null)}
          onBook={handleBookShipment}
          walletBalance={walletBalance}
          walletSimulated={walletSimulated}
          onRefreshWallet={fetchWalletBalance}
          isProcessing={processingOrderIds.includes(selectedOrderForCheck.id)}
        />
      )}

      {/* Overlay WhatsApp Preview Modal check */}
      {selectedOrderForWhatsApp && (
        <WhatsAppPreviewModal
          order={selectedOrderForWhatsApp}
          onClose={() => setSelectedOrderForWhatsApp(null)}
        />
      )}
    </div>
  );
}
