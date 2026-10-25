/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface OrderValidationErrors {
  customerName?: string;
  name?: string;
  phone?: string;
  address?: string;
  pincode?: string;
}

export interface OrderValidationResult {
  isValid: boolean;
  errors: OrderValidationErrors;
}

/**
 * Validates mandatory order fields before order booking or Shiprocket submission.
 * Required fields: Customer Name, Mobile Number, Delivery Address, PIN Code.
 */
export function validateOrderFields(order: {
  customerName?: string;
  address?: {
    name?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
}): OrderValidationResult {
  const errors: OrderValidationErrors = {};

  // 1. Customer Name Validation
  const rawName = (order.customerName || order.address?.name || '').trim();
  const lowerName = rawName.toLowerCase();
  const placeholderNames = [
    'unknown',
    'n/a',
    'na',
    'walkin customer',
    'walk-in customer',
    'none',
    'null',
    'undefined',
    'no name'
  ];

  if (!rawName) {
    errors.customerName = 'Customer Name is required.';
    errors.name = errors.customerName;
  } else if (placeholderNames.includes(lowerName)) {
    errors.customerName = 'Valid customer name is required (placeholders like "Unknown" or "Walk-in Customer" are not allowed).';
    errors.name = errors.customerName;
  }

  // 2. Mobile Number Validation
  const rawPhone = (order.address?.phone || '').trim();
  if (!rawPhone) {
    errors.phone = 'Mobile number is required.';
  } else {
    // Strip non-digits
    const cleanDigits = rawPhone.replace(/\D/g, '');
    if (cleanDigits.length < 10) {
      errors.phone = 'Mobile number must contain at least 10 digits.';
    } else if (cleanDigits.length > 15) {
      errors.phone = 'Mobile number cannot exceed 15 digits.';
    }
  }

  // 3. Delivery Address Validation
  const rawAddress = (order.address?.address || '').trim();
  if (!rawAddress) {
    errors.address = 'Delivery address is required.';
  } else if (rawAddress.length < 5) {
    errors.address = 'Delivery address is too short (minimum 5 characters).';
  }

  // 4. PIN Code Validation
  const rawPincode = (order.address?.pincode || '').trim();
  if (!rawPincode) {
    errors.pincode = 'PIN code is required.';
  } else {
    const cleanPin = rawPincode.replace(/\s+/g, '');
    // Standard Indian pincode is 6 numeric digits
    if (/^\d{6}$/.test(cleanPin)) {
      // Valid Indian 6-digit PIN code
    } else if (/^[a-zA-Z0-9\s-]{3,10}$/.test(cleanPin) && cleanPin.length >= 4) {
      // Valid international postal format
    } else {
      errors.pincode = 'Valid 6-digit PIN code is required.';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}
