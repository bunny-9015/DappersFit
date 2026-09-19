/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Truck, MapPin, Settings, HelpCircle, Save, Plus, Trash } from 'lucide-react';

interface Warehouse {
  id: string;
  name: string;
  pincode: string;
  city: string;
  state: string;
  isDefault: boolean;
}

export default function ShippingPanel() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([
    { id: 'w1', name: 'Pune Primary Warehouse', pincode: '411037', city: 'Pune', state: 'Maharashtra', isDefault: true },
    { id: 'w2', name: 'Mumbai Secondary Hub', pincode: '400001', city: 'Mumbai', state: 'Maharashtra', isDefault: false }
  ]);

  const [volumetricDivisor, setVolumetricDivisor] = useState(5000);
  const [courierPriority, setCourierPriority] = useState('cheapest');
  const [showAddWarehouse, setShowAddWarehouse] = useState(false);

  // New Warehouse form state
  const [wName, setWName] = useState('');
  const [wPin, setWPin] = useState('');
  const [wCity, setWCity] = useState('');
  const [wState, setWState] = useState('');

  const handleAddWarehouse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wName || !wPin || !wCity || !wState) return;

    const newW: Warehouse = {
      id: `w-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
      name: wName,
      pincode: wPin,
      city: wCity,
      state: wState,
      isDefault: false
    };

    setWarehouses([...warehouses, newW]);
    setShowAddWarehouse(false);
    // Reset
    setWName('');
    setWPin('');
    setWCity('');
    setWState('');
  };

  const handleDeleteWarehouse = (id: string) => {
    setWarehouses(warehouses.filter(w => w.id !== id));
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 font-sans text-slate-100" id="shipping-rules-panel">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">Logistical Channels & Routing Rules</h1>
        <p className="text-sm text-slate-400 mt-1">Configure physical warehouse pickup profiles, priority express algorithms & weight divisor matrices.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left columns: Warehouse dispatch settings */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg text-white uppercase tracking-wider">Warehouse Locations</h3>
            <button
              onClick={() => setShowAddWarehouse(true)}
              className="px-3 py-1.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs rounded-lg flex items-center space-x-1 transition"
              id="add-warehouse-btn"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Register Warehouse</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {warehouses.map(wh => (
              <div key={wh.id} className="bg-slate-800 p-5 rounded-xl border border-slate-700 space-y-3 relative overflow-hidden">
                {wh.isDefault && (
                  <div className="absolute top-0 right-0 bg-sky-500 text-slate-950 text-[9px] font-bold px-2 py-0.5 uppercase rounded-bl">
                    Default
                  </div>
                )}
                
                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-slate-900 rounded-lg text-sky-400">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-200">{wh.name}</h4>
                    <p className="text-xs text-slate-400 font-mono mt-1">{wh.city}, {wh.state} - {wh.pincode}</p>
                  </div>
                </div>

                {!wh.isDefault && (
                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={() => handleDeleteWarehouse(wh.id)}
                      className="p-1 hover:bg-red-950/20 text-slate-500 hover:text-red-400 rounded transition border border-transparent hover:border-red-900/40"
                    >
                      <Trash className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Routing Rules Settings */}
        <div className="lg:col-span-1 space-y-6">
          <h3 className="font-bold text-lg text-white uppercase tracking-wider">Fulfillment Rules</h3>
          
          <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl space-y-5">
            {/* Volumetric Weight Divisor */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Volumetric weight divisor</label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  value={volumetricDivisor}
                  onChange={(e) => setVolumetricDivisor(Number(e.target.value))}
                  className="w-24 px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg font-mono text-slate-100 text-sm outline-none focus:border-sky-400"
                />
                <span className="text-xs text-slate-450 leading-relaxed">Standard e-commerce factor. (L * W * H) / Divisor = Volumetric Weight.</span>
              </div>
            </div>

            {/* Courier Selection priority */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Auto Courier Match Criteria</label>
              <select
                value={courierPriority}
                onChange={(e) => setCourierPriority(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-300 text-sm outline-none focus:border-sky-400"
              >
                <option value="cheapest">Cheapest Available Channel</option>
                <option value="fastest">Fastest SLA (Minimum Days)</option>
                <option value="highest_rated">Highest Customer Rating Partner</option>
              </select>
            </div>

            <button className="w-full px-4 py-2.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 transition shadow shadow-sky-500/15">
              <Save className="w-4 h-4" />
              <span>Save Logistics Parameters</span>
            </button>
          </div>
        </div>

      </div>

      {/* Register Warehouse modal */}
      {showAddWarehouse && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form onSubmit={handleAddWarehouse} className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md space-y-4">
            <h3 className="text-lg font-bold text-white">Register Pickup Warehouse</h3>
            
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">Warehouse Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Hyderabad Express Depot"
                value={wName}
                onChange={(e) => setWName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-sm outline-none focus:border-sky-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">Pincode</label>
                <input
                  type="text"
                  required
                  placeholder="6 digits"
                  value={wPin}
                  onChange={(e) => setWPin(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-sm outline-none focus:border-sky-400"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">City</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Hyderabad"
                  value={wCity}
                  onChange={(e) => setWCity(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-sm outline-none focus:border-sky-400"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">State</label>
              <input
                type="text"
                required
                placeholder="e.g. Telangana"
                value={wState}
                onChange={(e) => setWState(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-sm outline-none focus:border-sky-400"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <button
                type="button"
                onClick={() => setShowAddWarehouse(false)}
                className="px-4 py-2 border border-slate-700 rounded-lg text-xs font-bold hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs rounded-lg"
              >
                Register Location
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
