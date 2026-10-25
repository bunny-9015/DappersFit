/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Wand2, Check, AlertCircle, Loader2, Sparkles, User, ShoppingBag, ArrowRight as Import, Phone, MapPin } from 'lucide-react';
import { Order } from '../types';
import { validateOrderFields, OrderValidationErrors } from '../utils/orderValidation';

interface OrderParserProps {
  onImportOrder: (order: Partial<Order>) => void;
  existingOrders?: Order[];
}

const DEFAULT_SAMPLE = `Hello Dappers Fit, I want to confirm order for:
Customer: Rahul Verma
Item: Drone 4K Action Camera
Price: 1499
Payment: COD
Mobile: 9876543210
Delivery address: Flat 402, Sunshine Heights, MG Road, Chemakurti, Andhra Pradesh
Pin: 523272`;

export default function OrderParser({ onImportOrder, existingOrders }: OrderParserProps) {
  const [rawText, setRawText] = useState('');
  const [loading, setLoading] = useState(false);
  const [parsedData, setParsedData] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<OrderValidationErrors>({});
  const [imported, setImported] = useState(false);
  const [duplicateWarningOrder, setDuplicateWarningOrder] = useState<Order | null>(null);

  async function handleParse() {
    if (!rawText.trim()) return;

    setLoading(true);
    setError(null);
    setValidationErrors({});

    try {
      const res = await fetch('/api/gemini/parse-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: rawText })
      });

      const result = await res.json();
      
      if (result.error) {
        throw new Error(result.error);
      }

      const extracted = result.parsedOrder || {};
      const nameVal = (extracted.customerName || extracted.address?.name || '').trim();
      const lower = nameVal.toLowerCase();
      if (lower === 'n/a' || lower === 'unknown' || lower === 'walkin customer' || lower === 'walk-in customer') {
        extracted.customerName = '';
        if (extracted.address) extracted.address.name = '';
      }

      // Ensure address structure exists
      if (!extracted.address) {
        extracted.address = {
          name: extracted.customerName || '',
          phone: '',
          address: '',
          city: '',
          state: '',
          pincode: ''
        };
      }

      setParsedData(extracted);
      
      // Run initial field validation
      const validation = validateOrderFields(extracted);
      setValidationErrors(validation.errors);
    } catch (err: any) {
      setError(err.message || 'Error occurred while contacting Gemini AI.');
    } finally {
      setLoading(false);
    }
  }

  function handleFieldChange(field: string, val: string) {
    if (!parsedData) return;

    setParsedData((prev: any) => {
      const updated = { ...prev };
      if (field === 'customerName') {
        updated.customerName = val;
        updated.address = { ...(updated.address || {}), name: val };
      } else {
        updated.address = { ...(updated.address || {}), [field]: val };
      }
      
      // Live revalidation
      const validation = validateOrderFields(updated);
      setValidationErrors(validation.errors);
      return updated;
    });
  }

  function handleImport(force: boolean = false) {
    if (!parsedData) return;

    const validation = validateOrderFields(parsedData);
    setValidationErrors(validation.errors);

    if (!validation.isValid) {
      setError('Please correct the highlighted mandatory fields before ingesting the order.');
      return;
    }

    if (!force && existingOrders && existingOrders.length > 0) {
      const normStr = (s: any) => (s || '').toString().toLowerCase().trim().replace(/[^a-z0-9]/g, '');
      const normDigits = (p: any) => (p || '').toString().replace(/\D/g, '');
      const last10 = (p: any) => {
        const d = normDigits(p);
        return d.length >= 10 ? d.slice(-10) : d;
      };

      const inCustomer = normStr(parsedData.customerName || parsedData.address?.name);
      const inPhone = last10(parsedData.address?.phone);
      const inAddress = normStr(parsedData.address?.address);
      const inPincode = normDigits(parsedData.address?.pincode);
      const inFirstItem = Array.isArray(parsedData.items) && parsedData.items.length > 0 ? parsedData.items[0] : null;
      const inProduct = normStr(inFirstItem?.name || inFirstItem?.sku);
      const inQuantity = Number(inFirstItem?.quantity || 1);

      const hasAllFields = inCustomer && inPhone.length >= 10 && inAddress.length >= 5 && inPincode.length === 6 && inProduct;

      if (hasAllFields) {
        const dup = existingOrders.find((o) => {
          if (o.status === 'cancelled') return false;
          const oCustomer = normStr(o.customerName || o.address?.name);
          const oPhone = last10(o.address?.phone);
          const oAddress = normStr(o.address?.address);
          const oPincode = normDigits(o.address?.pincode);
          const oFirstItem = Array.isArray(o.items) && o.items.length > 0 ? o.items[0] : null;
          const oProduct = normStr(oFirstItem?.name || oFirstItem?.sku);
          const oQuantity = Number(oFirstItem?.quantity || 1);

          return oCustomer === inCustomer &&
                 oPhone === inPhone &&
                 oAddress === inAddress &&
                 oPincode === inPincode &&
                 oProduct === inProduct &&
                 oQuantity === inQuantity;
        });

        if (dup) {
          setDuplicateWarningOrder(dup);
          return;
        }
      }
    }

    // Call callback to add order to state
    onImportOrder({
      ...parsedData,
      customerName: (parsedData.customerName || parsedData.address?.name || '').trim(),
      address: {
        ...(parsedData.address || {}),
        name: (parsedData.customerName || parsedData.address?.name || '').trim(),
        phone: (parsedData.address?.phone || '').trim(),
        address: (parsedData.address?.address || '').trim(),
        pincode: (parsedData.address?.pincode || '').trim(),
        city: (parsedData.address?.city || '').trim(),
        state: (parsedData.address?.state || '').trim()
      }
    });

    setDuplicateWarningOrder(null);
    setImported(true);
    // Reset parser states
    setTimeout(() => {
      setParsedData(null);
      setRawText('');
      setImported(false);
      setValidationErrors({});
    }, 2000);
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8 font-sans text-slate-100" id="parser-root">
      {/* Header */}
      <div>
        <h1 className="font-extrabold text-2xl sm:text-3xl tracking-tight text-white flex items-center gap-2">
          <Wand2 className="w-7 h-7 sm:w-8 sm:h-8 text-[#b8862f] animate-pulse" />
          <span>AI WhatsApp Order Parser</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Paste raw messages, emails, or chat logs. Dappersfit AI extracts structured items & addresses with mandatory field validation before booking.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8" id="parser-grid">
        {/* Left Hand: Raw Input Terminal */}
        <div className="bg-slate-800 p-5 sm:p-6 rounded-2xl border border-slate-700 shadow-xl space-y-4 flex flex-col justify-between" id="parser-input-panel">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono tracking-wider uppercase text-slate-400 font-semibold">Raw Message Input</label>
              <button 
                onClick={() => setRawText(DEFAULT_SAMPLE)}
                className="text-xs text-[#d4af37] hover:text-[#b8862f] font-semibold flex items-center space-x-1"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Load Sample Message</span>
              </button>
            </div>
            
            <textarea
              id="raw-order-textarea"
              rows={12}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Paste raw unstructured order details from WhatsApp, DM, or SMS here..."
              className="w-full p-4 border border-slate-700 rounded-xl focus:border-[#b8862f] focus:ring-1 focus:ring-[#b8862f] font-mono text-sm bg-slate-900/60 text-slate-100 resize-none outline-none transition"
            />
          </div>

          <div className="pt-4 flex items-center justify-between border-t border-slate-700 flex-wrap gap-2">
            {error && (
              <span className="text-xs text-red-400 font-mono flex items-center space-x-1">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </span>
            )}
            {!error && <span className="text-xs text-slate-400 font-mono">Gemini Structured Parser</span>}

            <button
              id="parse-submit-button"
              onClick={handleParse}
              disabled={loading}
              className="px-5 py-2.5 bg-[#b8862f] hover:bg-[#a67527] disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold text-sm rounded-xl flex items-center space-x-2 transition shadow-md"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Analyzing message...</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4 text-white" />
                  <span>Parse with Gemini AI</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Hand: AI Structured Extraction Output */}
        <div className="bg-slate-800 text-slate-100 p-5 sm:p-6 rounded-2xl border border-slate-700 shadow-xl flex flex-col justify-between" id="parser-output-panel">
          {!parsedData ? (
            <div className="flex-1 flex flex-col items-center justify-center py-20 text-slate-500 space-y-3" id="output-placeholder">
              <Sparkles className="w-10 h-10 text-slate-600 animate-pulse" />
              <div className="text-center max-w-xs">
                <span className="font-bold text-slate-400 text-sm block">Awaiting Parsing Trigger</span>
                <p className="text-xs text-slate-500 mt-1">Paste a message on the left and trigger the AI model to parse customer details instantly.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6 flex-1 flex flex-col justify-between" id="output-content">
              
              {/* Output Header */}
              <div className="flex items-center justify-between border-b border-slate-700 pb-3">
                <div className="flex items-center space-x-2">
                  <span className="bg-emerald-500/10 text-emerald-400 p-1.5 rounded-lg border border-emerald-500/20">
                    <Check className="w-4 h-4" />
                  </span>
                  <div>
                    <span className="text-xs font-mono tracking-wider uppercase text-slate-400 font-semibold block">Extraction Ready</span>
                    <span className="text-sm font-bold text-white">Review mandatory order details before booking</span>
                  </div>
                </div>
              </div>

              {/* Extraction Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 overflow-y-auto max-h-[380px] pr-1">
                {/* Shipping Details */}
                <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-700 space-y-3" id="extracted-shipping">
                  <div className="flex items-center space-x-1.5 border-b border-slate-800 pb-1.5 text-xs font-semibold text-[#d4af37]">
                    <User className="w-4 h-4" />
                    <span>Customer & Delivery Details</span>
                  </div>
                  
                  <div className="space-y-3 text-xs">
                    {/* Customer Name */}
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Customer Name *</span>
                        {validationErrors.customerName && (
                          <span className="text-[10px] text-red-400 font-bold" id="parser-name-error">
                            Name is required
                          </span>
                        )}
                      </div>
                      <input
                        type="text"
                        value={parsedData.customerName || parsedData.address?.name || ''}
                        onChange={(e) => handleFieldChange('customerName', e.target.value)}
                        placeholder="Enter Customer Name"
                        className={`w-full mt-1 p-2 bg-slate-950 border rounded-lg outline-none font-bold text-xs text-white transition ${
                          validationErrors.customerName
                            ? 'border-red-500 ring-1 ring-red-500/50'
                            : 'border-slate-700 focus:border-[#b8862f]'
                        }`}
                      />
                      {validationErrors.customerName && (
                        <p className="text-[10px] text-red-400 font-semibold mt-0.5">
                          ⚠️ {validationErrors.customerName}
                        </p>
                      )}
                    </div>

                    {/* Mobile Number */}
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Mobile Number *</span>
                        {validationErrors.phone && (
                          <span className="text-[10px] text-red-400 font-bold" id="parser-phone-error">
                            Mobile number is required
                          </span>
                        )}
                      </div>
                      <input
                        type="text"
                        value={parsedData.address?.phone || ''}
                        onChange={(e) => handleFieldChange('phone', e.target.value)}
                        placeholder="e.g., 9876543210"
                        className={`w-full mt-1 p-2 bg-slate-950 border rounded-lg outline-none font-mono text-xs text-white transition ${
                          validationErrors.phone
                            ? 'border-red-500 ring-1 ring-red-500/50'
                            : 'border-slate-700 focus:border-[#b8862f]'
                        }`}
                      />
                      {validationErrors.phone && (
                        <p className="text-[10px] text-red-400 font-semibold mt-0.5">
                          ⚠️ {validationErrors.phone}
                        </p>
                      )}
                    </div>

                    {/* Delivery Address */}
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Delivery Address *</span>
                        {validationErrors.address && (
                          <span className="text-[10px] text-red-400 font-bold" id="parser-address-error">
                            Address is required
                          </span>
                        )}
                      </div>
                      <textarea
                        rows={2}
                        value={parsedData.address?.address || ''}
                        onChange={(e) => handleFieldChange('address', e.target.value)}
                        placeholder="House/flat, street, locality"
                        className={`w-full mt-1 p-2 bg-slate-950 border rounded-lg outline-none text-xs text-white transition resize-none ${
                          validationErrors.address
                            ? 'border-red-500 ring-1 ring-red-500/50'
                            : 'border-slate-700 focus:border-[#b8862f]'
                        }`}
                      />
                      {validationErrors.address && (
                        <p className="text-[10px] text-red-400 font-semibold mt-0.5">
                          ⚠️ {validationErrors.address}
                        </p>
                      )}
                    </div>

                    {/* PIN Code, City, State */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">PIN Code *</span>
                        </div>
                        <input
                          type="text"
                          value={parsedData.address?.pincode || ''}
                          onChange={(e) => handleFieldChange('pincode', e.target.value)}
                          placeholder="e.g. 523272"
                          className={`w-full mt-1 p-2 bg-slate-950 border rounded-lg outline-none font-mono text-xs text-white transition ${
                            validationErrors.pincode
                              ? 'border-red-500 ring-1 ring-red-500/50'
                              : 'border-slate-700 focus:border-[#b8862f]'
                          }`}
                        />
                        {validationErrors.pincode && (
                          <p className="text-[10px] text-red-400 font-semibold mt-0.5">
                            ⚠️ {validationErrors.pincode}
                          </p>
                        )}
                      </div>

                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">City</span>
                        <input
                          type="text"
                          value={parsedData.address?.city || ''}
                          onChange={(e) => handleFieldChange('city', e.target.value)}
                          placeholder="City"
                          className="w-full mt-1 p-2 bg-slate-950 border border-slate-700 rounded-lg outline-none text-xs text-white focus:border-[#b8862f]"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Extracted Items */}
                <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-700 space-y-3" id="extracted-items">
                  <div className="flex items-center space-x-1.5 border-b border-slate-800 pb-1.5 text-xs font-semibold text-[#d4af37]">
                    <ShoppingBag className="w-4 h-4" />
                    <span>Catalog Items & Payment</span>
                  </div>
                  <div className="space-y-3 text-xs" id="extracted-items-list">
                    {parsedData.items?.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-start border-b border-slate-800/40 pb-2 last:border-0 last:pb-0">
                        <div className="font-mono">
                          <span className="text-white block font-bold font-sans">{item.name}</span>
                          <span className="text-slate-400 text-[10px]">SKU: {item.sku}</span>
                        </div>
                        <div className="text-right font-mono">
                          <span className="text-white block font-bold">{item.quantity}x</span>
                          <span className="text-slate-400 text-[10px]">₹{item.price}</span>
                        </div>
                      </div>
                    ))}
                    <div className="border-t border-slate-800 pt-2 flex justify-between items-center font-mono" id="extracted-totals">
                      <span className="text-slate-400 text-[10px] uppercase font-sans">Payment Method</span>
                      <span className="text-white font-bold">{parsedData.paymentMethod || 'COD'}</span>
                    </div>
                    <div className="flex justify-between items-center font-mono">
                      <span className="text-slate-400 text-[10px] uppercase font-sans">Total Est. Value</span>
                      <span className="text-amber-400 font-black text-sm">₹{parsedData.totalAmount || parsedData.items?.reduce((s: number, i: any) => s + (i.price * i.quantity), 0) || 1499}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Confirm / Import Action */}
              <div className="pt-4 border-t border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs text-slate-400 font-mono">
                  {Object.keys(validationErrors).length > 0 ? (
                    <span className="text-red-400 font-semibold flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>{Object.keys(validationErrors).length} required field(s) missing or invalid</span>
                    </span>
                  ) : (
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      <span>All required fields valid</span>
                    </span>
                  )}
                </div>

                <button
                  id="import-order-button"
                  onClick={handleImport}
                  disabled={imported}
                  className={`w-full sm:w-auto px-5 py-2.5 font-bold text-sm rounded-xl flex items-center justify-center space-x-2 transition shadow-lg ${
                    imported 
                      ? 'bg-emerald-500 text-white' 
                      : Object.keys(validationErrors).length > 0
                        ? 'bg-amber-600 hover:bg-amber-500 text-white'
                        : 'bg-[#b8862f] hover:bg-[#a67527] text-white shadow-md'
                  }`}
                >
                  {imported ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Order Ingested!</span>
                    </>
                  ) : (
                    <>
                      <Import className="w-4 h-4" />
                      <span>Ingest into Dappersfit Pipeline</span>
                    </>
                  )}
                </button>
              </div>

            </div>
          )}
        </div>
      </div>

      {duplicateWarningOrder && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" id="duplicate-warning-modal">
          <div className="bg-slate-900 border border-amber-500/50 rounded-2xl p-6 max-w-md w-full shadow-2xl text-left space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2.5 text-amber-400">
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
              <h3 className="text-base font-bold text-white">Duplicate Order Detected</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              An incoming order contains the exact same customer name, phone number, full delivery address, PIN code, product, and quantity as an existing order in the pipeline:
            </p>
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs font-mono space-y-1.5">
              <div><span className="text-slate-500">Matching Order:</span> <span className="text-amber-400 font-bold">{duplicateWarningOrder.orderNumber || duplicateWarningOrder.id}</span></div>
              <div><span className="text-slate-500">Customer:</span> <span className="text-white">{duplicateWarningOrder.customerName}</span></div>
              <div><span className="text-slate-500">Phone:</span> <span className="text-white">{duplicateWarningOrder.address?.phone}</span></div>
              <div><span className="text-slate-500">Delivery Address:</span> <span className="text-slate-300">{duplicateWarningOrder.address?.address}, {duplicateWarningOrder.address?.pincode}</span></div>
              <div><span className="text-slate-500">Product:</span> <span className="text-white">{duplicateWarningOrder.items?.[0]?.name} (Qty: {duplicateWarningOrder.items?.[0]?.quantity})</span></div>
              <div><span className="text-slate-500">Status:</span> <span className="text-emerald-400 uppercase font-bold">{duplicateWarningOrder.status}</span></div>
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDuplicateWarningOrder(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition"
              >
                Cancel Review
              </button>
              <button
                type="button"
                onClick={() => handleImport(true)}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl transition shadow-lg"
              >
                Proceed & Ingest Anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
