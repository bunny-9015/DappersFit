const fs = require('fs');

let code = fs.readFileSync('server.ts', 'utf8');

// Find the start of the function
const startPattern = "app.post('/api/shiprocket/order/priority-book'";
const startIndex = code.indexOf(startPattern);

if (startIndex === -1) {
  console.log("Could not find start");
  process.exit(1);
}

// Find the end of the function. It ends right before:
// // API Route: Generate Label
const endPattern = "// API Route: Generate Label";
const endIndex = code.indexOf(endPattern, startIndex);

if (endIndex === -1) {
  console.log("Could not find end");
  process.exit(1);
}

const functionBody = `app.post('/api/shiprocket/order/priority-book', async (req, res) => {
  clearShiprocketCache();
  const { orderId, assignedEmployeeId } = req.body;
  const orderToBook = mockOrders.find(o => String(o.id) === String(orderId) || String(o.orderNumber) === String(orderId));

  if (!orderToBook) {
    return res.status(404).json({ success: false, error: 'Order not found.' });
  }

  const nameTrimmed = (orderToBook.customerName || '').trim();
  if (!nameTrimmed || nameTrimmed.toLowerCase() === 'walkin customer' || nameTrimmed.toLowerCase() === 'walk-in customer') {
    return res.status(400).json({
      success: false,
      error: "There is no customer name. Please provide a valid customer name before booking this order."
    });
  }

  try {
    let couriersList = [];

    // 1. Check Serviceability
    if (isLiveConfigured()) {
      try {
        const headers = await getShiprocketAuthHeaders();
        const isPrepaid = orderToBook.paymentMethod && orderToBook.paymentMethod.toUpperCase() === 'PREPAID';
        const codQuery = isPrepaid ? '0' : '1';
        const endpoint = \`/courier/serviceability?pickup_postcode=411037&delivery_postcode=\${orderToBook.address.pincode}&weight=\${orderToBook.weight || 0.5}&cod=\${codQuery}\`;
        const data = await shiprocket.rawRequest(endpoint, 'GET', headers);
        const rawCouriers = data?.data?.available_courier_companies || [];
        couriersList = rawCouriers.map((c) => ({
          courierId: c.courier_company_id,
          courierName: c.courier_name,
          rate: parseFloat(c.rate || '90.00'),
          eta: c.etd || '3-4 Days',
          rating: parseFloat(c.rating || '4.2'),
          cod: !!c.cod,
          minWeight: parseFloat(c.min_weight || '0.5')
        }));
      } catch (err) {
        console.log('Priority booking live serviceability query failed:', err.message || err);
      }
    }

    if (couriersList.length === 0) {
      couriersList = [
        { courierId: 201, courierName: 'BlueDart Air Premium', rate: 145.00, eta: '1 Day', rating: 4.9, cod: true, minWeight: 0.5 },
        { courierId: 202, courierName: 'BlueDart Surface 2KG', rate: 85.00, eta: '3 Days', rating: 4.5, cod: true, minWeight: 0.5 },
        { courierId: 203, courierName: 'Delhivery Express (Air)', rate: 110.00, eta: '1-2 Days', rating: 4.7, cod: true, minWeight: 0.5 },
        { courierId: 204, courierName: 'Delhivery Surface', rate: 65.00, eta: '4 Days', rating: 4.3, cod: true, minWeight: 0.5 },
        { courierId: 205, courierName: 'DTDC Air Express', rate: 95.00, eta: '2 Days', rating: 4.4, cod: true, minWeight: 0.5 },
        { courierId: 206, courierName: 'DTDC Surface Standard', rate: 58.00, eta: '5 Days', rating: 4.0, cod: true, minWeight: 0.5 },
        { courierId: 207, courierName: 'Shadowfax Local Standard', rate: 48.00, eta: '3 Days', rating: 4.2, cod: true, minWeight: 0.5 },
        { courierId: 208, courierName: 'India Post Speed Post', rate: 40.00, eta: '7 Days', rating: 3.9, cod: true, minWeight: 0.5 },
        { courierId: 209, courierName: 'Dappers', rate: 45.00, eta: '2 Days', rating: 4.8, cod: true, minWeight: 0.5 }
      ];
    }

    // 2. Determine Sequence based on WG
    const items = orderToBook.items || [];
    const isWG = items.some((item) => {
      const name = (item.name || '').toLowerCase();
      const sku = (item.sku || '').toLowerCase();
      const tags = Array.isArray(item.tags) ? item.tags.map(t => String(t).toLowerCase()) : [];
      return tags.includes('wg') || name.includes(' wg ') || name === 'wg' || name.startsWith('wg ') || name.endsWith(' wg') || name.includes('water gun') || sku.includes('wg');
    });

    let conditionSequence = [];
    conditionSequence.push('DAPPERS'); // Default fallback step 1
    
    if (isWG) {
      conditionSequence.push('DELIVERY_SURFACE_2KG');
      conditionSequence.push('INDIA_POST');
    } else {
      conditionSequence.push('BLUEDART_AIR');
      conditionSequence.push('BLUEDART_SURFACE');
      conditionSequence.push('DELIVERY_AIR');
      conditionSequence.push('DELIVERY_SURFACE');
      conditionSequence.push('INDIA_POST');
    }

    const matchesCourierCondition = (c, condition) => {
      const name = (c.courierName || '').toLowerCase();
      switch (condition) {
        case 'DAPPERS':
          return name.includes('dappers');
        case 'BLUEDART_AIR':
          return name.includes('blue') && name.includes('dart') && (name.includes('air') || name.includes('express') || name.includes('premium'));
        case 'BLUEDART_SURFACE':
          return name.includes('blue') && name.includes('dart') && (name.includes('surface') || name.includes('ground') || name.includes('2kg') || name.includes('standard'));
        case 'DELIVERY_AIR':
          return (name.includes('delhivery') || name.includes('delievry') || name.includes('delivery')) && (name.includes('air') || name.includes('express') || name.includes('premium'));
        case 'DELIVERY_SURFACE':
          return (name.includes('delhivery') || name.includes('delievry') || name.includes('delivery')) && (name.includes('surface') || name.includes('ground') || (!name.includes('air') && !name.includes('express') && !name.includes('premium')));
        case 'DELIVERY_SURFACE_2KG':
          return (name.includes('delhivery') || name.includes('delievry') || name.includes('delivery')) && (name.includes('surface') || name.includes('2kg') || name.includes('ground'));
        case 'INDIA_POST':
          return name.includes('india post') || name.includes('speed post') || name.includes('business post');
        default:
          return false;
      }
    };

    let priorityCourierCandidates = [];
    for (const condition of conditionSequence) {
      const matched = couriersList.filter(c => matchesCourierCondition(c, condition));
      if (matched.length > 0) {
        matched.sort((a, b) => a.rate - b.rate);
        priorityCourierCandidates.push(...matched);
      }
    }

    priorityCourierCandidates = priorityCourierCandidates.filter((c, index, self) => 
      index === self.findIndex((t) => t.courierId === c.courierId)
    );

    if (priorityCourierCandidates.length === 0) {
      return res.status(400).json({
        success: false,
        error: \`No serviceable courier partners could be found for Pincode \${orderToBook.address.pincode} matching the priority sequence.\`
      });
    }

    let shiprocketId = '';
    let shipmentId = '';
    let awbCode = '';
    let labelUrl = '';
    let assignedCourierName = priorityCourierCandidates[0].courierName;
    let labelGenerated = false;

    if (isLiveConfigured()) {
      try {
        const headers = await getShiprocketAuthHeaders();
        let pickupLocation = 'Pune Primary Warehouse';
        try {
          const pickupData = await shiprocket.rawRequest('/settings/company/pickup', 'GET', headers);
          if (pickupData && pickupData.data && pickupData.data.shipping_address && pickupData.data.shipping_address.length > 0) {
            pickupLocation = pickupData.data.shipping_address[0].pickup_location;
          }
        } catch {}

        const isPrepaid = orderToBook.paymentMethod && orderToBook.paymentMethod.toUpperCase() === 'PREPAID';
        const orderPayload = {
          order_id: \`DF-\${orderToBook.orderNumber}-\${Date.now()}\`,
          order_date: orderToBook.date,
          pickup_location: pickupLocation,
          billing_customer_name: orderToBook.customerName.length >= 3 ? orderToBook.customerName : \`\${orderToBook.customerName} Customer\`,
          billing_last_name: orderToBook.customerName.split(' ').slice(1).join(' ') || '',
          billing_address: orderToBook.address.address.length >= 10 ? orderToBook.address.address : \`\${orderToBook.address.address} Main Road\`,
          billing_city: orderToBook.address.city,
          billing_pincode: orderToBook.address.pincode,
          billing_state: orderToBook.address.state,
          billing_country: 'India',
          billing_email: orderToBook.address.email || 'customer@dappersfit.com',
          billing_phone: cleanPhoneNumber(orderToBook.address.phone),
          shipping_is_billing: true,
          order_items: (orderToBook.items && orderToBook.items.length > 0)
            ? orderToBook.items.map(i => ({
                name: i.name || 'Electronic Gadget',
                sku: i.sku || 'SKU-ELEC',
                units: i.quantity || 1,
                selling_price: i.price || (orderToBook.totalAmount / (i.quantity || 1)) || 999
              }))
            : [{
                name: 'Electronic Gadget',
                sku: 'SKU-ELEC-01',
                units: 1,
                selling_price: orderToBook.totalAmount || 1499
              }],
          payment_method: isPrepaid ? 'Prepaid' : 'COD',
          sub_total: orderToBook.totalAmount,
          length: Math.max(0.5, Number(orderToBook.dimensions?.length) || 15),
          breadth: Math.max(0.5, Number(orderToBook.dimensions?.width) || 15),
          height: Math.max(0.5, Number(orderToBook.dimensions?.height) || 10),
          weight: Math.max(0.01, Number(orderToBook.weight) || 0.5)
        };

        const createData = await shiprocket.rawRequest('/orders/create/adhoc', 'POST', headers, orderPayload);
        shiprocketId = createData?.order_id || createData?.data?.order_id || createData?.response?.data?.order_id;
        shipmentId = createData?.shipment_id || createData?.data?.shipment_id || createData?.response?.data?.shipment_id || createData?.shipmentId || createData?.data?.shipmentId;

        if (!shipmentId || !shiprocketId) {
          const createErrMsg = createData?.message || createData?.response?.data?.message || createData?.error || (createData?.errors ? JSON.stringify(createData.errors) : 'Shiprocket order creation failed.');
          orderToBook.status = 'failed';
          orderToBook.errorMessage = createErrMsg;
          await saveSingleOrderToDb(orderToBook);
          return res.status(400).json({ success: false, status: 'failed', error: createErrMsg });
        }

        let lastAwbError = '';
        for (const candidate of priorityCourierCandidates) {
          try {
            const awbPayload = { shipment_id: shipmentId, courier_id: candidate.courierId };
            let awbData = await shiprocket.rawRequest('/courier/assign/awb', 'POST', headers, awbPayload);
            let testAwbCode = awbData?.response?.data?.awb_code || awbData?.data?.awb_code || awbData?.awb_code || awbData?.response?.awb_code || '';
            
            if (testAwbCode) {
              awbCode = testAwbCode;
              assignedCourierName = awbData?.response?.data?.courier_name || candidate.courierName;
              break;
            } else {
              lastAwbError = awbData?.response?.data?.awb_assign_error || awbData?.message || awbData?.response?.data?.message || 'Empty AWB code returned.';
            }
          } catch (awbErr) {
            lastAwbError = awbErr.message || String(awbErr);
          }
        }

        if (!awbCode) {
          try {
             await shiprocket.rawRequest('/orders/cancel', 'POST', headers, { ids: [Number(shiprocketId) || shiprocketId] });
          } catch (cancelErr) { }
          
          orderToBook.status = 'failed';
          orderToBook.errorMessage = \`AWB Assignment Failed across all prioritized couriers. Last error: \${lastAwbError}\`;
          orderToBook.shiprocketOrderId = undefined;
          orderToBook.shipmentId = undefined;
          await saveSingleOrderToDb(orderToBook);
          return res.status(400).json({ success: false, status: 'failed', error: orderToBook.errorMessage });
        }

        try {
          const labelData = await shiprocket.rawRequest('/courier/generate/label', 'POST', headers, { shipment_id: [Number(shipmentId) || shipmentId] });
          const rawLabelUrl = labelData?.label_url || labelData?.response?.label_url || labelData?.url || labelData?.pdf_url || '';
          if (rawLabelUrl) {
            labelUrl = \`/api/shiprocket/download-live-pdf?url=\${encodeURIComponent(rawLabelUrl)}&filename=Label_\${orderToBook.orderNumber || shipmentId}.pdf\`;
            labelGenerated = true;
          }
        } catch (labelErr) {
          try {
            await shiprocket.rawRequest('/orders/cancel', 'POST', headers, { ids: [Number(shiprocketId) || shiprocketId] });
          } catch (cancelErr) { }
          throw new Error(\`Label generation failed: \${labelErr.message || labelErr}\`);
        }

      } catch (liveErr) {
        orderToBook.status = 'failed';
        orderToBook.errorMessage = \`Live booking failed: \${liveErr.message || liveErr}\`;
        await saveSingleOrderToDb(orderToBook);
        return res.status(500).json({ success: false, status: 'failed', error: orderToBook.errorMessage });
      }
    } else {
      // Simulation flow
      await new Promise(r => setTimeout(r, 400));
      shiprocketId = \`sim_order_\${Date.now()}\`;
      shipmentId = \`sim_ship_\${Date.now()}\`;
      assignedCourierName = priorityCourierCandidates[0].courierName;

      await new Promise(r => setTimeout(r, 450));
      awbCode = \`AWB\${Math.floor(Math.random() * 1000000000)}\`;

      await new Promise(r => setTimeout(r, 450));
      labelUrl = \`/api/shiprocket/download-label-pdf?shipmentId=\${encodeURIComponent(shipmentId)}\`;
      labelGenerated = true;
    }

    orderToBook.status = 'booked';
    orderToBook.errorMessage = null;
    orderToBook.shiprocketOrderId = String(shiprocketId);
    orderToBook.shipmentId = String(shipmentId);
    orderToBook.awbCode = String(awbCode);
    orderToBook.courierName = assignedCourierName;
    orderToBook.assignedEmployeeId = assignedEmployeeId || orderToBook.assignedEmployeeId;
    orderToBook.labelUrl = labelGenerated ? labelUrl : undefined;
    orderToBook.trackingHistory = [
      { 
        date: new Date().toISOString().replace('T', ' ').slice(0, 16), 
        status: 'Booked', 
        location: 'Pune Warehouse (MH)', 
        activity: \`Shipment booked via priority match: \${assignedCourierName}. Shiprocket ID: \${shiprocketId}.\${labelGenerated ? ' Shipping label generated.' : ' Label pending.'}\` 
      }
    ];

    await saveSingleOrderToDb(orderToBook);

    return res.json({
      success: true,
      status: 'booked',
      order: orderToBook,
      shiprocketOrderId: String(shiprocketId),
      shipmentId: String(shipmentId),
      awbCode: String(awbCode),
      courierName: assignedCourierName,
      labelUrl: orderToBook.labelUrl,
      labelGenerated
    });
  } catch (err) {
    const liveErrMsg = err.message || 'Priority booking failed on Shiprocket.';
    orderToBook.status = 'failed';
    orderToBook.errorMessage = liveErrMsg;
    await saveSingleOrderToDb(orderToBook);
    return res.status(400).json({ success: false, status: 'failed', error: liveErrMsg });
  }
});
\n`;

const newCode = code.slice(0, startIndex) + functionBody + code.slice(endIndex);
fs.writeFileSync('server.ts', newCode);
console.log('Successfully fixed priority booking endpoint.');

