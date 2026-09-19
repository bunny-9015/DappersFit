/**
 * Exact Shipping Label Template matching Shiprocket thermal format
 * Dimensions: 4x6 inch (thermal) or standard sheet
 */

export function generateCode128Svg(text: string, height: number = 48, barWidth: number = 2): string {
  const clean = (text || '0000000000').replace(/[^ -~]/g, '');
  const PATTERNS = [
    '212222','222122','222221','121223','121322','131222','122213','122312','132212','221213',
    '221312','231212','112232','122132','122231','113222','123122','123221','223211','221132',
    '221231','213212','223112','312131','311222','321122','321221','312212','322112','322211',
    '212123','212321','232121','111323','131123','131321','112313','132113','132311','211313',
    '231113','231311','112133','112331','132131','113123','113321','133121','313121','211331',
    '231131','213113','213311','213131','311123','311321','331121','312113','312311','332111',
    '314111','221411','431111','111224','111422','121124','121421','141122','141221','112214',
    '112412','122114','122411','142112','142211','241211','221114','413111','241112','134111',
    '111242','121142','121241','114212','124112','124211','411212','421112','421211','212141',
    '214121','412121','111143','111341','131141','114113','114311','411113','411311','113141',
    '114131','311141','411131','211412','211214','211232','2331112'
  ];

  const codes = [104]; // START B
  let sum = 104;
  for (let i = 0; i < clean.length; i++) {
    const code = clean.charCodeAt(i) - 32;
    codes.push(code);
    sum += code * (i + 1);
  }
  codes.push(sum % 103);
  codes.push(106); // STOP

  const patternStr = codes.map(c => PATTERNS[c] || PATTERNS[0]).join('');
  let totalWidth = 0;
  for (const char of patternStr) totalWidth += parseInt(char, 10) * barWidth;

  let x = 0;
  const rects: string[] = [];
  let isBar = true;
  for (const char of patternStr) {
    const w = parseInt(char, 10) * barWidth;
    if (isBar) {
      rects.push(`<rect x="${x}" y="0" width="${w}" height="${height}" fill="#000" />`);
    }
    x += w;
    isBar = !isBar;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${x} ${height}" width="${Math.min(x, 260)}" height="${height}" style="display:block;margin:0 auto;">${rects.join('')}</svg>`;
}

export function renderShippingLabelHtml(order: any): string {
  const customerName = (order.customerName || 'Customer').toUpperCase();
  const address = order.address || {};
  const addrLine1 = address.address || 'Kandhepalli Village, D No .3-90, Chodavaram';
  const city = address.city || 'Visakhapatnam';
  const state = address.state || 'Andhra Pradesh';
  const pincode = address.pincode || '531036';
  const phone = address.phone || '7075091008';

  const orderNum = order.orderNumber ? (order.orderNumber.startsWith('DF-') ? order.orderNumber : `DF-${order.orderNumber}`) : `DF-DF-200230-${Date.now()}`;
  const awb = order.awbCode || '1904079626745';
  const courier = order.courierName || 'Delhivery Surface 2 Kgs';
  const weight = order.weight ? Number(order.weight).toFixed(2) : '2.00';
  const length = order.dimensions?.length ? Number(order.dimensions.length).toFixed(2) : '22.00';
  const width = order.dimensions?.width ? Number(order.dimensions.width).toFixed(2) : '15.00';
  const height = order.dimensions?.height ? Number(order.dimensions.height).toFixed(2) : '6.00';
  const dims = `${length}*${width}*${height}(cm)`;
  const payment = (order.paymentMethod || 'COD').toUpperCase();
  const totalAmountNum = Number(order.totalAmount || 1699);
  const totalAmount = totalAmountNum.toFixed(2);
  const codAmount = payment === 'COD' ? `${totalAmount} INR` : '0.00 INR';
  const invoiceNo = `Retail${Math.floor(20000 + Math.random() * 9000)}`;
  const invoiceDate = order.date || new Date().toISOString().slice(0, 10);
  const routingCode = order.routingCode || 'VIS/DUV';

  const items = (order.items && order.items.length > 0) ? order.items : [
    { name: 'wg', sku: 'wg', quantity: 1, price: totalAmountNum }
  ];

  const awbBarcodeSvg = generateCode128Svg(awb, 46, 2);
  const orderBarcodeSvg = generateCode128Svg(orderNum, 40, 1.8);

  const itemRows = items.map((item: any) => {
    const itemName = item.name || 'Product';
    const itemSku = item.sku || item.name || 'SKU-01';
    const qty = item.quantity || 1;
    const price = Number(item.price || (totalAmountNum / qty)).toFixed(2);
    const taxable = (Number(price) * qty).toFixed(2);
    const igst = '0.00';
    const total = taxable;

    return `
      <tr>
        <td style="padding:6px;border:1.5px solid #000;font-size:12px;line-height:1.3;">
          <div style="font-weight:600;">${itemName}</div>
          <div style="font-size:11px;color:#222;">SKU: ${itemSku}</div>
        </td>
        <td style="padding:6px;border:1.5px solid #000;text-align:center;font-size:12px;"></td>
        <td style="padding:6px;border:1.5px solid #000;text-align:center;font-weight:600;font-size:12px;">${qty}</td>
        <td style="padding:6px;border:1.5px solid #000;text-align:right;font-size:12px;">${price}</td>
        <td style="padding:6px;border:1.5px solid #000;text-align:right;font-size:12px;">${taxable}</td>
        <td style="padding:6px;border:1.5px solid #000;text-align:right;font-size:12px;">${igst}</td>
        <td style="padding:6px;border:1.5px solid #000;text-align:right;font-weight:600;font-size:12px;">${total}</td>
      </tr>
    `;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Shipping Label - ${orderNum}</title>
  <style>
    @page {
      size: 100mm 150mm;
      margin: 0;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: Arial, Helvetica, sans-serif;
    }
    body {
      background: #f4f4f6;
      padding: 16px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .print-actions {
      margin-bottom: 12px;
      display: flex;
      gap: 10px;
    }
    .print-btn {
      background: #c5a059;
      color: #fff;
      border: none;
      padding: 8px 18px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: bold;
      cursor: pointer;
    }
    .label-container {
      width: 420px;
      background: #fff;
      border: 3px solid #000;
      color: #000;
      overflow: hidden;
      font-size: 12px;
      line-height: 1.35;
    }
    .section {
      border-bottom: 2.5px solid #000;
    }
    .grid-2 {
      display: grid;
      grid-template-columns: 1.15fr 1fr;
    }
    .col-left {
      padding: 10px;
      border-right: 2.5px solid #000;
    }
    .col-right {
      padding: 10px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
    }
    .logo-container {
      background: #000;
      padding: 12px 16px;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th {
      border: 1.5px solid #000;
      padding: 6px 4px;
      font-size: 11px;
      background: #fff;
      text-align: center;
    }
    @media print {
      body {
        background: transparent;
        padding: 0;
      }
      .print-actions {
        display: none !important;
      }
      .label-container {
        width: 100%;
        border: 2px solid #000;
      }
    }
  </style>
</head>
<body>
  <div class="print-actions">
    <button class="print-btn" onclick="window.print()">🖨️ Print Label (Thermal)</button>
    <button class="print-btn" style="background:#111;" onclick="window.close()">Close</button>
  </div>

  <div class="label-container">
    <!-- ROW 1: SHIP TO & LOGO -->
    <div class="section grid-2">
      <div class="col-left" style="font-style: italic;">
        <div style="font-weight: bold; font-style: normal; font-size: 14px; margin-bottom: 4px;">Ship To</div>
        <div style="font-weight: bold; font-size: 13px; text-transform: uppercase;">${customerName}</div>
        <div style="font-size: 12px; margin-top: 2px;">${customerName.split(' ')[0] || ''}</div>
        <div style="margin-top: 2px;">${addrLine1}</div>
        <div>${city}, ${state}, India</div>
        <div style="font-weight: bold; font-style: normal; font-size: 13px; margin: 3px 0;">${pincode}</div>
        <div style="font-weight: 500;">Phone No.: ${phone}</div>
      </div>
      <div class="col-right" style="padding: 0; background: #000;">
        <!-- DAPPERS FIT BRAND LOGO -->
        <svg viewBox="0 0 160 160" width="120" height="120" style="display:block;margin:auto;">
          <circle cx="80" cy="80" r="72" fill="#0b0f19" stroke="#1e293b" stroke-width="4"/>
          <!-- Circular Red/Cyan stylized emblem -->
          <circle cx="80" cy="72" r="42" fill="none" stroke="#ef4444" stroke-width="6"/>
          <circle cx="80" cy="72" r="32" fill="none" stroke="#06b6d4" stroke-width="5"/>
          <!-- Dumbbell/weight bar -->
          <rect x="62" y="68" width="36" height="8" rx="4" fill="#ffffff"/>
          <rect x="54" y="60" width="8" height="24" rx="3" fill="#ef4444"/>
          <rect x="98" y="60" width="8" height="24" rx="3" fill="#06b6d4"/>
          <!-- Brand text -->
          <text x="80" y="125" text-anchor="middle" font-family="Arial Black, Impact, sans-serif" font-size="13" font-weight="900" fill="#ffffff" letter-spacing="1">DAPPERS FIT</text>
        </svg>
      </div>
    </div>

    <!-- ROW 2: DIMENSIONS, PAYMENT, COURIER & AWB BARCODE -->
    <div class="section grid-2">
      <div class="col-left" style="font-size: 11.5px;">
        <div style="margin-bottom: 3px;"><span style="color:#222;">Dimensions:</span> &nbsp;&nbsp;&nbsp;&nbsp;<strong>${dims}</strong></div>
        <div style="margin-bottom: 3px;"><span style="color:#222;">Payment:</span> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<strong>${payment}</strong></div>
        <div style="margin-bottom: 3px; font-size: 13px;"><strong>COD Amount: &nbsp;${codAmount}</strong></div>
        <div style="margin-bottom: 3px;"><span style="color:#222;">Weight:</span> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<strong>${weight} kg</strong></div>
        <div><span style="color:#222;">eWaybill No.:</span> &nbsp;&nbsp;&nbsp;&nbsp;N/A</div>
      </div>
      <div class="col-right">
        <div style="font-weight: bold; font-size: 14px; margin-bottom: 6px;">${courier}</div>
        ${awbBarcodeSvg}
        <div style="font-size: 12px; font-weight: 600; letter-spacing: 0.5px; margin-top: 3px;">${awb}</div>
        <div style="font-size: 11px; margin-top: 4px;">Routing Code: <strong>${routingCode}</strong></div>
      </div>
    </div>

    <!-- ROW 3: SHIPPED BY, ORDER #, INVOICE & ORDER BARCODE -->
    <div class="section grid-2">
      <div class="col-left" style="font-size: 11px; font-style: italic;">
        <div style="font-weight: bold; font-style: normal; font-size: 12px; margin-bottom: 2px;">Shipped By<span style="font-size:10.5px;font-weight:normal;">(If undelivered, return to)</span></div>
        <div style="font-weight: bold; font-size: 12px;">Dappers Fit</div>
        <div>No-7 athipattan street, opp to omanthur hospital Chintadripet</div>
        <div>Chennai</div>
        <div style="font-weight: bold; font-style: normal;">600002</div>
        <div>GSTIN: </div>
        <div>Phone No.: <strong>9982760943</strong></div>
      </div>
      <div class="col-right">
        <div style="font-size: 11px; font-weight: 600; margin-bottom: 4px; word-break: break-all;">Order #: ${orderNum}</div>
        ${orderBarcodeSvg}
        <div style="font-size: 11px; margin-top: 4px;">Invoice No.: <strong>${invoiceNo}</strong></div>
        <div style="font-size: 11px;">Invoice Date: <strong>${invoiceDate}</strong></div>
      </div>
    </div>

    <!-- ROW 4: PRODUCT TABLE -->
    <div class="section" style="padding: 0;">
      <table>
        <thead>
          <tr>
            <th style="width: 34%;">Product Name & SKU</th>
            <th style="width: 10%;">HSN</th>
            <th style="width: 8%;">Qty</th>
            <th style="width: 12%;">Unit Price</th>
            <th style="width: 13%;">Taxable Value</th>
            <th style="width: 10%;">IGST</th>
            <th style="width: 13%;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemRows}
        </tbody>
      </table>
    </div>

    <!-- ROW 5: JURISDICTION DISCLAIMER -->
    <div class="section" style="padding: 6px 10px; font-size: 10px; line-height: 1.35;">
      All disputes are subject to Tamil Nadu jurisdiction only. Goods once sold will only be taken back or exchanged as per the store's exchange/return policy.
    </div>

    <!-- ROW 6: FOOTER & POWERED BY SHIPROCKET -->
    <div style="padding: 8px 10px; display: flex; justify-content: space-between; align-items: center;">
      <div style="font-size: 9px; font-weight: bold; letter-spacing: 0.2px; text-transform: uppercase;">
        THIS IS AN AUTO-GENERATED LABEL AND DOES NOT NEED SIGNATURE.
      </div>
      <div style="display: flex; align-items: center; gap: 4px;">
        <span style="font-size: 9px; color: #555;">Powered By:</span>
        <!-- Shiprocket icon + branding -->
        <svg viewBox="0 0 100 24" width="80" height="20" style="vertical-align: middle;">
          <!-- Stylized triangle rocket -->
          <path d="M6 3 L16 12 L6 21 L10 12 Z" fill="#6d28d9"/>
          <path d="M12 7 L18 12 L12 17 Z" fill="#8b5cf6"/>
          <text x="24" y="16" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="#111827">Shiprocket</text>
        </svg>
      </div>
    </div>
  </div>
</body>
</html>`;
}
