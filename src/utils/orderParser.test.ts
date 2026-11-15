import test from 'node:test';
import assert from 'node:assert/strict';
import { parseOrderLocally, sanitizeParsedOrder, cleanAddressText } from './orderParser';

test('does not include "name:" or customer name in address when labeled multi-line input is parsed', () => {
  const raw = `name: lokesh
phone: 9876543210
address: H.No 12-34, Main Road, Near Hotel Grand
city: Hyderabad
state: Telangana
pincode: 500001`;

  const parsed = parseOrderLocally(raw);
  assert.equal(parsed.customerName, 'lokesh');
  assert.equal(parsed.address.phone, '9876543210');
  assert.equal(parsed.address.pincode, '500001');
  assert.equal(parsed.address.city, 'Hyderabad');
  assert.equal(parsed.address.state, 'Telangana');
  assert.equal(parsed.address.address, 'H.No 12-34, Main Road, Near Hotel Grand');
  assert.equal(parsed.address.address.toLowerCase().includes('name:'), false);
});

test('does not corrupt words containing "to", "pin", "tel", or "ship" in address', () => {
  const raw = `Customer Name: Ravi Kumar
Address: Plot 45, Sector 5, Opposite to Patel Shopping Township
Mobile: +91 98480 12345
Pincode: 500081`;

  const parsed = parseOrderLocally(raw);
  assert.equal(parsed.customerName, 'Ravi Kumar');
  assert.equal(parsed.address.phone, '9848012345');
  assert.equal(parsed.address.pincode, '500081');
  assert.equal(parsed.address.address, 'Plot 45, Sector 5, Opposite to Patel Shopping Township');
});

test('handles single-line comma-separated input with "name: lokesh"', () => {
  const raw = `name: lokesh, 45 Gandhi Street, T Nagar, Chennai 600017, 9876543210`;
  const parsed = parseOrderLocally(raw);
  assert.equal(parsed.customerName, 'lokesh');
  assert.equal(parsed.address.phone, '9876543210');
  assert.equal(parsed.address.pincode, '600017');
  assert.equal(parsed.address.city, 'Chennai');
  assert.equal(parsed.address.address, '45 Gandhi Street, T Nagar');
});

test('sanitizeParsedOrder strips leaked labels from LLM response', () => {
  const dirty = {
    customerName: 'name: lokesh',
    address: {
      name: 'name: lokesh',
      phone: '+91 98765 43210',
      address: 'name: lokesh, address: Flat 201, Green Park, Hyderabad, 500033',
      city: 'city: Hyderabad',
      state: 'Telangana',
      pincode: 'pincode: 500033',
      email: '',
    },
    items: [],
    totalAmount: 999,
  };

  const clean = sanitizeParsedOrder(dirty);
  assert.equal(clean.customerName, 'lokesh');
  assert.equal(clean.address.name, 'lokesh');
  assert.equal(clean.address.phone, '9876543210');
  assert.equal(clean.address.pincode, '500033');
  assert.equal(clean.address.city, 'Hyderabad');
  assert.equal(clean.address.address, 'Flat 201, Green Park');
});

test('cleanAddressText deduplicates repeated segments and arranges cleanly', () => {
  const out = cleanAddressText('Address: Road No 5\nRoad No 5, Jubilee Hills, , Hyderabad, 500033', {
    customerName: 'Lokesh',
    phone: '9876543210',
    pincode: '500033',
    city: 'Hyderabad',
    state: 'Telangana',
  });
  assert.equal(out, 'Road No 5, Jubilee Hills');
});
