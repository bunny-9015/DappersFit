/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CourierServiceability, TrackingEvent, Order } from '../types';

export interface ServiceabilityResponse {
  success: boolean;
  couriers: CourierServiceability[];
  error?: string;
}

export interface OrderBookingResponse {
  success: boolean;
  shiprocketOrderId?: string;
  shipmentId?: string;
  awbCode?: string;
  courierName?: string;
  order?: Order;
  error?: string;
}

export interface DocumentResponse {
  success: boolean;
  url?: string;
  error?: string;
}

export interface TrackingResponse {
  success: boolean;
  trackingHistory: TrackingEvent[];
  error?: string;
}

export interface CancelResponse {
  success: boolean;
  error?: string;
}

export interface TokenStatusResponse {
  success: boolean;
  isLive: boolean;
  mode: 'live' | 'simulator';
}

/**
 * Centralized Shiprocket API Gateway Service
 * Handles secure communication with the backend Shiprocket proxy endpoints.
 * Implements token state check, serviceability calculations, order creation, AWB generation,
 * label and invoice generation, shipment cancellation, and shipment tracking.
 */
export class ShiprocketService {
  private static apiBase = '/api/shiprocket';

  /**
   * Check if the API Gateway has a live token or is operating in simulator fallback mode
   */
  static async checkTokenStatus(): Promise<TokenStatusResponse> {
    try {
      const response = await fetch('/api/status');
      if (!response.ok) {
        throw new Error('Failed to query system status endpoint.');
      }
      const data = await response.json();
      return {
        success: true,
        isLive: data.isLiveConfigured,
        mode: data.isLiveConfigured ? 'live' : 'simulator'
      };
    } catch (err: any) {
      console.warn('Could not reach gateway status, defaulting to simulator:', err);
      return {
        success: true,
        isLive: false,
        mode: 'simulator'
      };
    }
  }

  /**
   * Fetch registered pickup addresses from Shiprocket (Live/Simulated)
   */
  static async fetchPickupAddresses(): Promise<{ success: boolean; addresses: any[]; error?: string }> {
    try {
      const response = await fetch(`${this.apiBase}/pickup-addresses`);
      if (!response.ok) {
        let errMsg = `Failed to fetch pickup addresses with status: ${response.status}`;
        try {
          const errData = await response.json();
          errMsg = errData.error || errData.message || errMsg;
        } catch {}
        throw new Error(errMsg);
      }
      const data = await response.json();
      return {
        success: data.success,
        addresses: data.addresses || [],
        error: data.error
      };
    } catch (err: any) {
      console.error('Shiprocket fetchPickupAddresses error:', err);
      return {
        success: false,
        addresses: [],
        error: err.message || 'Unable to fetch pickup locations.'
      };
    }
  }

