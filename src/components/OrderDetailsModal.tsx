/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, RefreshCw, Clock, MapPin, Phone, Package, DollarSign, Calendar, Truck, CheckCircle2 } from 'lucide-react';
import { Order } from '../types';

interface OrderDetailsModalProps {
  order: Order;
  onClose: () => void;
  onRefreshTrack: (orderId: string) => void;
  onShowWhatsApp?: (order: Order) => void;
}

export default function OrderDetailsModal({ order, onClose, onRefreshTrack, onShowWhatsApp }: OrderDetailsModalProps) {
  // Synthesize or map fields to match Image 1 format
  const orderId = order.orderNumber.startsWith('ord_') ? order.orderNumber : `ord_${order.id}${order.orderNumber.replace(/[^0-9]/g, '')}`;
  const employee = (order as any).employee || '—';
  const customer = (order.customerName || '').toUpperCase();
  const phone = order.address?.phone || '—';
  const product = order.items.map(item => `${item.name}${item.option ? ` (${item.option})` : ''}`).join(', ') || 'drone';
  const amount = `₹${(Number(order.totalAmount) || 0).toLocaleString()}`;
  const payment = (order as any).paymentMethod || 'COD';
  const deliveryAddress = order.address 
    ? `${order.address.address || ''}, ${order.address.city || ''}, ${order.address.state || ''}, ${order.address.pincode || ''}`
    : '—';
  const shiprocketOrder = order.shiprocketOrderId || '—';
  const shipmentId = order.shipmentId || '—';
  const awbNumber = order.awbCode || '—';
  const courierPartner = order.courierName || '—';
  const pickupStatus = order.status === 'awb_assigned' ? 'Pending' : order.status === 'shipped' ? 'In Transit' : order.status === 'delivered' ? 'Delivered' : order.status === 'cancelled' ? 'Cancelled' : 'Pending';
  const expectedDelivery = order.deliveryDate || '—';
  const lastSynced = (order as any).lastSynced || '10 Jul 2026, 10:42 am';
  const orderDate = (order as any).orderDateFormatted || '10 Jul 2026, 10:19 am';

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" id="order-details-overlay">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col text-slate-850 animate-in fade-in zoom-in-95 duration-150" id="order-details-card">
        
        {/* Modal Header */}
        <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50" id="details-header">
          <div className="flex items-center space-x-2.5">
            <Package className="w-5 h-5 text-slate-700" />
            <h3 className="font-sans font-bold text-lg text-slate-900">Order Details</h3>
          </div>
          <div className="flex items-center space-x-3">
            <span className="px-3 py-1 bg-slate-100 border border-slate-200 text-slate-600 rounded-full text-xs font-semibold">
              {order.status === 'pending' ? 'Unknown' : order.status.toUpperCase()}
            </span>
            <button 
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition"
              id="details-close-button"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-8 space-y-6 overflow-y-auto max-h-[80vh] font-sans" id="details-content">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6 text-sm">
            
            {/* Left Column */}
            <div className="space-y-5">
              <div id="field-order-id">
                <label className="text-[11px] font-sans font-bold text-slate-400 uppercase tracking-wider block">Order ID</label>
                <span className="text-base font-bold text-slate-850 block mt-0.5">{orderId}</span>
              </div>

              <div id="field-customer">
                <label className="text-[11px] font-sans font-bold text-slate-400 uppercase tracking-wider block">Customer</label>
                <span className="text-base font-bold text-slate-850 block mt-0.5">{customer}</span>
              </div>

              <div id="field-product">
                <label className="text-[11px] font-sans font-bold text-slate-400 uppercase tracking-wider block">Product</label>
                <span className="text-base font-bold text-slate-850 block mt-0.5">{product}</span>
              </div>

              <div id="field-payment">
                <label className="text-[11px] font-sans font-bold text-slate-400 uppercase tracking-wider block">Payment</label>
                <span className="text-base font-bold text-slate-850 block mt-0.5">{payment}</span>
              </div>

              <div id="field-shiprocket-order">
                <label className="text-[11px] font-sans font-bold text-slate-400 uppercase tracking-wider block">Shiprocket Order</label>
                <span className="text-base font-bold text-slate-850 block mt-0.5">{shiprocketOrder}</span>
              </div>

              <div id="field-awb-number">
                <label className="text-[11px] font-sans font-bold text-slate-400 uppercase tracking-wider block">AWB Number</label>
                <span className="text-base font-bold text-slate-850 block mt-0.5">{awbNumber}</span>
              </div>

              <div id="field-pickup-status">
                <label className="text-[11px] font-sans font-bold text-slate-400 uppercase tracking-wider block">Pickup Status</label>
                <span className="text-base font-bold text-slate-850 block mt-0.5">{pickupStatus}</span>
              </div>

              <div id="field-last-synced">
                <label className="text-[11px] font-sans font-bold text-slate-400 uppercase tracking-wider block">Last Synced</label>
                <span className="text-base font-semibold text-slate-800 block mt-0.5">{lastSynced}</span>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-5">
              <div id="field-employee">
                <label className="text-[11px] font-sans font-bold text-slate-400 uppercase tracking-wider block">Employee</label>
                <span className="text-base font-bold text-slate-850 block mt-0.5">{employee}</span>
              </div>

              <div id="field-phone">
                <label className="text-[11px] font-sans font-bold text-slate-400 uppercase tracking-wider block">Phone</label>
                <span className="text-base font-bold text-slate-850 block mt-0.5">{phone}</span>
              </div>

              <div id="field-amount">
                <label className="text-[11px] font-sans font-bold text-slate-400 uppercase tracking-wider block">Amount</label>
                <span className="text-base font-bold text-slate-850 block mt-0.5">{amount}</span>
              </div>

              <div id="field-delivery-address">
                <label className="text-[11px] font-sans font-bold text-slate-400 uppercase tracking-wider block">Delivery Address</label>
                <span className="text-base font-bold text-slate-850 block mt-0.5 leading-relaxed">{deliveryAddress}</span>
              </div>

              <div id="field-shipment-id">
                <label className="text-[11px] font-sans font-bold text-slate-400 uppercase tracking-wider block">Shipment ID</label>
                <span className="text-base font-bold text-slate-850 block mt-0.5">{shipmentId}</span>
              </div>

              <div id="field-courier-partner">
                <label className="text-[11px] font-sans font-bold text-slate-400 uppercase tracking-wider block">Courier Partner</label>
                <span className="text-base font-bold text-slate-850 block mt-0.5">{courierPartner}</span>
              </div>

              <div id="field-expected-delivery">
                <label className="text-[11px] font-sans font-bold text-slate-400 uppercase tracking-wider block">Expected Delivery</label>
                <span className="text-base font-bold text-slate-850 block mt-0.5">{expectedDelivery}</span>
              </div>

              <div id="field-order-date">
                <label className="text-[11px] font-sans font-bold text-slate-400 uppercase tracking-wider block">Order Date</label>
                <span className="text-base font-semibold text-slate-800 block mt-0.5">{orderDate}</span>
              </div>
            </div>
          </div>

          {/* Shipment Timeline Section */}
          <div className="pt-6 border-t border-slate-100" id="details-timeline-section">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-sans font-bold text-sm text-slate-900 uppercase tracking-wider">Shipment Timeline</h4>
              {order.status !== 'pending' && (
                <button
                  id="modal-refresh-status"
                  onClick={() => onRefreshTrack(order.id)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg flex items-center space-x-1.5 transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh Status</span>
                </button>
              )}
            </div>

            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-4" id="details-timeline-container">
              {order.trackingHistory && order.trackingHistory.length > 0 ? (
                <div className="space-y-5 border-l-2 border-slate-200 pl-5 relative font-mono text-xs text-slate-600">
                  {order.trackingHistory.map((event, idx) => (
                    <div key={idx} className="relative space-y-1">
                      <div className="absolute -left-[27px] top-0.5 w-3 h-3 rounded-full bg-slate-900 border-2 border-white" />
                      <span className="text-[10px] text-slate-400 block">{event.date} - {event.location}</span>
                      <span className="font-bold text-slate-900 block">{event.status}</span>
                      <p className="text-slate-500 font-sans text-xs mt-0.5 leading-relaxed">{event.activity}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-slate-400 space-y-1">
                  <Clock className="w-5 h-5 opacity-40 text-slate-500" />
                  <span className="text-xs">No active shipment timeline logged yet.</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-8 py-4 border-t border-slate-100 flex justify-end items-center bg-slate-50/50" id="details-footer">
          {['booked', 'awb_assigned', 'shipped', 'delivered'].includes(order.status) && onShowWhatsApp && (
            <button
              onClick={() => onShowWhatsApp(order)}
              className="mr-auto px-4 py-2 bg-emerald-650 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow"
              id="details-whatsapp-preview-btn"
            >
              <svg className="w-4 h-4 fill-current text-white" viewBox="0 0 24 24">
                <path d="M12.004 2C6.48 2 2 6.48 2 12.004c0 1.765.46 3.42 1.258 4.877L2 22l5.247-1.378a9.92 9.92 0 004.757 1.205c5.523 0 10.003-4.48 10.003-10.004C22.007 6.48 17.527 2 12.004 2zM12 20.158c-1.574 0-3.118-.423-4.47-1.22l-.32-.19-3.324.872.887-3.243-.208-.332a8.114 8.114 0 01-1.246-4.22c0-4.49 3.65-8.15 8.136-8.15 4.486 0 8.14 3.66 8.14 8.153s-3.654 8.147-8.14 8.147zm4.516-6.168c-.247-.125-1.47-.724-1.696-.807-.228-.083-.393-.125-.56.124-.166.248-.64.806-.784.97-.145.166-.29.187-.537.063-.247-.125-1.045-.385-1.99-1.23-.736-.656-1.233-1.468-1.378-1.716-.145-.248-.015-.382.11-.506.11-.11.247-.288.37-.433.125-.145.166-.248.248-.413.082-.165.04-.31-.02-.434-.06-.124-.56-1.347-.768-1.848-.2-.486-.403-.42-.56-.428l-.475-.01a.917.917 0 00-.665.31c-.228.248-.87.848-.87 2.067s.888 2.397.987 2.53c.1.13 1.747 2.664 4.233 3.732.59.254 1.05.405 1.41.52.593.187 1.13.16 1.558.097.477-.07 1.47-.6 1.676-1.18.204-.577.204-1.072.144-1.18-.06-.104-.22-.165-.466-.29z" />
              </svg>
              <span>View Customer WhatsApp Alert</span>
            </button>
          )}
          <button 
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm rounded-xl transition"
            id="details-footer-close"
          >
            Close Details
          </button>
        </div>

      </div>
    </div>
  );
}
