"use client";

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { Plus, Trash2, Edit, Save, Upload, ToggleLeft, ToggleRight, Loader2 } from 'lucide-react';

import {
  getProductAddons,
  createProductAddon,
  updateProductAddon,
  deleteProductAddon,
} from '../../../../lib/api';

// Reuse product API for store products
// We'll dynamically import to avoid SSR issues where localStorage is used

interface Product {
  id: number;
  name: string;
  poster_url?: string | null;
}

interface AddonItem {
  id: number;
  product_id: number;
  name: string;
  slug: string;
  description?: string | null;
  addon_url?: string | null;
  price: number;
  is_active: 0 | 1 | boolean;
  created_at?: string;
}

export default function AddonManagement() {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [addons, setAddons] = useState<AddonItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingAddon, setEditingAddon] = useState<AddonItem | null>(null);

  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    is_active: true,
  });
  const [file, setFile] = useState<File | null>(null);

  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || '';

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (!token) return;
        const { getStoreProducts } = await import('../../../../lib/api');
        const res = await getStoreProducts(1, 100, token);
        if (res?.success && Array.isArray(res.data)) {
          setProducts(res.data);
          if (res.data.length > 0) {
            setSelectedProductId(res.data[0].id);
          }
        }
      } catch (e) {
        console.error('Failed to load products for addons:', e);
      } finally {
        setLoading(false);
      }
    };
    loadProducts();
  }, []);

  useEffect(() => {
    if (!selectedProductId) return;
    const loadAddons = async () => {
      try {
        setLoading(true);
        const res = await getProductAddons(selectedProductId);
        if (res?.success) {
          setAddons(res.data || []);
        } else {
          setAddons([]);
        }
      } catch (e) {
        console.error('Failed to load addons:', e);
      } finally {
        setLoading(false);
      }
    };
    loadAddons();
  }, [selectedProductId]);

  const selectedProduct = useMemo(
    () => products.find(p => p.id === selectedProductId) || null,
    [products, selectedProductId]
  );

  const resetForm = () => {
    setForm({ name: '', description: '', price: '', is_active: true });
    setFile(null);
    setEditingAddon(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) return;
    if (!form.name || !form.price) {
      alert('Nama dan harga wajib diisi');
      return;
    }
    try {
      setIsSubmitting(true);
      const fd = new FormData();
      fd.append('name', form.name);
      fd.append('description', form.description || '');
      fd.append('price', form.price);
      fd.append('is_active', String(form.is_active));
      if (file) fd.append('addon_url', file);

      let res;
      if (editingAddon) {
        res = await updateProductAddon(selectedProductId, editingAddon.id, fd);
      } else {
        res = await createProductAddon(selectedProductId, fd);
      }

      if (res?.success) {
        await refreshAddons();
        resetForm();
        alert(editingAddon ? 'Addon diperbarui' : 'Addon dibuat');
      } else {
        throw new Error(res?.message || 'Gagal menyimpan addon');
      }
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan');
    } finally {
      setIsSubmitting(false);
    }
  };

  const refreshAddons = async () => {
    if (!selectedProductId) return;
    try {
      const res = await getProductAddons(selectedProductId);
      if (res?.success) setAddons(res.data || []);
    } catch {}
  };

  const handleDelete = async (addon: AddonItem) => {
    if (!selectedProductId) return;
    if (!confirm(`Hapus addon \"${addon.name}\"?`)) return;
    try {
      const res = await deleteProductAddon(selectedProductId, addon.id);
      if (res?.success) {
        setAddons(prev => prev.filter(a => a.id !== addon.id));
      } else {
        throw new Error(res?.message || 'Gagal menghapus addon');
      }
    } catch (e: any) {
      alert(e.message || 'Terjadi kesalahan');
    }
  };

  const toggleActive = async (addon: AddonItem) => {
    if (!selectedProductId) return;
    try {
      const fd = new FormData();
      const current = addon.is_active === 1 || addon.is_active === true;
      fd.append('is_active', String(!current));
      const res = await updateProductAddon(selectedProductId, addon.id, fd);
      if (res?.success) {
        setAddons(prev => prev.map(a => a.id === addon.id ? { ...a, is_active: !current } : a));
      }
    } catch (e) {
      console.error('Failed to toggle addon', e);
    }
  };

  const startEdit = (addon: AddonItem) => {
    setEditingAddon(addon);
    setForm({
      name: addon.name,
      description: addon.description || '',
      price: String(addon.price ?? ''),
      is_active: addon.is_active === 1 || addon.is_active === true,
    });
    setFile(null);
  };

  const addonImageUrl = (addon: AddonItem) => {
    if (!addon.addon_url) return '/product-placeholder.jpg';
    // addon.addon_url is like '/addons/filename', we must prefix /public
    return `${BACKEND_URL}/public${addon.addon_url.startsWith('/') ? addon.addon_url : `/${addon.addon_url}`}`;
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
        <h2 className="text-xl font-bold text-gray-900">Addon ({addons.length})</h2>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-700">Pilih Produk</label>
            <select
              className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white shadow-sm text-sm"
              value={selectedProductId ?? ''}
              onChange={(e) => setSelectedProductId(e.target.value ? Number(e.target.value) : null)}
            >
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Create / Edit Form */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nama Addon</label>
            <input
              type="text"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-gray-900 placeholder-gray-600 bg-white"
              value={form.name}
              onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Contoh: Garansi Tambahan"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Harga</label>
            <input
              type="number"
              min={0}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-gray-900 placeholder-gray-600 bg-white"
              value={form.price}
              onChange={(e) => setForm(f => ({ ...f, price: e.target.value }))}
              placeholder="0"
              required
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Deskripsi</label>
            <textarea
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-gray-900 placeholder-gray-600 bg-white"
              rows={3}
              value={form.description}
              onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Deskripsi singkat addon..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Gambar (opsional)</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-gray-900"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
              className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
            >
              {form.is_active ? <ToggleRight className="w-4 h-4 text-green-600" /> : <ToggleLeft className="w-4 h-4 text-gray-400" />}
              <span className="text-sm">{form.is_active ? 'Aktif' : 'Non Aktif'}</span>
            </button>
          </div>
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={isSubmitting || !selectedProductId}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingAddon ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />)}
              {editingAddon ? 'Simpan Perubahan' : 'Tambah Addon'}
            </button>
            {editingAddon && (
              <button
                type="button"
                onClick={resetForm}
                className="ml-2 inline-flex items-center gap-2 border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 text-gray-700"
              >
                Batal Edit
              </button>
            )}
          </div>
        </form>
      </div>

      {/* List Addons */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Daftar Addon</h3>
        {loading ? (
          <div className="flex justify-center items-center py-8 text-gray-700">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Memuat...
          </div>
        ) : addons.length === 0 ? (
          <div className="text-gray-800 text-sm bg-gray-50 border border-dashed rounded-xl p-6 text-center">
            Belum ada addon untuk produk ini.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {addons.map((a) => (
              <div key={a.id} className="border border-gray-200 rounded-xl overflow-hidden bg-white hover:shadow-md transition-shadow">
                <div className="relative bg-gray-100 aspect-square w-full">
                  <Image
                    src={addonImageUrl(a)}
                    alt={a.name}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-gray-900">{a.name}</div>
                      <div className="text-sm text-gray-900">Rp {Number(a.price || 0).toLocaleString('id-ID')}</div>
                      <div className={`text-xs mt-1 ${a.is_active ? 'text-green-700' : 'text-gray-700'}`}>{(a.is_active === 1 || a.is_active === true) ? 'Aktif' : 'Non Aktif'}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => toggleActive(a)} className="p-2 rounded hover:bg-gray-100" title="Toggle aktif">
                        {(a.is_active === 1 || a.is_active === true) ? <ToggleRight className="w-4 h-4 text-green-600" /> : <ToggleLeft className="w-4 h-4 text-gray-400" />}
                      </button>
                      <button onClick={() => startEdit(a)} className="p-2 rounded hover:bg-gray-100" title="Edit">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(a)} className="p-2 rounded hover:bg-gray-100 text-red-600" title="Hapus">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  {a.description && (
                    <p className="text-sm text-gray-800 mt-2 line-clamp-3">{a.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
