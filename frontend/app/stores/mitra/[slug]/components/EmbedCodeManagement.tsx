'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Code, 
  Plus, 
  Edit3, 
  Trash2, 
  Eye, 
  EyeOff, 
  Copy, 
  Check,
  Package,
  Settings,
  ExternalLink,
  AlertTriangle
} from 'lucide-react';
import Image from 'next/image';
import {
  getStoreEmbedCodes,
  createEmbedCode,
  updateEmbedCode,
  deleteEmbedCode,
  toggleEmbedCodeStatus,
  getStoreProducts
} from '@/app/lib/api';
import EmbedFormModal from './EmbedFormModal';

interface EmbedCode {
  id: number;
  embed_code: string;
  title: string;
  is_active: boolean;
  form_config: any;
  created_at: string;
  updated_at: string;
  product_id: number;
  product_name: string;
  product_image: string;
  product_price: number;
  promo_price?: number | null;
  custom_fields: any[];
}

interface Product {
  id: number;
  name: string;
  poster_url: string;
  price: number;
}

interface FormField {
  field_name: string;
  field_label: string;
  field_type: 'text' | 'textarea' | 'select' | 'radio';
  field_options?: string[];
  is_required: boolean;
}

interface EmbedCodeManagementProps {
  storeId: string;
  token: string;
}

