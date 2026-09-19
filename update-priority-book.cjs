const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const regex = /\/\/ 2\. Score and sort by Priority Rules[\s\S]*?(?=\/\/ Update local persistent db)/;

const newLogic = `
    // 2. Determine Courier Sequence based on WG Exception
    const items = orderToBook.items || [];
    const isWG = items.some((item) => {
      const name = (item.name || '').toLowerCase();
      const sku = (item.sku || '').toLowerCase();
      const tags = Array.isArray(item.tags) ? item.tags.map(t => String(t).toLowerCase()) : [];
      return tags.includes('wg') || name.includes(' wg ') || name === 'wg' || name.startsWith('wg ') || name.endsWith(' wg') || name.includes('water gun') || sku.includes('wg');
    });

    let conditionSequence = [];
    conditionSequence.push('DAPPERS');
    
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

    // 3. Build sequence of viable couriers from couriersList
    let priorityCourierCandidates = [];
    for (const condition of conditionSequence) {
      const matched = couriersList.filter(c => matchesCourierCondition(c, condition));
      if (matched.length > 0) {
        matched.sort((a, b) => a.rate - b.rate);
        priorityCourierCandidates.push(...matched);
      }
    }

    // Filter duplicates while preserving the order of insertion
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
    let successfulCourierId = null;

    // 4. Book the chosen Courier
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
          console.error('[Shiprocket Priority Booking Failed] Order creation rejected:', createErrMsg);
          orderToBook.status = 'failed';
          orderToBook.errorMessage = createErrMsg;
          await saveSingleOrderToDb(orderToBook);
          return res.status(400).json({
            success: false,
            status: 'failed',
            error: createErrMsg
          });
        }

        // Try Assigning AWB matching the Priority Sequence
        let lastAwbError = '';
        for (const candidate of priorityCourierCandidates) {
          try {
            console.log(\`[Shiprocket Priority Booking] Trying AWB assignment with courier \${candidate.courierName} (\${candidate.courierId})\`);
            const awbPayload = { shipment_id: shipmentId, courier_id: candidate.courierId };
            let awbData = await shiprocket.rawRequest('/courier/assign/awb', 'POST', headers, awbPayload);
            let testAwbCode = awbData?.response?.data?.awb_code || awbData?.data?.awb_code || awbData?.awb_code || awbData?.response?.awb_code || '';
            
            if (testAwbCode) {
              awbCode = testAwbCode;
              assignedCourierName = awbData?.response?.data?.courier_name || candidate.courierName;
              successfulCourierId = candidate.courierId;
              break; // Success! Stop falling back.
            } else {
              lastAwbError = awbData?.response?.data?.awb_assign_error || awbData?.message || awbData?.response?.data?.message || 'Empty AWB code returned.';
              console.log(\`[Shiprocket] Courier \${candidate.courierId} failed AWB: \${lastAwbError}. Moving to next fallback...\`);
            }
          } catch (awbErr) {
            lastAwbError = awbErr.message || String(awbErr);
            console.log(\`[Shiprocket] Courier \${candidate.courierId} failed AWB: \${lastAwbError}. Moving to next fallback...\`);
          }
        }

        if (!awbCode) {
          console.error('[Shiprocket Priority Booking Failed] All fallback sequence couriers failed to assign AWB.');
          try {
             await shiprocket.rawRequest('/orders/cancel', 'POST', headers, { ids: [Number(shiprocketId) || shiprocketId] });
             console.log(\`[Shiprocket] Successfully cancelled priority order \${shiprocketId} due to AWB fallback exhaustion.\`);
          } catch (cancelErr) {
             console.error(\`[Shiprocket] Failed to cancel priority order \${shiprocketId}:\`, cancelErr);
          }
          
          orderToBook.status = 'failed';
          orderToBook.errorMessage = \`AWB Assignment Failed across all prioritized couriers. Last error: \${lastAwbError}\`;
          orderToBook.shiprocketOrderId = undefined;
          orderToBook.shipmentId = undefined;
          await saveSingleOrderToDb(orderToBook);
          return res.status(400).json({
            success: false,
            status: 'failed',
            error: orderToBook.errorMessage
          });
        }

        // Attempt label generation from official Shiprocket API
        try {
          const labelData = await shiprocket.rawRequest('/courier/generate/label', 'POST', headers, { shipment_id: [Number(shipmentId) || shipmentId] });
          const rawLabelUrl = labelData?.label_url || labelData?.response?.label_url || labelData?.url || labelData?.pdf_url || '';
          if (rawLabelUrl) {
            labelUrl = \`/api/shiprocket/download-live-pdf?url=\${encodeURIComponent(rawLabelUrl)}&filename=Label_\${orderToBook.orderNumber || shipmentId}.pdf\`;
            console.log(\`[Shiprocket] Official label generated successfully during priority booking: \${rawLabelUrl}\`);
          } else {
            throw new Error('Label generation API succeeded but returned no PDF URL.');
          }
        } catch (labelErr) {
          console.log(\`[Shiprocket] Priority booking label failed, cancelling order in Shiprocket: \${labelErr.message || labelErr}\`);
          try {
            await shiprocket.rawRequest('/orders/cancel', 'POST', headers, { ids: [Number(shiprocketId) || shiprocketId] });
            console.log(\`[Shiprocket] Successfully cancelled priority order \${shiprocketId} due to label generation failure.\`);
          } catch (cancelErr) {
            console.error(\`[Shiprocket] Failed to cancel priority order \${shiprocketId} after label error:\`, cancelErr);
          }
          throw new Error(\`Label generation failed: \${labelErr.message || labelErr}\`);
        }

      } catch (liveErr) {
        console.error('[Shiprocket Priority Booking] Live flow encountered error:', liveErr.message || liveErr);
        
        orderToBook.status = 'failed';
        orderToBook.errorMessage = \`Live booking failed: \${liveErr.message || liveErr}\`;
        await saveSingleOrderToDb(orderToBook);
        return res.status(500).json({
          success: false,
          status: 'failed',
          error: orderToBook.errorMessage
        });
      }
    } else {
      // Simulation flow
      console.log(\`[Shiprocket Simulation] 1. Creating ad-hoc order for \${orderToBook.orderNumber}...\`);
      await new Promise(r => setTimeout(r, 400));
      shiprocketId = \`sim_order_\${Date.now()}\`;
      shipmentId = \`sim_ship_\${Date.now()}\`;

      assignedCourierName = priorityCourierCandidates[0].courierName;

      console.log(\`[Shiprocket Simulation] 2. Assigning AWB via Priority Courier: \${assignedCourierName}...\`);
      await new Promise(r => setTimeout(r, 450));
      awbCode = \`AWB\${Math.floor(Math.random() * 1000000000)}\`;

      console.log(\`[Shiprocket Simulation] 3. Generating shipping label...\`);
      await new Promise(r => setTimeout(r, 450));
      labelUrl = \`/api/shiprocket/download-label-pdf?shipmentId=\${encodeURIComponent(shipmentId)}\`;
    }

    `;

if (regex.test(code)) {
  code = code.replace(regex, newLogic);
  fs.writeFileSync('server.ts', code);
  console.log('Successfully replaced priority booking logic.');
} else {
  console.log('Regex match failed.');
}
