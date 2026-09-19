/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface OrderItem {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  price: number;
  option?: string;
}

export interface ShippingAddress {
  name: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  email?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  date: string;
  customerName: string;
  address: ShippingAddress;
  items: OrderItem[];
  totalAmount: number;
  status: 'pending' | 'processing' | 'processed' | 'booked' | 'awb_assigned' | 'shipped' | 'delivered' | 'cancelled' | 'failed';
  errorMessage?: string;
  weight: number; // in kg
  dimensions: {
    length: number; // in cm
    width: number;
    height: number;
  };
  shiprocketOrderId?: string;
  shipmentId?: string;
  awbCode?: string;
  courierName?: string;
  deliveryDate?: string;
  invoiceUrl?: string;
  labelUrl?: string;
  trackingHistory?: TrackingEvent[];
  assignedEmployeeId?: string;
  paymentMethod?: string;
  createdByEmployeeId?: string;
  createdByEmployeeName?: string;
  productAdvance?: boolean;
  productAdvanceIncentive?: number;
}

export interface TrackingEvent {
  date: string;
  status: string;
  location: string;
  activity: string;
}

export interface CourierServiceability {
  courierId: number;
  courierName: string;
  rate: number;
  eta: string;
  rating: number;
  cod: boolean;
  minWeight: number;
}

export interface ShiprocketCredentials {
  email?: string;
  password?: string;
  token?: string;
  isSimulated: boolean;
}

export interface AppSettings {
  shiprocketEmail: string;
  shiprocketPassword: string;
  shiprocketToken?: string;
  defaultPickupPincode: string;
  defaultPickupCity: string;
  defaultPickupState: string;
  defaultWeight: number;
  whatsappTemplate: string;
  emailTemplate: string;
}

export type ReplacementFlag = 'red' | 'orange' | 'green' | 'none';

export interface ReplacementRequest {
  id: string;
  ticketNumber: string;
  type: 'replacement' | 'exchange';
  customerName: string;
  customerPhone: string; // Mandatory contact number
  customerAddress?: {
    address?: string; // Optional
    city?: string;    // Optional
    state?: string;   // Optional
    pincode?: string; // Optional
  };
  orderNumber?: string;
  productName: string;
  productSku?: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'done';
  flag?: ReplacementFlag; // 'red' (urgent/escalated), 'orange' (review/missing info), 'green' (normal/approved)
  flagReason?: string;
  photoUrl?: string;
  notes?: string;
  adminNotes?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  approvedBy?: string;
  completedAt?: string;
  completedBy?: string;
}

export interface AiParsedReplacement {
  type: 'replacement' | 'exchange';
  customerName: string;
  customerPhone: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  orderNumber?: string;
  productName: string;
  productSku?: string;
  reason: string;
  notes?: string;
  flag: ReplacementFlag;
  flagReason?: string;
  summary?: string;
}


