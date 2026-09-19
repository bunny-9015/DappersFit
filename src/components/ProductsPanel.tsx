/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Search, Plus, Boxes, ArrowUpDown, Tag, AlertTriangle, Edit, Trash2 } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  stock: number;
  weight: number;
}

const INITIAL_PRODUCTS: Product[] = [];

export default function ProductsPanel() {
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
  const [newWeight, setNewWeight] = useState(1.0);

  const handleCloseModal = () => {
    setShowAdd(false);
    setIsEditing(false);
    setEditId(null);
    setNewName('');
    setNewSKU('');
    setNewStock(50);
    setNewWeight(1.0);
    setNewCategory('Drone Action Cameras');
  };

  const handleStartEdit = (product: Product) => {
    setEditId(product.id);
    setIsEditing(true);
    setNewName(product.name);
    setNewSKU(product.sku);
    setNewCategory(product.category);
    setNewWeight(product.weight);
    setNewStock(product.stock);
    setShowAdd(true);
  };

  const handleDeleteProduct = async (id: string) => {
    if (window.confirm('Are you sure you want to permanently delete this product?')) {
      const updated = products.filter(p => p.id !== id);
      setProducts(updated);
      localStorage.setItem('dappersfit_products', JSON.stringify(updated));
      try {
        await fetch(`/api/products/${id}`, {
          method: 'DELETE'
        });
      } catch (err) {
        console.error('Failed to delete product on server:', err);
      }
    }
  };

  const handleClearAllProducts = async () => {
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
    if (!newName || !newSKU) return;

    let targetProduct: Product;

    if (isEditing && editId) {
      targetProduct = {
        id: editId,
        name: newName,
        sku: newSKU,
        category: newCategory,
        stock: Number(newStock),
        weight: Number(newWeight)
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
        weight: Number(newWeight)
      };
      const updated = [targetProduct, ...products];
      setProducts(updated);
      localStorage.setItem('dappersfit_products', JSON.stringify(updated));
    }

    fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(targetProduct)
    }).catch(err => console.error('Failed to save product on server:', err));

    handleCloseModal();
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 font-sans text-slate-100" id="products-panel">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Product Catalog & Stock Registry</h1>
          <p className="text-sm text-slate-400 mt-1">Manage electronics product catalog, custom weight specifications (kg) & parcel stock registry.</p>
        </div>
        <div className="flex items-center gap-2 self-start">
          <button
            onClick={handleClearAllProducts}
            className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-bold text-sm rounded-xl flex items-center space-x-1.5 transition"
            title="Clear all product data"
          >
            <Trash2 className="w-4 h-4" />
            <span>Clear Catalog Data</span>
          </button>
          <button
            onClick={() => { setIsEditing(false); setShowAdd(true); }}
            className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-sm rounded-xl flex items-center space-x-1.5 transition"
            id="add-product-btn"
          >
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
          </button>
        </div>
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

        <div className="flex gap-2 w-full md:w-auto overflow-x-auto">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider border transition-all whitespace-nowrap ${
                categoryFilter === cat
                  ? 'bg-sky-500 border-sky-500 text-slate-950 font-bold'
                  : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-850'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid List */}
      <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/80 border-b border-slate-700 text-xs font-mono uppercase tracking-wider text-slate-400">
                <th className="px-6 py-4">Item Details</th>
                <th className="px-6 py-4">SKU Code</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Weight (kg)</th>
                <th className="px-6 py-4">Warehouse Stock</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700 text-slate-300 text-sm">
              {filtered.map(product => {
                const isLowStock = product.stock <= 15;
                return (
                  <tr key={product.id} className="hover:bg-slate-700/30 transition duration-150">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-slate-900 rounded-lg text-sky-400">
                          <Boxes className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="font-bold text-slate-200 block">{product.name}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono font-semibold text-slate-300">{product.sku}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-xs font-semibold text-slate-300">
                        {product.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-300 font-bold">
                      {product.weight} kg
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
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleStartEdit(product)}
                          className="p-1.5 hover:bg-slate-700 text-slate-400 hover:text-sky-400 rounded-lg transition"
                          title="Edit Product"
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
                  </tr>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    No products found. Add a new electronic product or SKU to populate the catalog.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Product Modal Overlay */}
      {showAdd && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form onSubmit={handleAddProduct} className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md space-y-4">
            <h3 className="text-lg font-bold text-white">{isEditing ? 'Edit Product SKU' : 'Register New Product SKU'}</h3>
            
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">Product Name</label>
              <input
                type="text"
                required
                placeholder="e.g., Drone 4K Action Camera Ultra HD"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-sm outline-none focus:border-sky-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">SKU Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., DRN-ACT-4K"
                  value={newSKU}
                  onChange={(e) => setNewSKU(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-sm outline-none focus:border-sky-400"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-300 text-sm outline-none focus:border-sky-400"
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">Weight (kg)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="e.g., 1.0"
                  value={newWeight}
                  onChange={(e) => setNewWeight(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-sm outline-none focus:border-sky-400"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">Stock (Units)</label>
                <input
                  type="number"
                  required
                  value={newStock}
                  onChange={(e) => setNewStock(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-sm outline-none focus:border-sky-400"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <button
                type="button"
                onClick={handleCloseModal}
                className="px-4 py-2 border border-slate-700 rounded-lg text-xs font-bold hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs rounded-lg"
              >
                {isEditing ? 'Save Changes' : 'Create SKU'}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