const EmbedCodeManagement: React.FC<EmbedCodeManagementProps> = ({ storeId, token }) => {
  const [embedCodes, setEmbedCodes] = useState<EmbedCode[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEmbedCode, setEditingEmbedCode] = useState<EmbedCode | null>(null);
  const [selectedEmbedCode, setSelectedEmbedCode] = useState<EmbedCode | null>(null);
  const [copiedCode, setCopiedCode] = useState<string>('');

  // Helper function to check if promo is active (simplified - only checks promo_price)
  const isPromoActive = (embedCode: EmbedCode): boolean => {
    // If promo price exists and is greater than 0, consider it active
    return !!(embedCode.promo_price && embedCode.promo_price > 0);
  };

  // Helper function to format currency
  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const fetchEmbedCodes = async () => {
    try {
      const response = await getStoreEmbedCodes(storeId, token);
      if (response.success) {
        const normalized = (response.data || []).map((item: any) => {
          let parsedConfig: any = item.form_config;
          if (typeof parsedConfig === 'string') {
            try { parsedConfig = JSON.parse(parsedConfig); } catch { parsedConfig = {}; }
          }
          const customFields = (Array.isArray(item.custom_fields) && item.custom_fields.length > 0)
            ? item.custom_fields
            : (Array.isArray(parsedConfig?.custom_fields) ? parsedConfig.custom_fields : []);
          return {
            ...item,
            form_config: parsedConfig,
            custom_fields: customFields,
            promo_price: item.promo_price ?? null,
          } as EmbedCode;
        });
        setEmbedCodes(normalized);
      }
    } catch (error) {
      console.error('Error fetching embed codes:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await getStoreProducts(1, 100, token); // Get all products with high limit
      if (response.success) {
        // Debug: Log first product to verify promo fields from API
        if (response.data.length > 0) {
          console.log('[DEBUG] fetchProducts - Sample product from API:', {
            id: response.data[0].id,
            name: response.data[0].name,
            price: response.data[0].price,
            promo_price: response.data[0].promo_price,
            promo_start_date: response.data[0].promo_start_date,
            promo_end_date: response.data[0].promo_end_date,
            total_products: response.data.length
          });
        }
        setProducts(response.data);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchEmbedCodes(), fetchProducts()]);
      setLoading(false);
    };
    loadData();
  }, [storeId, token]);

  const handleCreateEmbedCode = async (data: {
    product_id?: number;
    title: string;
    custom_fields: FormField[];
  }) => {
    try {
      const response = await createEmbedCode(storeId, data, token);

      if (response.success) {
        setShowCreateModal(false);
        fetchEmbedCodes();
        alert('Embed code berhasil dibuat!');
      }
    } catch (error) {
      console.error('Error creating embed code:', error);
      alert('Gagal membuat embed code');
    }
  };

  const handleUpdateEmbedCode = async (data: {
    title: string;
    custom_fields: FormField[];
  }) => {
    if (!selectedEmbedCode) return;

    try {
      const response = await updateEmbedCode(storeId, selectedEmbedCode.id.toString(), {
        ...data,
        is_active: selectedEmbedCode.is_active
      }, token);

      if (response.success) {
        setShowEditModal(false);
        setSelectedEmbedCode(null);
        fetchEmbedCodes();
        alert('Embed code berhasil diupdate!');
      }
    } catch (error) {
      console.error('Error updating embed code:', error);
      alert('Gagal mengupdate embed code');
    }
  };

  const handleDeleteEmbedCode = async (embedCodeId: number) => {
    if (!confirm('Yakin ingin menghapus embed code ini?')) return;

    try {
      const response = await deleteEmbedCode(storeId, embedCodeId.toString(), token);
      if (response.success) {
        fetchEmbedCodes();
        alert('Embed code berhasil dihapus!');
      }
    } catch (error) {
      console.error('Error deleting embed code:', error);
      alert('Gagal menghapus embed code');
    }
  };

  const handleToggleStatus = async (embedCode: EmbedCode) => {
    try {
      console.log('Toggling embed code status:', {
        embedCodeId: embedCode.id,
        currentStatus: embedCode.is_active,
        newStatus: !embedCode.is_active
      });
      
      const response = await toggleEmbedCodeStatus(
        storeId, 
        embedCode.id.toString(), 
        !embedCode.is_active, 
        token
      );
      
      console.log('Toggle response:', response);
      
      if (response.success) {
        alert('Status embed code berhasil diubah!');
        fetchEmbedCodes();
      } else {
        console.error('Toggle failed:', response);
        alert(`Gagal mengubah status: ${response.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error toggling embed code status:', error);
      alert('Gagal mengubah status embed code');
    }
  };

  const copyEmbedCode = (embedCode: string) => {
    const fullEmbedCode = `<iframe src="${process.env.NEXT_PUBLIC_FRONTEND_URL}/embed/${embedCode}" width="100%" height="600" frameborder="0"></iframe>`;
    navigator.clipboard.writeText(fullEmbedCode);
    setCopiedCode(embedCode);
    setTimeout(() => setCopiedCode(''), 2000);
  };

  const openEditModal = (embedCode: EmbedCode) => {
    setSelectedEmbedCode(embedCode);
    setShowEditModal(true);
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
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Embed Code</h2>
          <p className="text-gray-600">Buat embed code untuk produk Anda yang dapat ditempel di website lain</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Buat Embed Code
        </button>
      </div>

      {/* Create Modal */}
      <EmbedFormModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateEmbedCode}
        products={products}
        mode="create"
      />

      {/* Edit Modal */}
      <EmbedFormModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedEmbedCode(null);
        }}
        onSubmit={handleUpdateEmbedCode}
        products={products}
        initialData={selectedEmbedCode ? {
          title: selectedEmbedCode.title,
          custom_fields: (selectedEmbedCode.custom_fields && selectedEmbedCode.custom_fields.length > 0)
            ? selectedEmbedCode.custom_fields
            : (selectedEmbedCode.form_config?.custom_fields || []),
          product: {
            id: selectedEmbedCode.product_id,
            name: selectedEmbedCode.product_name,
            poster_url: selectedEmbedCode.product_image,
            price: selectedEmbedCode.product_price,
            promo_price: selectedEmbedCode.promo_price ?? null
          }
        } : undefined}
        mode="edit"
      />

      {/* Embed Codes List */}
      <div className="grid gap-6">
        {embedCodes.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <Code className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Belum ada embed code</h3>
            <p className="text-gray-600 mb-4">Buat embed code pertama Anda untuk produk digital</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
            >
              Buat Embed Code
            </button>
          </div>
        ) : (
          embedCodes.map((embedCode) => (
            <motion.div
              key={embedCode.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-gray-200 rounded-lg p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-4">
                  <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-100">
                    {embedCode.product_image ? (
                      <Image
                        src={`${process.env.NEXT_PUBLIC_BACKEND_URL}/public${embedCode.product_image}`}
                        alt={embedCode.product_name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <Package className="w-8 h-8 text-gray-400 absolute inset-0 m-auto" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{embedCode.title}</h3>
                    <p className="text-gray-600">{embedCode.product_name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {isPromoActive(embedCode) && embedCode.promo_price ? (
                        <>
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                            Promo
                          </span>
                          <span className="text-sm font-semibold text-red-600">
                            {formatPrice(embedCode.promo_price)}
                          </span>
                          <span className="text-sm text-gray-400 line-through">
                            {formatPrice(embedCode.product_price)}
                          </span>
                        </>
                      ) : (
                        <span className="text-sm text-gray-500">
                          {formatPrice(embedCode.product_price)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        embedCode.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {embedCode.is_active ? 'Aktif' : 'Non-Aktif'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {embedCode.custom_fields?.length || 0} field kustom
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleStatus(embedCode)}
                    className={`p-2 rounded-lg transition-colors ${
                      embedCode.is_active
                        ? 'text-green-600 hover:bg-green-50'
                        : 'text-red-600 hover:bg-red-50'
                    }`}
                    title={embedCode.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                  >
                    {embedCode.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => openEditModal(embedCode)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => copyEmbedCode(embedCode.embed_code)}
                    className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                    title="Copy Embed Code"
                  >
                    {copiedCode === embedCode.embed_code ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => handleDeleteEmbedCode(embedCode.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Hapus"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Embed Code Preview */}
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Code className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">Embed Code:</span>
                </div>
                <code className="text-xs text-gray-600 break-all block bg-white p-2 rounded border">
                  {`<iframe src="${process.env.NEXT_PUBLIC_FRONTEND_URL}/embed/${embedCode.embed_code}" width="100%" height="600" frameborder="0"></iframe>`}
                </code>
              </div>

              {/* Preview Button */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.open(`/embed/${embedCode.embed_code}`, '_blank')}
                  className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Preview Embed
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

export default EmbedCodeManagement;
