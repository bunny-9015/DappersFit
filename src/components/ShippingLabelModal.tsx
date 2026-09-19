/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect } from 'react';
import { X, Printer, Download, CheckCircle2, RotateCw, ExternalLink, AlertCircle } from 'lucide-react';
import { Order } from '../types';
import { downloadFileFromUrl } from '../utils/downloadHelper';

interface ShippingLabelModalProps {
  order: Order;
  onClose: () => void;
  onDownloadStatusChange?: () => void;
}

export default function ShippingLabelModal({ order, onClose, onDownloadStatusChange }: ShippingLabelModalProps) {
  const printAreaRef = useRef<HTMLDivElement>(null);
  const [isDownloaded, setIsDownloaded] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  // Check downloaded status on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('dappersfit_downloaded_labels');
      const downloadedIds = saved ? JSON.parse(saved) : [];
      if (downloadedIds.includes(order.id)) {
        setIsDownloaded(true);
      }
    } catch (err) {
      console.error('Error reading download status:', err);
    }
  }, [order.id]);

  // Dynamically record a new internal Shiprocket API gateway log entry when label modal is viewed
  useEffect(() => {
    try {
      const saved = localStorage.getItem('shiprocket_gateway_logs');
      const logs = saved ? JSON.parse(saved) : [];
      
      const shipmentIdText = order.shipmentId || '1439633746';
      
      const hasRecentLog = logs.some((l: any) => {
        if (l.type !== 'internal' || !l.details.includes(shipmentIdText)) return false;
        const idStr = l.id.replace('sr-dyn-', '').split('-')[0];
        const timeVal = Number(idStr);
        return !isNaN(timeVal) && (Date.now() - timeVal < 15000);
      });

      if (!hasRecentLog) {
        const options: Intl.DateTimeFormatOptions = {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        };
        const timestamp = new Date().toLocaleString('en-US', options);

        const newLog = {
          id: `sr-dyn-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
          timestamp,
          actor: 'Dappers fit',
          type: 'internal',
          action: 'SR_SECURITY_LOGGING',
          ip: '-',
          target: 'label',
          details: `Shipment IDs: ${shipmentIdText}`
        };

        localStorage.setItem('shiprocket_gateway_logs', JSON.stringify([newLog, ...logs]));
      }
    } catch (err) {
      console.error('Error logging dynamic Shiprocket request:', err);
    }
  }, [order]);

  const customerName = order.customerName || 'BANDARU VENKATESH';
  const addr = (order.address || {}) as any;
  const addressLine1 = addr.address || 'Ramnagar 6th line, Chemakurti';
  const cityStateZip = `${addr.city || ''}, ${addr.state || ''}, India, ${addr.pincode || ''}`;
  const phoneNo = addr.phone || '8019566202';

  const orderIdText = order.orderNumber || `ord_${order.id}`;
  const awbCodeText = order.awbCode || '1904193592071';
  const courierNameText = order.courierName || 'Delhivery Surface';
  
  const orderWeight = typeof order.weight === 'number' && order.weight > 0 ? order.weight : 0.5;
  const length = order.dimensions?.length ? order.dimensions.length : 15;
  const width = order.dimensions?.width ? order.dimensions.width : 15;
  const height = order.dimensions?.height ? order.dimensions.height : 10;
  const weightText = `${orderWeight.toFixed(2)} kg`;

  const paymentText = Number(order.totalAmount) > 0 ? 'COD' : 'PREPAID';
  const amountFormatted = `₹${(Number(order.totalAmount) || 0).toLocaleString()}`;

  // Shipped By (Warehouse Settings)
  const shippedByName = 'Dapper Fit';
  const shippedByAddress = 'shop no 64, 4th floor, The platinum mall, by rubberwala';
  const shippedByCityState = 'Mumbai';
  const shippedByPincode = '400004';
  const shippedByPhone = '8610835435';

  const invoiceNoText = order.invoiceUrl && order.invoiceUrl !== '#' ? order.invoiceUrl : `INV-5899${order.id.slice(-4)}`;
  const invoiceDateText = order.date || '10/07/2026';

  // Dynamic Barcode Stripe SVG generator
  const generateBarcodeSVG = (value: string) => {
    let bars = '';
    let x = 10;
    // Generate a semi-realistic sequence of black strips
    for (let i = 0; i < value.length; i++) {
      const charCode = value.charCodeAt(i);
      const w1 = (charCode % 4) + 1.5;
      const w2 = ((charCode + i) % 3) + 1;
      bars += `<rect x="${x}" y="2" width="${w1}" height="42" fill="black" />`;
      x += w1 + 2;
      bars += `<rect x="${x}" y="2" width="${w2}" height="42" fill="black" />`;
      x += w2 + 2;
    }
    return (
      <svg viewBox={`0 0 ${x + 10} 46`} className="w-full h-11" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="white" />
        <g>{React.createElement('path', { d: `M 0 0`, fill: 'none' })}</g>
        <g dangerouslySetInnerHTML={{ __html: bars }} />
      </svg>
    );
  };

  // HTML content generator for local file download (Standard A6 formatted label)
  const getLabelHTMLContent = () => {
    // Generate barcode SVG strings to inline
    const inlineBarcodeSVG1 = (val: string) => {
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

    const isLocalState = ((order.address && order.address.state) || '').toLowerCase().includes('maharashtra');
    const taxColumnHeader = isLocalState ? 'CGST+SGST' : 'IGST';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Shiprocket Label - ${orderIdText}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background-color: #ffffff;
            color: #000000;
            margin: 0;
            padding: 20px;
            display: flex;
            justify-content: center;
          }
          .label-card {
            width: 450px;
            border: 3px solid #000000;
            box-sizing: border-box;
            background-color: #ffffff;
          }
          .row-flex {
            display: flex;
          }
          .border-bottom-thick {
            border-bottom: 2px solid #000000;
          }
          .border-left-thick {
            border-left: 2px solid #000000;
          }
          .padding-all {
            padding: 10px;
            box-sizing: border-box;
          }
          .ship-to-section {
            width: 60%;
            text-align: left;
          }
          .ship-to-title {
            font-size: 13px;
            font-weight: 800;
            text-transform: uppercase;
            margin-bottom: 4px;
            color: #4b5563;
          }
          .customer-name {
            font-size: 16px;
            font-weight: 900;
            text-transform: uppercase;
            margin-bottom: 5px;
            line-height: 1.2;
            color: #000000;
          }
          .customer-address {
            font-size: 11px;
            font-weight: 600;
            line-height: 1.4;
            color: #111111;
          }
          .customer-phone {
            font-size: 11px;
            font-weight: 800;
            margin-top: 5px;
            color: #000000;
          }
          .logo-section {
            width: 40%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background-color: #ffffff;
          }
          .logo-container {
            display: flex;
            align-items: center;
            gap: 6px;
            margin-bottom: 4px;
          }
          .logo-box {
            width: 24px;
            height: 24px;
            border-radius: 6px;
            background-color: #000000;
            color: #ffffff;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 900;
            font-size: 15px;
          }
          .logo-text {
            font-size: 16px;
            font-weight: 900;
            letter-spacing: -0.5px;
            color: #000000;
          }
          .logo-sub {
            font-size: 8px;
            font-weight: 700;
            color: #666666;
            letter-spacing: 1.5px;
            text-transform: uppercase;
          }
          .stats-section {
            width: 50%;
            text-align: left;
            font-size: 11px;
            font-weight: 600;
            line-height: 1.6;
          }
          .stats-section div {
            margin-bottom: 2px;
          }
          .courier-section {
            width: 50%;
            text-align: center;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          .courier-badge {
            font-size: 14px;
            font-weight: 900;
            text-transform: uppercase;
            background-color: #000000;
            color: #ffffff;
            padding: 2px 4px;
            border-radius: 2px;
            letter-spacing: 0.5px;
          }
          .barcode-wrapper {
            padding: 4px 0;
          }
          .barcode-text {
            font-size: 13px;
            font-weight: 900;
            font-family: monospace;
            letter-spacing: 2px;
            margin-top: -2px;
          }
          .routing-title {
            font-size: 11px;
            font-weight: 800;
            margin-top: 2px;
          }
          .return-section {
            width: 50%;
            text-align: left;
          }
          .return-title {
            font-size: 9px;
            font-weight: 800;
            color: #555555;
            text-transform: uppercase;
            margin-bottom: 3px;
          }
          .return-name {
            font-size: 11px;
            font-weight: 900;
            text-transform: uppercase;
            margin-bottom: 2px;
          }
          .return-address {
            font-size: 10px;
            font-weight: 600;
            line-height: 1.3;
            color: #222222;
          }
          .order-info-section {
            width: 50%;
            text-align: center;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          .order-title {
            text-align: left;
            font-size: 11px;
            font-weight: 700;
          }
          .order-metadata {
            text-align: left;
            font-size: 10px;
            font-weight: 700;
            line-height: 1.4;
          }
          .items-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10px;
            text-align: left;
          }
          .items-table th {
            background-color: #f3f4f6;
            border-bottom: 1px solid #000000;
            padding: 4px 6px;
            border-right: 1px solid #000000;
            font-weight: 800;
          }
          .items-table th:last-child {
            border-right: none;
          }
          .items-table td {
            padding: 6px;
            border-right: 1px solid #000000;
            font-weight: 700;
            border-bottom: 1px solid #cccccc;
          }
          .items-table td:last-child {
            border-right: none;
          }
          .disclaimer {
            padding: 6px 10px;
            font-size: 9px;
            line-height: 1.3;
            font-weight: 600;
            color: #444444;
            text-align: left;
          }
          .footer-section {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 6px 10px;
            font-size: 9px;
            font-weight: 700;
            color: #000000;
          }
          .footer-left {
            text-align: left;
            width: 65%;
          }
          .footer-right {
            text-align: right;
            width: 35%;
            display: flex;
            align-items: center;
            justify-content: flex-end;
            gap: 4px;
          }
        </style>
      </head>
      <body>
        <div class="label-card">
          <!-- Row 1: Ship To and Brand Logo -->
          <div class="row-flex border-bottom-thick" style="min-height: 140px;">
            <div class="ship-to-section padding-all">
              <div class="ship-to-title">Ship To</div>
              <div class="customer-name">${customerName}</div>
              <div class="customer-address">
                ${addressLine1}<br>
                ${cityStateZip}
              </div>
              <div class="customer-phone">Phone No.: ${phoneNo}</div>
            </div>
            <div class="logo-section border-left-thick padding-all">
              <div class="logo-container">
                <div class="logo-box">D</div>
                <span class="logo-text">Dappersfit</span>
              </div>
              <span class="logo-sub">PREMIUM LOGISTICS</span>
            </div>
          </div>

          <!-- Row 2: Stats and Courier Details -->
          <div class="row-flex border-bottom-thick" style="min-height: 120px;">
            <div class="stats-section padding-all">
              <div>Dimensions: <span style="font-weight: 800;">${length.toFixed(2)}*${width.toFixed(2)}*${height.toFixed(2)} (cm)</span></div>
              <div>Payment: <span style="font-weight: 950; text-transform: uppercase;">${paymentText}</span></div>
              <div style="font-size: 12px; margin-top: 3px;">COD Amount: <span style="font-weight: 950; font-size: 13.5px;">${paymentText === 'COD' ? amountFormatted + ' INR' : '0.00 INR'}</span></div>
              <div>Weight: <span style="font-weight: 800;">${weightText}</span></div>
              <div>eWaybill No.: <span style="font-weight: 800;">N/A</span></div>
              <div style="margin-top: 2px;">Cluster Code: <span style="font-weight: 900; font-size: 12px;">${(order.address.city || 'BLR').slice(0, 3).toUpperCase()}</span></div>
            </div>
            <div class="courier-section border-left-thick padding-all">
              <span class="courier-badge">${courierNameText}</span>
              <div class="barcode-wrapper">${inlineBarcodeSVG1(awbCodeText)}</div>
              <div class="barcode-text">${awbCodeText}</div>
              <div class="routing-title">Routing Code: <span style="font-weight: 900;">${(order.address.city || 'BLR').slice(0, 3).toUpperCase()}/${(order.address.city || 'BLR').slice(0, 3).toUpperCase()}</span></div>
            </div>
          </div>

          <!-- Row 3: Return Address and Order Details -->
          <div class="row-flex border-bottom-thick" style="min-height: 120px;">
            <div class="return-section padding-all">
              <div class="return-title">Shipped By (If undelivered, return to)</div>
              <div class="return-name">Kenri</div>
              <div class="return-address">
                ${shippedByAddress}<br>
                ${shippedByCityState} - ${shippedByPincode}
              </div>
              <div style="font-size: 10px; font-weight: 700; margin-top: 4px;">GSTIN: </div>
              <div style="font-size: 10px; font-weight: 700;">Phone No.: ${shippedByPhone}</div>
            </div>
            <div class="order-info-section border-left-thick padding-all">
              <div class="order-title">Order #: <span style="font-weight: 900;">${orderIdText}</span></div>
              <div class="barcode-wrapper">${inlineBarcodeSVG1(orderIdText)}</div>
              <div class="order-metadata">
                <div>Invoice No.: <span style="font-weight: 800;">${invoiceNoText}</span></div>
                <div>Invoice Date: <span style="font-weight: 800;">${invoiceDateText}</span></div>
              </div>
            </div>
          </div>

          <!-- Row 4: Items Table -->
          <div class="border-bottom-thick" style="overflow-x: auto;">
            <table class="items-table">
              <thead>
                <tr>
                  <th style="width: 40%;">Product Name & SKU</th>
                  <th style="text-align: center; width: 10%;">HSN</th>
                  <th style="text-align: center; width: 8%;">Qty</th>
                  <th style="text-align: right; width: 14%;">Unit Price</th>
                  <th style="text-align: right; width: 14%;">Taxable Val</th>
                  <th style="text-align: right; width: 14%;">${taxColumnHeader}</th>
                  <th style="text-align: right; width: 14%;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${order.items.map(item => `
                  <tr>
                    <td>
                      <span style="display: block; line-height: 1.2;">${item.name}</span>
                      <span style="font-size: 8px; font-weight: 500; color: #4b5563; display: block; margin-top: 1px;">SKU: ${item.sku || 'SKU'}</span>
                    </td>
                    <td style="text-align: center;">8525</td>
                    <td style="text-align: center; font-weight: 800;">${item.quantity}</td>
                    <td style="text-align: right;">₹${item.price.toFixed(2)}</td>
                    <td style="text-align: right;">₹${(item.price * item.quantity).toFixed(2)}</td>
                    <td style="text-align: right;">₹0.00</td>
                    <td style="text-align: right; font-weight: 800;">₹${(item.price * item.quantity).toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <!-- Row 5: Jurisdiction Disclaimer -->
          <div class="disclaimer border-bottom-thick">
            All disputes are subject to Maharashtra jurisdiction only. Goods once sold will only be taken back or exchanged as per the store's exchange/return policy.
          </div>

          <!-- Row 6: Footer -->
          <div class="footer-section">
            <div class="footer-left">THIS IS AN AUTO-GENERATED LABEL AND DOES NOT NEED SIGNATURE.</div>
            <div class="footer-right">
              Powered By: <span style="font-weight: 900; letter-spacing: -0.2px;">Shiprocket</span>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  const handleDownloadPDF = async () => {
    setIsDownloading(true);
    try {
      let currentShipmentId = order.shipmentId;
      let reconciledOrder = { ...order };

      if (!currentShipmentId && order.shiprocketOrderId) {
        // Attempt to reconcile missing shipment details
        try {
          const reconcileRes = await fetch('/api/shiprocket/reconcile-shipment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId: order.id, shiprocketOrderId: order.shiprocketOrderId })
          });
          const reconcileData = await reconcileRes.json();
          if (reconcileData.success && reconcileData.shipmentId) {
            currentShipmentId = reconcileData.shipmentId;
            reconciledOrder.shipmentId = reconcileData.shipmentId;
            reconciledOrder.awbCode = reconcileData.awbCode;
            reconciledOrder.courierName = reconcileData.courierName;
          }
        } catch (rErr) {
          console.warn('Reconcile notice:', rErr);
        }
      }

      if (!currentShipmentId) {
        currentShipmentId = order.shiprocketOrderId || order.id;
      }

      setDownloadError(null);
      let downloaded = false;
      try {
        const response = await fetch('/api/shiprocket/label', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ shipmentId: currentShipmentId })
        });
        const data = await response.json();
        if (data.success && data.labelUrl) {
          await downloadFileFromUrl(data.labelUrl, `Label_${reconciledOrder.orderNumber || reconciledOrder.id}.pdf`);
          downloaded = true;
        } else {
          setDownloadError(data.error || 'Shiprocket has not generated the label for this shipment yet. The order is booked, but label is still being processed.');
          return;
        }
      } catch (labelErr: any) {
        console.warn('API label fetch failed:', labelErr);
        setDownloadError(labelErr.message || 'Failed to fetch label from Shiprocket.');
        return;
      }

      if (downloaded) {
        // Update download status
        const saved = localStorage.getItem('dappersfit_downloaded_labels');
        const downloadedIds = saved ? JSON.parse(saved) : [];
        if (!downloadedIds.includes(order.id)) {
          downloadedIds.push(order.id);
          localStorage.setItem('dappersfit_downloaded_labels', JSON.stringify(downloadedIds));
        }
        setIsDownloaded(true);
        if (onDownloadStatusChange) {
          onDownloadStatusChange();
        }
      }
    } catch (err: any) {
      console.error('PDF download error:', err);
      setDownloadError(err.message || 'Failed to download Shiprocket label.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrint = () => {
    const printContent = printAreaRef.current?.innerHTML;
    if (!printContent) return;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (doc) {
      doc.open();
      doc.write(`
        <html>
        <head>
          <title>Shiprocket Shipping Label</title>
          <style>
            @page {
              size: 4in 6in;
              margin: 0;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              background-color: #ffffff;
              color: #000000;
              margin: 0;
              padding: 0;
              display: flex;
              justify-content: center;
              align-items: flex-start;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .print-container {
              width: 100% !important;
              max-width: 450px !important;
              box-sizing: border-box;
              border: none !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            table {
              width: 100%;
              border-collapse: collapse;
            }
            th, td {
              border-collapse: collapse;
            }
            svg {
              max-width: 100%;
              height: auto;
            }
          </style>
        </head>
        <body>
          <div class="print-container">
            ${printContent}
          </div>
          <script>
            window.onload = function() {
              window.focus();
              window.print();
              setTimeout(function() {
                if (window.frameElement && window.frameElement.parentNode) {
                  window.frameElement.parentNode.removeChild(window.frameElement);
                }
              }, 1000);
            };
          </script>
        </body>
        </html>
      `);
      doc.close();
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto" id="shipping-label-overlay">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col my-8 animate-in fade-in zoom-in-95 duration-150" id="shipping-label-wrapper">
        
        {/* Controls Header exactly as in Image 3 */}
        <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between no-print" id="label-controls-header">
          <div className="flex items-center space-x-3">
            <h3 className="font-bold text-lg text-white font-sans">Shipping Label</h3>
            {isDownloaded && (
              <span className="flex items-center text-blue-500 font-semibold gap-1.5 text-xs bg-blue-500/10 px-2.5 py-1 rounded-full border border-blue-500/20 animate-fade-in" id="label-downloaded-badge">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
                <span>Downloaded</span>
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {/* Download Label PDF button */}
            <button
              onClick={handleDownloadPDF}
              disabled={isDownloading}
              className="px-3.5 py-1.5 bg-sky-500 hover:bg-sky-400 disabled:opacity-60 text-slate-950 font-bold text-xs rounded-lg flex items-center space-x-1.5 transition shadow-sm cursor-pointer disabled:cursor-not-allowed"
              id="download-label-modal-btn"
              title="Download Official Shiprocket Shipping Label PDF"
            >
              {isDownloading ? (
                <RotateCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>{isDownloading ? 'Downloading Label...' : 'Download Shiprocket Label (PDF)'}</span>
            </button>

            {/* Print button */}
            <button
              onClick={handlePrint}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
              id="print-label-icon-btn"
              title="Print Shipping Label"
            >
              <Printer className="w-4 h-4" />
            </button>

            {/* Close button */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
              id="close-label-modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Error / Processing Notice if Shiprocket has not generated label */}
        {downloadError && (
          <div className="mx-6 mt-4 p-3.5 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-xl flex items-center justify-between gap-3 animate-in fade-in" id="label-download-error-alert">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span className="leading-relaxed">{downloadError}</span>
            </div>
            <button 
              onClick={() => handleDownloadPDF()}
              className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-xs shrink-0 transition"
            >
              Retry Fetch
            </button>
          </div>
        )}

        {/* Scrollable Printable Container matching 1:1 Image 3 */}
        <div className="p-8 flex-1 flex justify-center bg-slate-950 overflow-y-auto max-h-[70vh]" id="label-print-viewport">
          <div 
            ref={printAreaRef}
            className="w-[450px] bg-white border-3 border-black text-black font-sans print-container select-none leading-tight"
            style={{ color: '#000000', backgroundColor: '#ffffff' }}
            id="shiprocket-label-printout"
          >
            {/* Row 1: Ship To and Brand Logo */}
            <div className="flex border-b-2 border-black" style={{ minHeight: '130px' }}>
              <div className="w-[60%] p-3.5 text-left flex flex-col justify-between">
                <div>
                  <div className="text-[12px] font-extrabold uppercase tracking-wide text-gray-500 mb-1">Ship To</div>
                  <div className="text-[16px] font-black uppercase text-black leading-tight mb-1.5">{customerName}</div>
                  <div className="text-[11px] font-bold text-gray-900 leading-normal">
                    {addressLine1}<br />
                    {cityStateZip}
                  </div>
                </div>
                <div className="text-[11px] font-black text-black mt-2">Phone No.: {phoneNo}</div>
              </div>
              <div className="w-[40%] border-l-2 border-black p-3.5 flex flex-col items-center justify-center bg-white">
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="w-6 h-6 rounded-md bg-black text-white flex items-center justify-center font-black text-sm">D</div>
                  <span className="text-[16px] font-black tracking-tight text-black">Dappersfit</span>
                </div>
                <span className="text-[8px] font-bold text-gray-500 tracking-wider uppercase">PREMIUM LOGISTICS</span>
              </div>
            </div>

            {/* Row 2: Stats and Courier Details */}
            <div className="flex border-b-2 border-black" style={{ minHeight: '120px' }}>
              <div className="w-[50%] p-3.5 text-left text-[11px] font-bold leading-normal flex flex-col justify-between">
                <div className="space-y-1">
                  <div>Dimensions: <span className="font-extrabold">{length.toFixed(2)}*{width.toFixed(2)}*{height.toFixed(2)} (cm)</span></div>
                  <div>Payment: <span className="font-black text-black uppercase">{paymentText}</span></div>
                  <div className="text-[11.5px] mt-1">COD Amount: <span className="font-black text-[13px]">{paymentText === 'COD' ? amountFormatted + ' INR' : '0.00 INR'}</span></div>
                  <div>Weight: <span className="font-extrabold">{weightText}</span></div>
                  <div>eWaybill No.: <span className="font-extrabold">N/A</span></div>
                </div>
                <div className="mt-2 text-[11px] font-black">Cluster Code: <span className="text-[12px] uppercase font-black">{((order.address && order.address.city) || 'BLR').slice(0, 3).toUpperCase()}</span></div>
              </div>
              <div className="w-[50%] border-l-2 border-black p-3.5 text-center flex flex-col justify-between">
                <span className="text-[13px] font-black uppercase bg-black text-white py-1 px-2 rounded-sm tracking-wide block">
                  {courierNameText}
                </span>
                <div className="py-2.5">
                  {generateBarcodeSVG(awbCodeText)}
                </div>
                <div className="text-[13px] font-black font-mono tracking-widest leading-none mt-0.5">
                  {awbCodeText}
                </div>
                <div className="text-[10px] font-bold text-black mt-2">
                  Routing Code: <span className="font-black">{((order.address && order.address.city) || 'BLR').slice(0, 3).toUpperCase()}/${((order.address && order.address.city) || 'BLR').slice(0, 3).toUpperCase()}</span>
                </div>
              </div>
            </div>

            {/* Row 3: Return Address and Order Details */}
            <div className="flex border-b-2 border-black" style={{ minHeight: '120px' }}>
              <div className="w-[50%] p-3.5 text-left flex flex-col justify-between">
                <div>
                  <div className="text-[8.5px] font-black text-gray-500 uppercase tracking-wide mb-1">Shipped By (If undelivered, return to)</div>
                  <div className="text-[11px] font-black text-black uppercase mb-1">Kenri</div>
                  <div className="text-[10px] font-bold text-gray-800 leading-normal">
                    {shippedByAddress}<br />
                    {shippedByCityState} - {shippedByPincode}
                  </div>
                </div>
                <div className="mt-2 space-y-0.5 text-[10px] font-bold">
                  <div>GSTIN: </div>
                  <div>Phone No.: {shippedByPhone}</div>
                </div>
              </div>
              <div className="w-[50%] border-l-2 border-black p-3.5 text-center flex flex-col justify-between">
                <div className="text-left text-[11px] font-bold">
                  Order #: <span className="font-black">{orderIdText}</span>
                </div>
                <div className="py-2.5">
                  {generateBarcodeSVG(orderIdText)}
                </div>
                <div className="text-left text-[10px] font-bold leading-normal">
                  <div>Invoice No.: <span className="font-black">{invoiceNoText}</span></div>
                  <div>Invoice Date: <span className="font-black">{invoiceDateText}</span></div>
                </div>
              </div>
            </div>

            {/* Row 4: Items Table */}
            <div className="border-b-2 border-black overflow-x-auto">
              <table className="w-full border-collapse text-[10px] text-left">
                <thead>
                  <tr className="bg-gray-100 border-b border-black">
                    <th className="p-1.5 border-r border-black font-extrabold text-[9px] uppercase tracking-wider" style={{ width: '40%' }}>Product Name & SKU</th>
                    <th className="p-1.5 border-r border-black font-extrabold text-[9px] uppercase tracking-wider text-center" style={{ width: '10%' }}>HSN</th>
                    <th className="p-1.5 border-r border-black font-extrabold text-[9px] uppercase tracking-wider text-center" style={{ width: '8%' }}>Qty</th>
                    <th className="p-1.5 border-r border-black font-extrabold text-[9px] uppercase tracking-wider text-right" style={{ width: '14%' }}>Unit Price</th>
                    <th className="p-1.5 border-r border-black font-extrabold text-[9px] uppercase tracking-wider text-right" style={{ width: '14%' }}>Taxable Val</th>
                    <th className="p-1.5 border-r border-black font-extrabold text-[9px] uppercase tracking-wider text-right" style={{ width: '14%' }}>{((order.address && order.address.state) || '').toLowerCase().includes('maharashtra') ? 'CGST+SGST' : 'IGST'}</th>
                    <th className="p-1.5 font-extrabold text-[9px] uppercase tracking-wider text-right" style={{ width: '14%' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item, idx) => (
                    <tr key={idx} className="border-b border-gray-200 last:border-b-0">
                      <td className="p-1.5 border-r border-black font-bold">
                        <span className="block leading-tight">{item.name}</span>
                        <span className="text-[8px] font-semibold text-gray-500 block mt-0.5">SKU: {item.sku || 'SKU'}</span>
                      </td>
                      <td className="p-1.5 border-r border-black text-center font-bold">8525</td>
                      <td className="p-1.5 border-r border-black text-center font-extrabold">{item.quantity}</td>
                      <td className="p-1.5 border-r border-black text-right font-bold">₹{item.price.toFixed(2)}</td>
                      <td className="p-1.5 border-r border-black text-right font-bold">₹{(item.price * item.quantity).toFixed(2)}</td>
                      <td className="p-1.5 border-r border-black text-right font-bold">₹0.00</td>
                      <td className="p-1.5 text-right font-extrabold">₹{(item.price * item.quantity).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Row 5: Jurisdiction Disclaimer */}
            <div className="p-2.5 text-[9px] font-bold text-gray-700 leading-normal border-b-2 border-black text-left">
              All disputes are subject to Maharashtra jurisdiction only. Goods once sold will only be taken back or exchanged as per the store's exchange/return policy.
            </div>

            {/* Row 6: Footer */}
            <div className="flex justify-between items-center p-2 text-[9px] font-bold text-black">
              <div className="text-left w-[65%]">THIS IS AN AUTO-GENERATED LABEL AND DOES NOT NEED SIGNATURE.</div>
              <div className="text-right w-[35%] flex items-center justify-end gap-1">
                Powered By: <span className="font-black">Shiprocket</span>
              </div>
            </div>

          </div>
        </div>

        {/* Modal Controls Footer */}
        <div className="px-6 py-4 border-t border-slate-700 flex justify-end space-x-2 bg-slate-900/60 no-print" id="label-modal-footer">
          <button 
            onClick={onClose}
            className="px-4 py-2 hover:bg-slate-800 text-slate-300 font-semibold text-xs rounded-lg transition border border-slate-700 font-sans"
          >
            Close Label
          </button>
        </div>

      </div>
    </div>
  );
}
