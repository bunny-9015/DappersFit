/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  X, ShieldCheck, Clock, Award, Star, AlertCircle, Loader2,
  Warehouse, Check, Phone, Wallet
} from 'lucide-react';
import { Order, CourierServiceability } from '../types';
import { ShiprocketService } from '../services/shiprocketService';

interface ServiceabilityModalProps {
  order: Order;
  onClose: () => void;
  onBook: (
    courier: CourierServiceability, 
    deliveryAddress?: any, 
    pickupLocationName?: string, 
    pickupPostcode?: string
  ) => Promise<void> | void;
  walletBalance?: number;
  walletSimulated?: boolean;
  onRefreshWallet?: () => void;
  isProcessing?: boolean;
}

interface PickupLocation {
  name: string;
  pincode: string;
  address: string;
  city: string;
  state: string;
  phone?: string;
  isLive?: boolean;
}

export default function ServiceabilityModal({ 
  order, 
  onClose, 
  onBook, 
  walletBalance, 
  walletSimulated,
  onRefreshWallet,
  isProcessing = false
}: ServiceabilityModalProps) {
  const [isBooking, setIsBooking] = useState<boolean>(false);
  const bookingDisabled = isBooking || isProcessing;

  // Use the exact address pasted in the order itself
  const rawAddr = (order.address || {}) as any;
  const activeDeliveryAddress = {
    name: rawAddr.name || order.customerName || 'Customer',
    phone: rawAddr.phone || '8019566202',
    address: rawAddr.address || 'Ramnagar 6th line, Chemakurti',
    city: rawAddr.city || 'Chemakurti',
    state: rawAddr.state || 'Andhra Pradesh',
    pincode: rawAddr.pincode || '523272',
    email: rawAddr.email || ''
  };

  // Scan customer name beforehand: if missing, empty, or Walkin Customer, booking is blocked
  const nameTrimmed = (order.customerName || '').trim();
  const isNameInvalid = !nameTrimmed || nameTrimmed.toLowerCase() === 'walkin customer' || nameTrimmed.toLowerCase() === 'walk-in customer';

  const [modalWalletBalance, setModalWalletBalance] = useState<number | undefined>(walletBalance);
  const [isCheckingWallet, setIsCheckingWallet] = useState<boolean>(false);

  // Keep state in sync if prop changes
  useEffect(() => {
    setModalWalletBalance(walletBalance);
  }, [walletBalance]);

  const handleRecheckWallet = async () => {
    setIsCheckingWallet(true);
    try {
      const res = await ShiprocketService.syncWalletDetails();
      if (res.success) {
        setModalWalletBalance(res.available_balance);
        if (onRefreshWallet) {
          onRefreshWallet();
        }
      } else {
        const resBasic = await ShiprocketService.fetchWallet();
        if (resBasic.success) {
          setModalWalletBalance(resBasic.balance);
        }
      }
    } catch (err) {
      console.error('Failed to re-check wallet manually:', err);
    } finally {
      setIsCheckingWallet(false);
    }
  };

  const [pickupLocations, setPickupLocations] = useState<PickupLocation[]>([]);
  const [selectedPickupName, setSelectedPickupName] = useState<string>('Dapers');
  const [loadingPickups, setLoadingPickups] = useState<boolean>(true);
  const [pickupError, setPickupError] = useState<string | null>(null);

  const [couriers, setCouriers] = useState<CourierServiceability[]>([]);
  const [loadingCouriers, setLoadingCouriers] = useState<boolean>(false);
  const [courierError, setCourierError] = useState<string | null>(null);

  const activePickupAddress = pickupLocations.find(l => l.name === selectedPickupName) || pickupLocations[0];

  // Load pickup addresses on mount
  useEffect(() => {
    async function loadPickupAddresses() {
      setLoadingPickups(true);
      setPickupError(null);
      const res = await ShiprocketService.fetchPickupAddresses();
      if (res.success && res.addresses.length > 0) {
        setPickupLocations(res.addresses);
        // Find if 'Dapers' (case-insensitive or exact match) is available in retrieved locations
        const dapersLoc = res.addresses.find(
          (addr: any) => addr.name.toLowerCase() === 'dapers' || addr.name.toLowerCase().includes('daper')
        );
        if (dapersLoc) {
          setSelectedPickupName(dapersLoc.name);
        } else {
          // Default to the first location if 'Dapers' is not present
          setSelectedPickupName(res.addresses[0].name);
        }
      } else {
        setPickupError(res.error || 'Failed to fetch registered Shiprocket pickup addresses.');
      }
      setLoadingPickups(false);
    }
    loadPickupAddresses();
  }, []);

  // Re-fetch serviceability whenever delivery pincode or active pickup pincode changes
  useEffect(() => {
    if (!activePickupAddress) return;

    if (isNameInvalid) {
      setCourierError("Booking is blocked because the customer name is missing, empty, or set to 'Walkin Customer'.");
      return;
    }

    async function fetchServiceability() {
      setLoadingCouriers(true);
      setCourierError(null);
      
      const res = await ShiprocketService.checkServiceability(
        activeDeliveryAddress.pincode,
        order.weight,
        false, // pre-paid by default for demo
        activePickupAddress.pincode
      );

      if (res.success) {
        setCouriers(res.couriers);
      } else {
        setCourierError(res.error || 'Failed to fetch courier serviceability options.');
      }
      setLoadingCouriers(false);
    }

    fetchServiceability();
  }, [activeDeliveryAddress.pincode, activePickupAddress?.pincode, order.weight, isNameInvalid]);

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center z-50 p-4" id="serviceability-modal-overlay">
      <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150" id="serviceability-modal-card">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between bg-slate-900/60" id="modal-header">
          <div>
            <h3 className="font-sans font-bold text-lg text-white">Approve Order & Select Courier</h3>
            <p className="text-xs text-slate-400 font-sans mt-0.5">Configure dispatch parameters for Order {order.orderNumber}</p>
          </div>
          <button 
            onClick={onClose}
            disabled={bookingDisabled}
            className={`p-1.5 rounded-lg text-slate-400 transition ${
              bookingDisabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-slate-700 hover:text-white'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-6 py-3 bg-slate-900/40 border-b border-slate-700 text-xs font-mono text-slate-300" id="modal-info-strip">
          <div>
            <span className="text-[10px] text-slate-500 block uppercase font-sans">Active Pincode Link</span>
            <span className="font-bold text-slate-100 flex items-center gap-1">
              <span className="text-sky-400">{activePickupAddress ? activePickupAddress.pincode : '...'}</span>
              <span className="text-slate-500 text-[10px]">➜</span>
              <span className="text-emerald-400">{activeDeliveryAddress.pincode}</span>
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 block uppercase font-sans">Weight class</span>
            <span className="font-bold text-slate-100">{order.weight} kg</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 block uppercase font-sans">Est. Order Value</span>
            <span className="font-bold text-slate-100 font-mono">₹{order.totalAmount}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 block uppercase font-sans">Shiprocket Balance</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`font-bold font-mono ${(modalWalletBalance !== undefined && modalWalletBalance <= 100) ? 'text-red-400' : 'text-emerald-400'}`}>
                ₹{modalWalletBalance !== undefined ? modalWalletBalance.toFixed(2) : '0.00'}
              </span>
              <button
                onClick={handleRecheckWallet}
                disabled={isCheckingWallet}
                className="text-[10px] text-sky-400 hover:text-sky-300 font-sans flex items-center gap-1 disabled:opacity-50"
              >
                {isCheckingWallet ? (
                  <Loader2 className="w-2.5 h-2.5 animate-spin" />
                ) : (
                  'Re-check'
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-800/50" id="modal-content">
          
          {modalWalletBalance !== undefined && modalWalletBalance <= 0 && (
            <div className="p-4 bg-red-950/50 border-2 border-red-500 text-red-200 rounded-xl animate-in fade-in duration-200 space-y-3" id="wallet-balance-empty-warning-banner">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 shrink-0 text-red-400 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-xs tracking-wide uppercase text-red-400 bg-red-500/20 px-2 py-0.5 rounded border border-red-500/40">⚠️ Warning</span>
                    <span className="text-xs text-red-300 font-mono font-bold">Balance: ₹0.00</span>
                  </div>
                  <p className="mt-1 font-sans text-xs leading-relaxed text-slate-200 font-medium">
                    There is no balance in your Shiprocket wallet. Please recharge your wallet on the Shiprocket website before booking.
                  </p>
                </div>
              </div>
            </div>
          )}

          {isNameInvalid && (
            <div className="flex items-start space-x-3 p-4 bg-red-950/40 border-2 border-red-500/60 text-red-200 rounded-xl animate-pulse" id="customer-name-invalid-warning-banner">
              <AlertCircle className="w-5 h-5 shrink-0 text-red-400 mt-0.5" />
              <div>
                <span className="font-bold text-xs tracking-wide uppercase text-red-300">⚠️ Mandatory Customer Name Required</span>
                <p className="mt-1 font-sans text-xs leading-relaxed text-slate-300">
                  This order's customer name is missing, empty, or currently set to <strong className="font-mono text-white bg-red-500/20 px-1 rounded">"Walkin Customer"</strong>. 
                  Shiprocket bookings require a valid billing name. Please close this window, edit this order's details to specify a real customer name, and then retry.
                </p>
              </div>
            </div>
          )}

          {/* STEP 1: PICKUP WAREHOUSES LIST */}
          <div className="space-y-3" id="step-pickup-addresses">
            <div className="flex items-center justify-between">
              <label className="text-xs font-sans font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <Warehouse className="w-4 h-4 text-amber-400" />
                <span>1. Select Shiprocket Pickup Address (Default: 'Dapers')</span>
              </label>
              {loadingPickups ? (
                <span className="flex items-center gap-1 text-[10px] text-amber-400 font-mono">
                  <Loader2 className="w-3 h-3 animate-spin" /> Fetching addresses...
                </span>
              ) : (
                <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 font-mono text-[10px] rounded-full font-bold">
                  {pickupLocations.length} locations registered
                </span>
              )}
            </div>

            {loadingPickups ? (
              <div className="flex flex-col items-center justify-center py-8 space-y-2 bg-slate-900/10 border border-slate-700/40 rounded-xl">
                <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
                <p className="text-xs text-slate-400 font-mono">Loading registered locations directly from Shiprocket...</p>
              </div>
            ) : pickupError ? (
              <div className="flex items-start space-x-3 p-4 bg-red-950/20 border border-red-900/40 text-red-400 rounded-xl text-xs">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <div>
                  <span className="font-bold">Error loading Shiprocket pickup addresses</span>
                  <p className="mt-1 font-mono text-[11px] leading-relaxed">{pickupError}</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {pickupLocations.map((loc) => {
                  const isSelected = selectedPickupName === loc.name;
                  const isDapers = loc.name.toLowerCase() === 'dapers' || loc.name.toLowerCase().includes('daper');
                  return (
                    <button
                      key={loc.name}
                      onClick={() => setSelectedPickupName(loc.name)}
                      id={`pickup-loc-btn-${loc.name.replace(/\s+/g, '-').toLowerCase()}`}
                      className={`text-left p-4 rounded-xl border transition-all flex flex-col justify-between h-full relative ${
                        isSelected 
                          ? 'border-amber-500 bg-amber-950/20 shadow-md ring-1 ring-amber-500/20' 
                          : 'border-slate-700 bg-slate-900/30 hover:border-slate-600 hover:bg-slate-900/50'
                      }`}
                    >
                      {isSelected && (
                        <span className="absolute top-3 right-3 w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 text-slate-950 stroke-[3]" />
                        </span>
                      )}
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-sans font-bold text-slate-200 text-sm">{loc.name}</span>
                          {isDapers && (
                            <span className="text-[9px] bg-sky-500/20 border border-sky-500/30 text-sky-400 font-bold px-1.5 py-0.2 rounded">
                              DEFAULT
                            </span>
                          )}
                          {loc.isLive && (
                            <span className="text-[9px] bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-bold px-1.5 py-0.2 rounded">
                              LIVE
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-mono text-amber-500/90 font-bold">PIN: {loc.pincode}</p>
                        <p className="text-xs font-sans text-slate-400 leading-relaxed line-clamp-3">{loc.address}</p>
                        <p className="text-xs font-sans font-medium text-slate-300">{loc.city}, {loc.state}</p>
                      </div>
                      {loc.phone && (
                        <div className="mt-3 pt-2 border-t border-slate-700/60 text-[10px] font-mono text-slate-400 flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-500" /> {loc.phone}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* STEP 2: COURIER COMPARISON & DISPATCH */}
          <div className="space-y-3 pt-2" id="step-couriers-list">
            <div className="text-xs font-sans text-emerald-400 uppercase tracking-wider font-bold flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>2. Available Courier Companies ({couriers.length} partners serviceable)</span>
            </div>
            
            {loadingCouriers ? (
              <div className="flex flex-col items-center justify-center py-10 space-y-3 bg-slate-900/20 border border-slate-700/50 rounded-2xl">
                <Loader2 className="w-8 h-8 animate-spin text-sky-400" />
                <p className="text-xs text-slate-400 font-mono">Querying shipping serviceability rates from {activePickupAddress?.name || 'pickup location'} to {activeDeliveryAddress.city}...</p>
              </div>
            ) : courierError ? (
              <div className="flex items-start space-x-3 p-4 bg-red-950/20 border border-red-900/40 text-red-400 rounded-xl text-xs" id="modal-error">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <div>
                  <span className="font-bold">Serviceability Check Blocked</span>
                  <p className="mt-1 font-mono text-[11px] leading-relaxed">{courierError}</p>
                </div>
              </div>
            ) : couriers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 space-y-2 bg-slate-900/20 border border-slate-700/50 rounded-2xl" id="modal-empty">
                <AlertCircle className="w-6 h-6 text-slate-500" />
                <p className="text-xs text-slate-400 font-mono">No logistics route serviceable for pincode pairing {activePickupAddress?.pincode} ➜ {activeDeliveryAddress.pincode}.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3" id="couriers-list">
                {couriers.map((courier) => {
                  const isInsufficient = modalWalletBalance !== undefined && modalWalletBalance < courier.rate;
                  return (
                    <div 
                      key={courier.courierId}
                      className="flex items-center justify-between p-4 rounded-xl border border-slate-700 hover:border-sky-400 bg-slate-900/40 hover:bg-slate-900/80 hover:shadow-lg transition group"
                      id={`courier-option-${courier.courierId}`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-sans font-bold text-slate-200 text-sm group-hover:text-sky-400 transition">{courier.courierName}</span>
                          <div className="flex items-center text-amber-500 text-xs">
                            <Star className="w-3.5 h-3.5 fill-amber-500 stroke-amber-500" />
                            <span className="ml-0.5 font-bold font-mono">{courier.rating.toFixed(1)}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3 text-xs text-slate-400 font-mono">
                          <span className="flex items-center space-x-1">
                            <Clock className="w-3.5 h-3.5 text-slate-500" />
                            <span>ETA: {courier.eta}</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <Award className="w-3.5 h-3.5 text-slate-500" />
                            <span>Min: {courier.minWeight}kg</span>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <span className="text-[10px] text-slate-500 uppercase tracking-wide block font-sans">Rate Card</span>
                          <span className="font-mono font-black text-white text-base">₹{courier.rate.toFixed(2)}</span>
                        </div>
                        <button
                          id={`book-button-${courier.courierId}`}
                          onClick={async () => {
                            if (isInsufficient || !activePickupAddress || bookingDisabled) return;
                            setIsBooking(true);
                            try {
                              await onBook(
                                courier, 
                                activeDeliveryAddress, 
                                activePickupAddress?.name, 
                                activePickupAddress?.pincode
                              );
                            } finally {
                              setIsBooking(false);
                            }
                          }}
                          disabled={isInsufficient || !activePickupAddress || bookingDisabled}
                          className={`px-4 py-2 font-bold text-xs rounded-lg transition shadow flex items-center gap-1.5 ${
                            (isInsufficient || !activePickupAddress || bookingDisabled)
                              ? 'bg-slate-700 text-slate-400 border border-slate-650 cursor-not-allowed opacity-60'
                              : 'bg-sky-500 hover:bg-sky-400 text-slate-950 hover:shadow-md'
                          }`}
                        >
                          {bookingDisabled ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin inline text-slate-400" />
                              <span>Processing...</span>
                            </>
                          ) : isInsufficient ? (
                            'Money invalid'
                          ) : (
                            'Book Shipment'
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-700 flex items-center justify-between bg-slate-900/60 text-xs text-slate-400" id="modal-footer">
          <span className="flex items-center space-x-1">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Guaranteed SLA rates provided via Shiprocket API</span>
          </span>
          <button 
            onClick={onClose}
            disabled={bookingDisabled}
            className={`px-4 py-2 font-semibold text-slate-300 rounded-lg transition border border-slate-700 ${
              bookingDisabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-slate-700'
            }`}
          >
            Cancel
          </button>
        </div>

      </div>
    </div>
  );
}
