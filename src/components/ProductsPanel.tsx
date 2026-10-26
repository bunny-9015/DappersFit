/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Search, Plus, Boxes, ArrowUpDown, Tag, AlertTriangle, Edit, Trash2, Shield, DollarSign, FileText } from 'lucide-react';

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  stock: number;
  weight: number;
  price?: number;
  description?: string;
}

interface ProductsPanelProps {
  currentUser?: { name: string; email: string; role: 'admin' | 'employee' } | null;
}

const INITIAL_PRODUCTS: Product[] = [];

export default function ProductsPanel({ currentUser }: ProductsPanelProps) {
  // Check if current user is an authorized admin
  const isAdmin = currentUser ? currentUser.role === 'admin' : true;

  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('dappersfit_products');
    return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
  });

  // Load products from backend database on mount
  useEffect(() => {
    async function fetchProducts() {
      try {
        const res = await fetch('/api/products');
        const data = await res.json();
        if (Array.isArray(data.products)) {
          setProducts(data.products);
          localStorage.setItem('dappersfit_products', JSON.stringify(data.products));
        }
      } catch (err) {
        console.error('Failed to load products from server:', err);
      }
    }
    fetchProducts();
  }, []);

  // Save to localStorage whenever products are updated
  useEffect(() => {
    localStorage.setItem('dappersfit_products', JSON.stringify(products));
  }, [products]);
  
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  
  // Edit Product Modal Form State
  const [showAdd, setShowAdd] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newSKU, setNewSKU] = useState('');
  const [newCategory, setNewCategory] = useState('Drone Action Cameras');
  const [newStock, setNewStock] = useState(50);
  const [newWeight, setNewWeight] = useState(0.5);
  const [newPrice, setNewPrice] = useState(0);
  const [newDescription, setNewDescription] = useState('');

  const handleCloseModal = () => {
    setShowAdd(false);
    setIsEditing(false);
    setEditId(null);
    setNewName('');
    setNewSKU('');
    setNewStock(50);
    setNewWeight(0.5);
    setNewPrice(0);
    setNewDescription('');
    setNewCategory('Drone Action Cameras');
  };

  const handleStartEdit = (product: Product) => {
    if (!isAdmin) {
      alert('Administrator access required to edit catalog products.');
      return;
    }
    setEditId(product.id);
    setIsEditing(true);
    setNewName(product.name);
    setNewSKU(product.sku);
    setNewCategory(product.category);
    setNewWeight(product.weight);
    setNewStock(product.stock);
    setNewPrice(product.price || 0);
    setNewDescription(product.description || '');
    setShowAdd(true);
  };

  const handleDeleteProduct = async (id: string) => {
    if (!isAdmin) {
      alert('Administrator access required to delete catalog products.');
      return;
    }
    if (window.confirm('Are you sure you want to permanently delete this product?')) {
      const updated = products.filter(p => p.id !== id);
      setProducts(updated);
      localStorage.setItem('dappersfit_products', JSON.stringify(updated));
      try {
        await fetch(`/api/products/${id}`, {
          method: 'DELETE',
          headers: { 'x-user-role': currentUser?.role || 'admin' }
        });
      } catch (err) {
        console.error('Failed to delete product on server:', err);
      }
    }
  };

  const handleClearAllProducts = async () => {
    if (!isAdmin) {
      alert('Administrator access required to clear catalog data.');
      return;
    }
    if (window.confirm('Are you sure you want to permanently clear all products from the database and UI?')) {
      setProducts([]);
      localStorage.setItem('dappersfit_products', '[]');
      try {
        await fetch('/api/products/clear', {
          method: 'POST'
        });
      } catch (err) {
        console.error('Failed to clear products on server:', err);
      }
    }
  };

  const filtered = products.filter(p => {
    const matchesSearch = (p.name || '').toLowerCase().includes(search.toLowerCase()) || (p.sku || '').toLowerCase().includes(search.toLowerCase());
    const matchesCat = categoryFilter === 'all' || p.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  const categories = ['all', ...Array.from(new Set(products.map(p => p.category)))];

  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      alert('Administrator access required to add or modify products.');
      return;
    }
    if (!newName || !newSKU) return;

    let targetProduct: Product;

    if (isEditing && editId) {
      targetProduct = {
        id: editId,
        name: newName,
        sku: newSKU,
        category: newCategory,
        stock: Number(newStock),
        weight: Number(newWeight),
        price: Number(newPrice) || 0,
        description: newDescription || ''
      };
      const updated = products.map(p => p.id === editId ? targetProduct : p);
      setProducts(updated);
      localStorage.setItem('dappersfit_products', JSON.stringify(updated));
    } else {
      targetProduct = {
        id: `p-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
        name: newName,
        sku: newSKU,
        category: newCategory,
        stock: Number(newStock),
        weight: Number(newWeight),
        price: Number(newPrice) || 0,
        description: newDescription || ''
      };
      const updated = [targetProduct, ...products];
      setProducts(updated);
      localStorage.setItem('dappersfit_products', JSON.stringify(updated));
    }

    fetch('/api/products', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-user-role': currentUser?.role || 'admin'
      },
      body: JSON.stringify(targetProduct)
    }).catch(err => console.error('Failed to save product on server:', err));

    handleCloseModal();
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 font-sans text-slate-100" id="products-panel">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">Product Catalog & Stock Registry</h1>
            {isAdmin ? (
              <span className="px-2.5 py-0.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold rounded-full flex items-center gap-1">
                <Shield className="w-3 h-3" /> Admin Authorized
              </span>
            ) : (
              <span className="px-2.5 py-0.5 bg-slate-800 border border-slate-700 text-slate-400 text-xs font-semibold rounded-full">
                Staff View (Read-Only)
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">Manage electronics product catalog, custom weight specifications (kg) & parcel stock registry.</p>
        </div>
        
        {isAdmin && (
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            <button
              onClick={handleClearAllProducts}
              className="px-3.5 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-bold text-xs sm:text-sm rounded-xl flex items-center space-x-1.5 transition"
              title="Clear all product data"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear Catalog</span>
            </button>
            <button
              onClick={() => { setIsEditing(false); setShowAdd(true); }}
              className="px-4 py-2 bg-[#b8862f] hover:bg-[#a67527] text-white font-bold text-xs sm:text-sm rounded-xl flex items-center space-x-1.5 shadow-md transition"
              id="add-product-btn"
            >
              <Plus className="w-4 h-4" />
              <span>Add Product</span>
            </button>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-xl">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search products by title, SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-750 rounded-lg text-sm bg-slate-900/60 text-slate-100 focus:border-sky-400 focus:ring-1 focus:ring-sky-400 outline-none transition"
          />
        </div>

        <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 sm:pb-0">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider border transition-all whitespace-nowrap ${
                categoryFilter === cat
                  ? 'bg-[#b8862f] border-[#b8862f] text-white font-bold'
                  : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-850'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Mobile / Responsive Cards List (Visible on small screens) */}
      <div className="block md:hidden space-y-3">
        {filtered.map(product => {
          const isLowStock = product.stock <= 15;
          const isAC = product.sku?.trim().toLowerCase() === 'ac' || product.name?.trim().toLowerCase() === 'ac';
          return (
            <div key={product.id} className="bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-lg space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-slate-900 rounded-lg text-[#b8862f]">
                    <Boxes className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-slate-100 text-sm">{product.name}</span>
                      {isAC && (
                        <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold bg-[#b8862f]/20 border border-[#b8862f]/40 text-[#d4af37] rounded">
                          AC
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="font-mono text-xs font-bold text-[#b8862f]">{product.sku}</span>
                      <span className="text-[10px] text-slate-400">• {product.category}</span>
                    </div>
                  </div>
                </div>
                <span className={`px-2 py-0.5 text-[10px] font-mono border font-semibold rounded-full uppercase tracking-wider shrink-0 ${
                  isLowStock 
                    ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' 
                    : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                }`}>
                  {isLowStock ? 'Reorder' : 'In Stock'}
                </span>
              </div>

              {product.description && (
                <p className="text-xs text-slate-400 line-clamp-2">{product.description}</p>
              )}

              <div className="grid grid-cols-3 gap-2 bg-slate-900/60 p-2.5 rounded-lg text-xs font-mono border border-slate-750">
                <div>
                  <span className="text-slate-500 text-[10px] block">Price</span>
                  <span className="font-bold text-slate-200">₹{(product.price || 0).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">Weight</span>
                  <span className={`font-bold ${isAC ? 'text-amber-400' : 'text-slate-200'}`}>{product.weight} kg</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">Stock</span>
                  <span className={`font-bold ${isLowStock ? 'text-amber-400' : 'text-slate-200'}`}>{product.stock} units</span>
                </div>
              </div>

              {isAdmin && (
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-700/60">
                  <button
                    onClick={() => handleStartEdit(product)}
                    className="flex-1 py-1.5 px-3 bg-slate-700/60 hover:bg-slate-700 border border-slate-600 text-slate-200 hover:text-amber-300 font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 transition"
                    title="Edit Product Details"
                  >
                    <Edit className="w-3.5 h-3.5 text-amber-400" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => handleDeleteProduct(product.id)}
                    className="flex-1 py-1.5 px-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 hover:text-red-300 font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 transition"
                    title="Delete Product"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    <span>Delete</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 text-center text-slate-500 text-xs">
            No products found. {isAdmin ? 'Add a new product to populate the catalog.' : 'No catalog items available.'}
          </div>
        )}
      </div>

      {/* Desktop / Tablet Grid List */}
      <div className="hidden md:block bg-slate-800 rounded-2xl border border-slate-700 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/80 border-b border-slate-700 text-xs font-mono uppercase tracking-wider text-slate-400">
                <th className="px-6 py-4">Item Details</th>
                <th className="px-6 py-4">SKU Code</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Price (₹)</th>
                <th className="px-6 py-4">Weight (kg)</th>
                <th className="px-6 py-4">Warehouse Stock</th>
                <th className="px-6 py-4 text-center">Status</th>
                {isAdmin && <th className="px-6 py-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700 text-slate-300 text-sm">
              {filtered.map(product => {
                const isLowStock = product.stock <= 15;
                const isAC = product.sku?.trim().toLowerCase() === 'ac' || product.name?.trim().toLowerCase() === 'ac';
                return (
                  <tr key={product.id} className="hover:bg-slate-700/30 transition duration-150">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-slate-900 rounded-lg text-[#b8862f]">
                          <Boxes className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-200 block">{product.name}</span>
                            {isAC && (
                              <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold bg-[#b8862f]/20 border border-[#b8862f]/40 text-[#d4af37] rounded">
                                AC
                              </span>
                            )}
                          </div>
                          {product.description && (
                            <span className="text-xs text-slate-400 block truncate max-w-xs">{product.description}</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono font-semibold text-slate-300">{product.sku}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-xs font-semibold text-slate-300">
                        {product.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-sm text-slate-100 font-bold">
                      ₹{(product.price || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-200 font-bold">
                      <span className={isAC ? 'text-amber-400 font-black' : ''}>
                        {product.weight} kg
                      </span>
                      {isAC && <span className="text-[10px] text-amber-500/80 block font-normal">AC Weight: 0.5 kg</span>}
                    </td>
                    <td className="px-6 py-4 font-mono">
                      <div className="flex items-center space-x-2">
                        <span className={`font-bold ${isLowStock ? 'text-amber-400' : 'text-slate-100'}`}>{product.stock} units</span>
                        {isLowStock && <AlertTriangle className="w-4 h-4 text-amber-400" title="Low stock warning" />}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-0.5 text-[10px] font-mono border font-semibold rounded-full uppercase tracking-wider ${
                        isLowStock 
                          ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' 
                          : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                      }`}>
                        {isLowStock ? 'Reorder Alert' : 'In Stock'}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleStartEdit(product)}
                            className="p-1.5 hover:bg-slate-700 text-slate-400 hover:text-amber-400 rounded-lg transition"
                            title="Edit Product Details"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(product.id)}
                            className="p-1.5 hover:bg-slate-700 text-slate-400 hover:text-red-400 rounded-lg transition"
                            title="Delete Product"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 8 : 7} className="px-6 py-12 text-center text-slate-500">
                    No products found. {isAdmin ? 'Add a new product or SKU to populate the catalog.' : 'No catalog items available.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Product Modal Overlay (Admin Only) */}
      {showAdd && isAdmin && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <form onSubmit={handleAddProduct} className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-lg space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Boxes className="w-5 h-5 text-amber-400" />
                <span>{isEditing ? 'Edit Catalog Product' : 'Register New Catalog Product'}</span>
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded font-bold uppercase">
                Admin Mode
              </span>
            </div>
            
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">Product Name *</label>
              <input
                type="text"
                required
                placeholder="e.g., Drone 4K Action Camera Ultra HD"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-sm outline-none focus:border-amber-400"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">SKU Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., ac, DRN-ACT-4K"
                  value={newSKU}
                  onChange={(e) => setNewSKU(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-sm outline-none focus:border-amber-400 font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-300 text-sm outline-none focus:border-amber-400"
                >
                  <option value="Drone Action Cameras">Drone Action Cameras</option>
                  <option value="Water Wash Guns">Water Wash Guns</option>
                  <option value="Gaming Consoles">Gaming Consoles</option>
                  <option value="RC Cars">RC Cars</option>
                  <option value="Projectors">Projectors</option>
                  <option value="Electronics & Gadgets">Electronics & Gadgets</option>
                  <option value="Other / Custom">Other / Custom</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">Price (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="e.g., 1499"
                  value={newPrice}
                  onChange={(e) => setNewPrice(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-sm outline-none focus:border-amber-400 font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">Weight (kg) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="e.g., 0.5"
                  value={newWeight}
                  onChange={(e) => setNewWeight(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-sm outline-none focus:border-amber-400 font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">Warehouse Stock</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={newStock}
                  onChange={(e) => setNewStock(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-sm outline-none focus:border-amber-400 font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">Description (Optional)</label>
              <textarea
                rows={2}
                placeholder="Product description, technical specifications or notes..."
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-sm outline-none focus:border-amber-400 resize-none"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={handleCloseModal}
                className="px-4 py-2 border border-slate-700 rounded-lg text-xs font-bold hover:bg-slate-800 text-slate-300 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-[#b8862f] hover:bg-[#a67527] text-white font-bold text-xs rounded-lg shadow-md transition"
              >
                {isEditing ? 'Save Changes' : 'Register Product SKU'}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
