/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  X, Send, CheckCheck, ShieldAlert, ArrowLeft, Phone, Video, MoreVertical, 
  Smile, Paperclip, Camera, Mic, ChevronRight
} from 'lucide-react';
import { Order } from '../types';

interface WhatsAppPreviewModalProps {
  order: Order;
  onClose: () => void;
}

export default function WhatsAppPreviewModal({ order, onClose }: WhatsAppPreviewModalProps) {
  // Extract and format customer first name
  const fullName = order.customerName || order.address?.name || 'Customer';
  const firstName = fullName.split(' ')[0];

  // Helper function to get ordinal suffix for day
  const getOrdinalSuffix = (day: number) => {
    if (day > 3 && day < 21) return 'th';
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  };

  // Format delivery date (current date + 2 days)
  const getSimulatedDeliveryDate = () => {
    // Try to parse existing delivery date or fallback to current + 2 days
    const baseDate = order.deliveryDate ? new Date(order.deliveryDate) : new Date();
    if (!order.deliveryDate) {
      baseDate.setDate(baseDate.getDate() + 2);
    }
    const day = baseDate.getDate();
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    const month = monthNames[baseDate.getMonth()];
    const year = baseDate.getFullYear();
    return `${day}${getOrdinalSuffix(day)} ${month} ${year}`;
  };

  const deliveryDateFormatted = getSimulatedDeliveryDate();

  // Format Order ID to match Shiprocket format
  const formattedOrderId = `DF-ord_${order.id}-${order.shipmentId || '1783921776218'}`;

  // Get products text
  const productsText = order.items && order.items.length > 0 
    ? order.items.map(item => `${item.name} ${item.quantity > 1 ? `x${item.quantity}` : ''}`).join(', ')
    : 'Drone 4K Action Camera Ultra HD';

  // Amount format
  const amountFormatted = typeof order.totalAmount === 'number' 
    ? order.totalAmount.toFixed(2) 
    : parseFloat(order.totalAmount || '0').toFixed(2);

  // Payment mode
  const paymentMode = order.paymentMethod === 'Prepaid' ? 'Prepaid' : 'COD';

  // Message body text matching exactly the user prompt format
  const messageBody = `Hey ${firstName} 👋

Your Dappers Fit order is packed and will be delivered by ${deliveryDateFormatted}.

Order details: 👇

Order ID: ${formattedOrderId}
Product: ${productsText}

Amount: ${amountFormatted}
Payment mode: ${paymentMode}

Please note, Shiprocket never asks for payments via WhatsApp, UPI, or links. If anyone claims otherwise, don’t respond or share details – block and report immediately.`;

  // Get current message time
  const messageTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).toLowerCase();

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center z-50 p-4" id="whatsapp-preview-modal-overlay">
      <div className="bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl w-full max-w-md overflow-hidden flex flex-col h-[85vh] animate-in fade-in zoom-in-95 duration-150" id="whatsapp-preview-modal-card">
        
        {/* Phone / Chat Header */}
        <div className="bg-[#0b141a] px-4 py-3 flex items-center justify-between border-b border-slate-800" id="chat-header">
          <div className="flex items-center space-x-2">
            <button 
              onClick={onClose}
              className="p-1 hover:bg-slate-800 rounded-full text-emerald-500 transition"
              title="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            
            {/* Shiprocket Avatar Profile */}
            <div className="w-10 h-10 rounded-full bg-[#1c2c35] border border-emerald-500/30 flex items-center justify-center font-bold text-white relative">
              <span className="text-emerald-400 font-black text-sm">SR</span>
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-[#0b141a] rounded-full" />
            </div>

            <div>
              <div className="flex items-center space-x-1">
                <span className="font-sans font-bold text-sm text-slate-100">Shiprocket Limited</span>
                <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 flex items-center justify-center p-0.5" title="Verified Business Account">
                  <svg className="w-2.5 h-2.5 text-[#0b141a] fill-current" viewBox="0 0 24 24">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                  </svg>
                </span>
              </div>
              <p className="text-[11px] text-emerald-400 font-sans">Official Business Account</p>
            </div>
          </div>

          <div className="flex items-center space-x-3 text-slate-300">
            <button className="p-1.5 hover:bg-slate-800 rounded-full transition" title="Video Call"><Video className="w-4 h-4" /></button>
            <button className="p-1.5 hover:bg-slate-800 rounded-full transition" title="Voice Call"><Phone className="w-4 h-4" /></button>
            <button className="p-1.5 hover:bg-slate-800 rounded-full transition" title="More Options"><MoreVertical className="w-4 h-4" /></button>
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-[#182229] px-4 py-2 border-b border-slate-800 flex items-center space-x-2 text-xs text-amber-400 font-sans">
          <ShieldAlert className="w-4 h-4 shrink-0 text-amber-500" />
          <span>Simulated WhatsApp notification sent to customer {fullName} ({order.address?.phone || 'N/A'})</span>
        </div>

        {/* Chat Canvas (WhatsApp Background pattern or solid color) */}
        <div className="flex-1 bg-[#0b141a] overflow-y-auto p-4 space-y-4 flex flex-col justify-end relative" 
             style={{ 
               backgroundImage: `radial-gradient(#1c2c35 1px, transparent 1px)`, 
               backgroundSize: '16px 16px',
               opacity: '0.98'
             }}
             id="chat-canvas">
          
          {/* Encryption Notice */}
          <div className="self-center bg-[#182229] border border-amber-500/10 text-[#ffd279] text-[11px] px-3 py-1.5 rounded-lg max-w-[85%] text-center shadow-sm font-sans">
            🔒 Messages and calls are end-to-end encrypted. No one outside of this chat, not even WhatsApp, can read or listen to them. Click to learn more.
          </div>

          {/* Today Divider */}
          <div className="self-center bg-[#121b22] text-[#8696a0] text-xs px-3 py-1 rounded-md shadow-sm uppercase tracking-wide font-medium font-sans">
            Today
          </div>

          {/* WhatsApp Message Bubble (Right aligned or Left? In screenshot, it is received so Left aligned with white/dark-grey background) */}
          <div className="self-start max-w-[90%] bg-[#202c33] border border-[#2c3942]/60 rounded-xl rounded-tl-none p-3 shadow-md relative group animate-in slide-in-from-left-2 duration-150 text-slate-100" id="whatsapp-message-bubble">
            <div className="space-y-3 whitespace-pre-wrap font-sans text-[13px] leading-relaxed text-[#e9edef]">
              
              {/* Message Header */}
              <p>Hey <span className="font-bold">{firstName}</span> 👋</p>

              <p>Your Dappers Fit order is packed and will be delivered by <span className="font-bold text-sky-400">{deliveryDateFormatted}</span>.</p>

              <p>Order details: 👇</p>

              <p>
                <span className="text-slate-400">Order ID:</span> <span className="font-semibold text-emerald-400 break-all">{formattedOrderId}</span><br />
                <span className="text-slate-400">Product:</span> <span className="font-semibold">{productsText}</span>
              </p>

              <p>
                <span className="text-slate-400">Amount:</span> <span className="font-bold font-mono text-amber-400">₹{amountFormatted}</span><br />
                <span className="text-slate-400">Payment mode:</span> <span className="font-semibold">{paymentMode}</span>
              </p>

              <p className="text-slate-350 text-[12px] bg-[#182229] p-2.5 rounded-lg border border-slate-800/40 leading-normal">
                ⚠️ <span className="font-semibold text-[#ffd279]">Please note:</span> Shiprocket never asks for payments via WhatsApp, UPI, or links. If anyone claims otherwise, don’t respond or share details – block and report immediately.
              </p>

            </div>

            {/* Footer metadata alignment identical to screenshot */}
            <div className="flex items-center justify-between mt-3 pt-2 border-t border-[#2c3942]/40 text-[10px] text-slate-400">
              <span className="text-[#a0aab0] italic">Powered by Shiprocket</span>
              <div className="flex items-center space-x-1">
                <span className="text-[#8696a0] font-mono">{messageTime}</span>
                <CheckCheck className="w-3.5 h-3.5 text-sky-400" />
              </div>
            </div>
          </div>

        </div>

        {/* Simulated Input Field Area (Identical to WhatsApp Desktop/Mobile) */}
        <div className="bg-[#1f2c34] px-3 py-2.5 flex items-center space-x-2 border-t border-[#2c3942]" id="chat-footer-input">
          <button className="p-1 hover:bg-slate-800 rounded-full text-[#8696a0] transition" title="Emoji">
            <Smile className="w-5.5 h-5.5" />
          </button>
          <button className="p-1 hover:bg-slate-800 rounded-full text-[#8696a0] transition" title="Attach file">
            <Paperclip className="w-5 h-5" />
          </button>
          
          <div className="flex-1 bg-[#2a3942] rounded-lg px-4 py-1.5 text-xs text-slate-300 font-sans outline-none select-none text-left">
            Message sent automatically via Shiprocket API
          </div>

          <div className="flex items-center space-x-1.5">
            <button className="p-1 hover:bg-slate-800 rounded-full text-[#8696a0] transition" title="Voice Message">
              <Mic className="w-5 h-5" />
            </button>
            <button className="p-1.5 bg-emerald-500 rounded-full text-[#0b141a] hover:bg-emerald-400 transition shadow-md" title="Send" disabled>
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Modal Footer actions */}
        <div className="px-6 py-4 bg-[#0b141a] border-t border-slate-800 flex justify-between items-center text-xs text-slate-400" id="whatsapp-footer">
          <span className="font-semibold text-emerald-400">Status: WhatsApp Notification Dispatched</span>
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 font-semibold text-slate-300 rounded-lg border border-slate-700 transition"
          >
            Close Chat Preview
          </button>
        </div>

      </div>
    </div>
  );
}