  /**
   * Check Courier availability and calculate delivery rates for a specific PIN Code & weight
   */
  static async checkServiceability(
    deliveryPostcode: string,
    weight: number,
    cod: boolean = false,
    pickupPostcode?: string
  ): Promise<ServiceabilityResponse> {
    try {
      const response = await fetch(`${this.apiBase}/serviceability`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          delivery_postcode: deliveryPostcode,
          weight,
          cod: cod ? 1 : 0,
          pickup_postcode: pickupPostcode
        })
      });

      if (!response.ok) {
        let errMsg = `Serviceability check failed with status: ${response.status}`;
        try {
          const errData = await response.json();
          errMsg = errData.error || errData.message || errMsg;
        } catch {}
        throw new Error(errMsg);
      }

      const data = await response.json();
      return {
        success: true,
        couriers: data.couriers || []
      };
    } catch (err: any) {
      console.error('Shiprocket serviceability error:', err);
      return {
        success: false,
        couriers: [],
        error: err.message || 'Unable to fetch courier serviceability.'
      };
    }
  }

  /**
   * Book an order, creating the ad-hoc order on Shiprocket and assigning an AWB in one transaction
   */
  static async bookOrder(
    orderId: string,
    courier: CourierServiceability,
    assignedEmployeeId?: string,
    deliveryAddress?: any,
    pickupLocationName?: string,
    pickupPostcode?: string
  ): Promise<OrderBookingResponse> {
    try {
      const response = await fetch(`${this.apiBase}/order/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          courier,
          assignedEmployeeId,
          deliveryAddress,
          pickupLocationName,
          pickupPostcode
        })
      });

      if (!response.ok) {
        let errMsg = `Order placement failed with status: ${response.status}`;
        try {
          const errData = await response.json();
          errMsg = errData.error || errData.message || errMsg;
        } catch {}
        throw new Error(errMsg);
      }

      const data = await response.json();
      if (data.success) {
        return {
          success: true,
          shiprocketOrderId: data.shiprocketOrderId,
          shipmentId: data.shipmentId,
          awbCode: data.awbCode,
          courierName: data.courierName,
          order: data.order
        };
      } else {
        throw new Error(data.error || 'Failed to complete order booking.');
      }
    } catch (err: any) {
      console.error('Shiprocket order booking error:', err);
      return {
        success: false,
        error: err.message || 'Order booking failed.'
      };
    }
  }

  /**
   * Production-Ready Sequential Courier Booking API
   * Idempotency check -> Status lock -> Create Order -> Generate AWB -> Generate Label
   */
  static async bookCourierSequential(
    orderId: string,
    courierName?: string,
    simulateFailure?: string
  ): Promise<{
    success: boolean;
    status: string;
    orderId?: string;
    orderNumber?: string;
    shiprocketOrderId?: string;
    shipmentId?: string;
    awbCode?: string;
    courierName?: string;
    labelUrl?: string;
    error?: string;
  }> {
    try {
      const response = await fetch('/api/shiprocket/book-courier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          courierName,
          simulateFailure
        })
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || `HTTP ${response.status}: Courier booking rejected.`);
      }
      return data;
    } catch (err: any) {
      return {
        success: false,
        status: 'failed',
        error: err.message || 'Courier booking failed.'
      };
    }
  }

  /**
   * Generate and fetch the printable shipping label URL for a shipment
   */
  static async fetchLabel(shipmentId: string): Promise<DocumentResponse> {
    try {
      const response = await fetch(`${this.apiBase}/label`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shipmentId })
      });

      if (!response.ok) {
        let errMsg = `Label retrieval failed with status: ${response.status}`;
        try {
          const errData = await response.json();
          errMsg = errData.error || errData.message || errMsg;
        } catch {}
        throw new Error(errMsg);
      }

      const data = await response.json();
      if (data.labelUrl) {
        return {
          success: true,
          url: data.labelUrl
        };
      } else {
        throw new Error(data.error || 'Shipping label URL not found in response.');
      }
    } catch (err: any) {
      console.error('Shiprocket label fetching error:', err);
      return {
        success: false,
        error: err.message || 'Failed to fetch shipping label.'
      };
    }
  }

  /**
   * Generate and fetch the printable Tax Invoice PDF URL for a booking
   */
  static async fetchInvoice(orderId: string): Promise<DocumentResponse> {
    try {
      const response = await fetch(`${this.apiBase}/invoice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId })
      });

      if (!response.ok) {
        let errMsg = `Invoice retrieval failed with status: ${response.status}`;
        try {
          const errData = await response.json();
          errMsg = errData.error || errData.message || errMsg;
        } catch {}
        throw new Error(errMsg);
      }

      const data = await response.json();
      if (data.invoiceUrl) {
        return {
          success: true,
          url: data.invoiceUrl
        };
      } else {
        throw new Error(data.error || 'Invoice URL not found in response.');
      }
    } catch (err: any) {
      console.error('Shiprocket invoice fetching error:', err);
      return {
        success: false,
        error: err.message || 'Failed to fetch tax invoice.'
      };
    }
  }

  /**
   * Cancel an active shipment on the Shiprocket platform
   */
  static async cancelShipment(orderId: string): Promise<CancelResponse> {
    try {
      const response = await fetch(`${this.apiBase}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId })
      });

      if (!response.ok) {
        let errMsg = `Shipment cancellation failed with status: ${response.status}`;
        try {
          const errData = await response.json();
          errMsg = errData.error || errData.message || errMsg;
        } catch {}
        throw new Error(errMsg);
      }

      const data = await response.json();
      if (data.success) {
        return { success: true };
      } else {
        throw new Error(data.error || 'Failed to void shipment on server.');
      }
    } catch (err: any) {
      console.error('Shiprocket cancellation error:', err);
      return {
        success: false,
        error: err.message || 'Shipment cancellation failed.'
      };
    }
  }

  /**
   * Fetch current tracking milestones & events for an active AWB
   */
  static async trackShipment(awbCode: string): Promise<TrackingResponse> {
    try {
      const response = await fetch(`${this.apiBase}/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ awbCode })
      });

      if (!response.ok) {
        let errMsg = `Tracking query failed with status: ${response.status}`;
        try {
          const errData = await response.json();
          errMsg = errData.error || errData.message || errMsg;
        } catch {}
        throw new Error(errMsg);
      }

      const data = await response.json();
      return {
        success: true,
        trackingHistory: data.trackingHistory || []
      };
    } catch (err: any) {
      console.error('Shiprocket tracking fetch error:', err);
      return {
        success: false,
        trackingHistory: [],
        error: err.message || 'Failed to query tracking information.'
      };
    }
  }

  /**
   * Fetch current Shiprocket wallet balance (live or simulated)
   */
  static async fetchWallet(): Promise<{ balance: number; isSimulated: boolean; success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.apiBase}/wallet`);
      if (!response.ok) {
        let errMsg = `Wallet balance fetch failed with status: ${response.status}`;
        try {
          const errData = await response.json();
          errMsg = errData.error || errData.message || errMsg;
        } catch {}
        throw new Error(errMsg);
      }
      const data = await response.json();
      return {
        success: true,
        balance: data.balance || 0,
        isSimulated: !!data.isSimulated
      };
    } catch (err: any) {
      console.error('Shiprocket fetch wallet balance error:', err);
      return {
        success: false,
        balance: 0,
        isSimulated: true,
        error: err.message || 'Failed to fetch wallet balance.'
      };
    }
  }

  static async priorityBookOrder(orderId: string, assignedEmployeeId?: string): Promise<OrderBookingResponse & { rate?: number }> {
    try {
      const response = await fetch(`${this.apiBase}/order/priority-book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, assignedEmployeeId })
      });

      if (!response.ok) {
        // Try parsing JSON error
        let errMsg = `Priority booking failed with status: ${response.status}`;
        try {
          const errData = await response.json();
          errMsg = errData.error || errMsg;
        } catch {}
        throw new Error(errMsg);
      }

      const data = await response.json();
      if (data.success) {
        return {
          success: true,
          shiprocketOrderId: data.shiprocketOrderId,
          shipmentId: data.shipmentId,
          awbCode: data.awbCode,
          courierName: data.courierName,
          rate: data.rate,
          order: data.order
        };
      } else {
        throw new Error(data.error || 'Failed to complete priority booking.');
      }
    } catch (err: any) {
      console.error('Priority order booking error:', err);
      return {
        success: false,
        error: err.message || 'Priority order booking failed.'
      };
    }
  }

  /**
   * Fetch detailed Shiprocket wallet balance (available balance and hold amount)
   */
  static async fetchWalletDetails(): Promise<{ available_balance: number; hold_amount: number; last_sync_time: string; is_simulated: boolean; success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.apiBase}/wallet/balance-details`);
      if (!response.ok) {
        let errMsg = `Wallet details fetch failed with status: ${response.status}`;
        try {
          const errData = await response.json();
          errMsg = errData.error || errData.message || errMsg;
        } catch {}
        throw new Error(errMsg);
      }
      const data = await response.json();
      return {
        success: true,
        available_balance: data.available_balance || 0,
        hold_amount: data.hold_amount || 0,
        last_sync_time: data.last_sync_time || new Date().toISOString(),
        is_simulated: !!data.is_simulated
      };
    } catch (err: any) {
      console.error('Shiprocket fetch wallet details error:', err);
      return {
        success: false,
        available_balance: 0,
        hold_amount: 0,
        last_sync_time: new Date().toISOString(),
        is_simulated: true,
        error: err.message || 'Failed to fetch detailed wallet balance.'
      };
    }
  }

  /**
   * Force synchronize detailed Shiprocket wallet balance
   */
  static async syncWalletDetails(): Promise<{ available_balance: number; hold_amount: number; last_sync_time: string; is_simulated: boolean; success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.apiBase}/wallet/balance-details/sync`, {
        method: 'POST'
      });
      if (!response.ok) {
        let errMsg = `Wallet sync failed with status: ${response.status}`;
        try {
          const errData = await response.json();
          errMsg = errData.error || errData.message || errMsg;
        } catch {}
        throw new Error(errMsg);
      }
      const data = await response.json();
      return {
        success: true,
        available_balance: data.available_balance || 0,
        hold_amount: data.hold_amount || 0,
        last_sync_time: data.last_sync_time || new Date().toISOString(),
        is_simulated: !!data.is_simulated
      };
    } catch (err: any) {
      console.error('Shiprocket sync wallet details error:', err);
      return {
        success: false,
        available_balance: 0,
        hold_amount: 0,
        last_sync_time: new Date().toISOString(),
        is_simulated: true,
        error: err.message || 'Failed to sync detailed wallet balance.'
      };
    }
  }

  /**
   * Synchronize single order status directly with Shiprocket API
   */
  static async syncOrderStatus(orderId: string): Promise<{ success: boolean; order?: Order; status?: string; labelUrl?: string; error?: string }> {
    try {
      const response = await fetch(`${this.apiBase}/order/sync-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId })
      });
      const data = await response.json();
      return data;
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to sync order status' };
    }
  }

  /**
   * Synchronize all active/booked orders with Shiprocket API
   */
  static async syncAllOrderStatuses(): Promise<{ success: boolean; orders?: Order[]; error?: string }> {
    try {
      const response = await fetch(`${this.apiBase}/orders/sync-all-statuses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();
      return data;
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to sync order statuses' };
    }
  }
}
