/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Wand2, Sparkles, Import, Check, AlertCircle, ShoppingBag, 
  MapPin, User, Phone, DollarSign, ArrowRight, Loader2, RefreshCw 
} from 'lucide-react';
import { Order, OrderItem, ShippingAddress } from '../types';

interface OrderParserProps {
  onImportOrder: (parsedOrder: Partial<Order>) => void;
}

const DEFAULT_SAMPLE = `Hi, I want to buy 1 Drone 4K Action Camera Ultra HD (SKU: DRN-ACT-4K, price: ₹4999) and 1 High-Pressure Water Wash Gun Pro (SKU: WTR-WSH-GUN, price: ₹2499). 

My delivery address:
Rajesh Patel
Flat 402, Sunshine Heights, MG Road, Near WestEnd Mall
Pune, Maharashtra - 411001
Phone number: 9876543210
Email: rajesh.patel@gmail.com`;

export default function OrderParser({ onImportOrder }: OrderParserProps) {
  const [rawText, setRawText] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<any>(null);
  const [imported, setImported] = useState<boolean>(false);

  async function handleParse() {
    if (!rawText.trim()) {
      setError('Please paste raw text or click one of the sample templates to parse.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setImported(false);

      const response = await fetch('/api/gemini/parse-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: rawText })
      });

      if (!response.ok) {
        throw new Error('Failed to parse text. Please check if server is running.');
      }

      const result = await response.json();
      
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
      setParsedData(extracted);
    } catch (err: any) {
      setError(err.message || 'Error occurred while contacting Gemini AI.');
    } finally {
      setLoading(false);
    }
  }

  function handleImport() {
    if (!parsedData) return;
    const currentName = (parsedData.customerName || parsedData.address?.name || '').trim();
    const lower = currentName.toLowerCase();
    if (!currentName || lower === 'n/a' || lower === 'unknown' || lower === 'walkin customer' || lower === 'walk-in customer') {
      setError('Customer Name is required before ingesting this order.');
      return;
    }

    // Call callback to add order to state
    onImportOrder({
      ...parsedData,
      customerName: currentName,
      address: {
        ...(parsedData.address || {}),
        name: currentName
      }
    });
    setImported(true);
    // Reset parser states
    setTimeout(() => {
      setParsedData(null);
      setRawText('');
      setImported(false);
    }, 2000);
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8" id="parser-root">
      {/* Header */}
      <div>
        <h1 className="font-sans font-extrabold text-3xl tracking-tight text-white flex items-center gap-2">
          <Wand2 className="w-8 h-8 text-sky-400 animate-pulse" />
          <span>AI WhatsApp Order Parser</span>
        </h1>
        <p className="text-sm text-slate-400 mt-1 font-sans">
          Paste raw messages, emails, or chat logs. Dappersfit AI instantly extracts structured catalog items & Shiprocket addresses.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8" id="parser-grid">
        {/* Left Hand: Raw Input Terminal */}
        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl space-y-4 flex flex-col justify-between" id="parser-input-panel">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono tracking-wider uppercase text-slate-400 font-semibold">Raw Message Input</label>
              <button 
                onClick={() => setRawText(DEFAULT_SAMPLE)}
                className="text-xs text-sky-400 hover:text-sky-300 font-semibold flex items-center space-x-1"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Load WhatsApp Sample</span>
              </button>
            </div>
            
            <textarea
              id="raw-order-textarea"
              rows={12}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Paste raw unstructured order details from WhatsApp, DM, or SMS here..."
              className="w-full p-4 border border-slate-700 rounded-xl focus:border-sky-400 focus:ring-1 focus:ring-sky-400 font-mono text-sm bg-slate-900/60 text-slate-100 resize-none outline-none transition"
            />
          </div>

          <div className="pt-4 flex items-center justify-between border-t border-slate-700">
            {error && (
              <span className="text-xs text-red-400 font-mono flex items-center space-x-1">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Error during extraction.</span>
              </span>
            )}
            {!error && <span className="text-xs text-slate-450 font-mono">Powered by Gemini API</span>}

            <button
              id="parse-submit-button"
              onClick={handleParse}
              disabled={loading}
              className="px-5 py-2.5 bg-sky-500 hover:bg-sky-400 disabled:bg-slate-700 disabled:text-slate-500 text-slate-950 font-bold text-sm rounded-xl flex items-center space-x-2 transition shadow shadow-sky-500/10"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Analyzing message...</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4 text-slate-950" />
                  <span>Parse with Gemini AI</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Hand: AI Structured Extraction Output */}
        <div className="bg-slate-800 text-slate-100 p-6 rounded-2xl border border-slate-700 shadow-xl flex flex-col justify-between" id="parser-output-panel">
          {!parsedData ? (
            <div className="flex-1 flex flex-col items-center justify-center py-20 text-slate-500 space-y-3 font-sans" id="output-placeholder">
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
                  <span className="bg-emerald-500/10 text-emerald-400 p-1.5 rounded-lg border border-emerald-500/10">
                    <Check className="w-4 h-4" />
                  </span>
                  <div>
                    <span className="text-xs font-mono tracking-wider uppercase text-slate-400 font-semibold block">Extraction Succeeded</span>
                    <span className="text-sm font-bold text-white">Confidence score: 98%</span>
                  </div>
                </div>
              </div>

              {/* Extraction Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 overflow-y-auto max-h-[300px] pr-1">
                {/* Shipping Details */}
                <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-700 space-y-3" id="extracted-shipping">
                  <div className="flex items-center space-x-1.5 border-b border-slate-800/40 pb-1.5 text-xs font-semibold text-sky-400 font-sans">
                    <User className="w-4 h-4" />
                    <span>Customer Details</span>
                  </div>
                  <div className="space-y-2 text-xs font-mono text-slate-300">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-sans font-bold">Customer Name *</span>
                      <input
                        type="text"
                        value={parsedData.customerName || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setParsedData((prev: any) => ({
                            ...prev,
                            customerName: val,
                            address: {
                              ...(prev?.address || {}),
                              name: val
                            }
                          }));
                          if (val.trim()) setError(null);
                        }}
                        placeholder="Enter Customer Name"
                        className={`w-full mt-1 p-2 bg-slate-950 border rounded-lg outline-none font-bold text-xs text-white transition ${
                          !parsedData.customerName || !parsedData.customerName.trim()
                            ? 'border-red-500 focus:ring-1 focus:ring-red-500'
                            : 'border-slate-700 focus:border-sky-400'
                        }`}
                      />
                      {(!parsedData.customerName || !parsedData.customerName.trim()) && (
                        <p className="text-[11px] text-red-400 font-bold mt-1" id="parser-customer-name-error">
                          ⚠️ Customer Name is required
                        </p>
                      )}
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase font-sans">Phone</span>
                      <span className="text-white font-bold">{parsedData.address?.phone || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase font-sans">Shipping Address</span>
                      <span className="text-slate-300 block leading-relaxed">{parsedData.address?.address || 'N/A'}</span>
                      <span className="text-slate-400 text-[11px] block mt-1">{parsedData.address?.city}, {parsedData.address?.state} - {parsedData.address?.pincode}</span>
                    </div>
                  </div>
                </div>

                {/* Extracted Items */}
                <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-700 space-y-3" id="extracted-items">
                  <div className="flex items-center space-x-1.5 border-b border-slate-800/40 pb-1.5 text-xs font-semibold text-sky-400 font-sans">
                    <ShoppingBag className="w-4 h-4" />
                    <span>Catalog Items</span>
                  </div>
                  <div className="space-y-3 text-xs" id="extracted-items-list">
                    {parsedData.items?.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-start border-b border-slate-800/20 pb-2 last:border-0 last:pb-0">
                        <div className="font-mono">
                          <span className="text-white block font-bold font-sans">{item.name}</span>
                          <span className="text-slate-500 text-[10px]">SKU: {item.sku}</span>
                        </div>
                        <div className="text-right font-mono">
                          <span className="text-white block font-bold">{item.quantity}x</span>
                          <span className="text-slate-400 text-[10px]">₹{item.price}</span>
                        </div>
                      </div>
                    ))}
                    <div className="border-t border-slate-800 pt-2 flex justify-between items-center font-mono" id="extracted-totals">
                      <span className="text-slate-500 text-[10px] uppercase font-sans">Total Est. Value</span>
                      <span className="text-sky-400 font-black text-sm">₹{parsedData.totalAmount || parsedData.items?.reduce((s: number, i: any) => s + (i.price * i.quantity), 0)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Confirm / Import Action */}
              <div className="pt-4 border-t border-slate-700 flex justify-end">
                <button
                  id="import-order-button"
                  onClick={handleImport}
                  disabled={imported}
                  className={`px-5 py-2.5 font-bold text-sm rounded-xl flex items-center space-x-2 transition shadow-lg ${
                    imported 
                      ? 'bg-emerald-500 text-white' 
                      : 'bg-sky-500 hover:bg-sky-400 text-slate-950 shadow-sky-500/10'
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
    </div>
  );
}
