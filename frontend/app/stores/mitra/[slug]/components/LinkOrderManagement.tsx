'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { Plus, Link as LinkIcon, Copy, ExternalLink, Package } from 'lucide-react';
import { getStoreEmbedCodes, createEmbedCode, getStoreProducts } from '@/app/lib/api';
import EmbedFormModal from './EmbedFormModal';

interface EmbedCode {
  id: number;
  embed_code: string;
  title: string;
  is_active: boolean;
  product_id: number;
  product_name: string;
  product_image: string;
}

interface Product {
  id: number;
  name: string;
  poster_url: string;
  price: number;
  promo_price?: number | null;
}

interface FormField {
  field_name: string;
  field_label: string;
  field_type: 'text' | 'textarea' | 'select' | 'radio';
  field_options?: string[];
  is_required: boolean;
}

interface LinkOrderManagementProps {
  storeId: string;
  token: string;
}

const LinkOrderManagement: React.FC<LinkOrderManagementProps> = ({ storeId, token }) => {
  const [embedCodes, setEmbedCodes] = useState<EmbedCode[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [copied, setCopied] = useState<string>('');

  const FRONTEND_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || (typeof window !== 'undefined' ? window.location.origin : '');

  const fetchEmbedCodes = async () => {
    try {
      const res = await getStoreEmbedCodes(storeId, token);
      if (res.success) {
        setEmbedCodes(res.data || []);
      }
    } catch (e) {
      console.error('Failed to fetch embed codes:', e);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await getStoreProducts(1, 100, token);
      if (res.success) setProducts(res.data);
    } catch (e) {
      console.error('Failed to fetch products:', e);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchEmbedCodes(), fetchProducts()]);
      setLoading(false);
    };
    init();
  }, [storeId, token]);

  const handleCreate = async (data: { title: string; custom_fields: FormField[]; product_id?: number; }) => {
    try {
      const res = await createEmbedCode(storeId, data, token);
      if (res.success) {
        setShowCreateModal(false);
        await fetchEmbedCodes();
        alert('Link Order berhasil dibuat (menggunakan embed code)!');
      } else {
        alert(res.message || 'Gagal membuat Link Order');
      }
    } catch (e) {
      console.error('Create link order failed:', e);
      alert('Gagal membuat Link Order');
    }
  };

  const buildShareLink = (code: string) => `${FRONTEND_URL}/embed/${code}?buy=1`;

  const copyLink = (code: string) => {
    const url = buildShareLink(code);
    navigator.clipboard.writeText(url);
    setCopied(code);
    setTimeout(() => setCopied(''), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Link Order</h2>
          <p className="text-gray-600">Buat dan bagikan tautan pembelian langsung untuk produk Anda (cocok untuk Story/Profil)</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Buat Link Order
        </button>
      </div>

      <EmbedFormModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreate}
        products={products}
        mode="create"
      />

      {embedCodes.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <LinkIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Belum ada Link Order</h3>
          <p className="text-gray-600 mb-4">Buat tautan pembelian langsung agar pelanggan bisa checkout lebih cepat</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Buat Link Order
          </button>
        </div>
      ) : (
        <div className="grid gap-6">
          {embedCodes.map((item) => (
            <div key={item.id} className="bg-white border border-gray-200 rounded-lg p-5 flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-100">
                  {item.product_image ? (
                    <Image
                      src={`${process.env.NEXT_PUBLIC_BACKEND_URL}/public${item.product_image}`}
                      alt={item.product_name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <Package className="w-8 h-8 text-gray-400 absolute inset-0 m-auto" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{item.title}</h3>
                  <p className="text-gray-600">{item.product_name}</p>
                  <div className="mt-2 text-sm">
                    <span className={`px-2 py-1 rounded-full ${item.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {item.is_active ? 'Aktif' : 'Non-Aktif'}
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-gray-500 break-all">
                    {buildShareLink(item.embed_code)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={buildShareLink(item.embed_code)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                  title="Buka Link"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button
                  onClick={() => copyLink(item.embed_code)}
                  className={`p-2 rounded-lg ${copied === item.embed_code ? 'text-green-600 bg-green-50' : 'text-gray-700 hover:bg-gray-50'}`}
                  title="Salin Link"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LinkOrderManagement;
