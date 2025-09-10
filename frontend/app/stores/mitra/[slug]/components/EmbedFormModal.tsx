'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Trash2, 
  Package,
  Settings,
  AlertTriangle,
  X
} from 'lucide-react';
import Image from 'next/image';
import { getImageUrl } from '../../../../lib/api';

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

interface EmbedFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    product_id?: number;
    title: string;
    custom_fields: FormField[];
  }) => void;
  products: Product[];
  initialData?: {
    title: string;
    custom_fields: FormField[];
    product?: Product;
  };
  mode: 'create' | 'edit';
}

const EmbedFormModal: React.FC<EmbedFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  products,
  initialData,
  mode
}) => {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(
    initialData?.product || null
  );
  const [embedTitle, setEmbedTitle] = useState(initialData?.title || '');
  const [customFields, setCustomFields] = useState<FormField[]>(
    initialData?.custom_fields || []
  );

  // Keep form state in sync when opening the modal for edit mode
  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit') {
        setSelectedProduct(initialData?.product || null);
        setEmbedTitle(initialData?.title || '');
        setCustomFields(initialData?.custom_fields || []);
      } else if (mode === 'create') {
        // do not override user input on create unless no data present
        if (!selectedProduct && initialData?.product) setSelectedProduct(initialData.product);
        if (!embedTitle && initialData?.title) setEmbedTitle(initialData.title);
        if (customFields.length === 0 && initialData?.custom_fields) setCustomFields(initialData.custom_fields);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, mode, initialData?.product?.id, initialData?.title, JSON.stringify(initialData?.custom_fields)]);

  // Helper function to check if promo is active (simplified - only checks promo_price)
  const isPromoActive = (product: Product): boolean => {
    // If promo price exists and is greater than 0, consider it active
    return !!(product.promo_price && product.promo_price > 0);
  };

  // Helper function to format currency
  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const addCustomField = () => {
    setCustomFields([
      ...customFields,
      {
        field_name: `custom_field_${customFields.length + 1}`,
        field_label: '',
        field_type: 'text',
        is_required: false
      }
    ]);
  };

  const updateCustomField = (index: number, field: Partial<FormField>) => {
    const updatedFields = [...customFields];
    updatedFields[index] = { ...updatedFields[index], ...field };
    setCustomFields(updatedFields);
  };

  const removeCustomField = (index: number) => {
    setCustomFields(customFields.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (mode === 'create' && (!selectedProduct || !embedTitle.trim())) {
      alert('Pilih produk dan masukkan judul embed code');
      return;
    }
    if (mode === 'edit' && !embedTitle.trim()) {
      alert('Masukkan judul embed code');
      return;
    }

    onSubmit({
      product_id: selectedProduct?.id,
      title: embedTitle,
      custom_fields: customFields
    });
  };

  const resetForm = () => {
    setSelectedProduct(null);
    setEmbedTitle('');
    setCustomFields([]);
  };

  const handleClose = () => {
    onClose();
    if (mode === 'create') {
      resetForm();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-gray-900/70 backdrop-blur-sm flex items-start justify-center p-4 z-50 overflow-y-auto py-8"
        >
          <motion.div
            initial={{ scale: 0.98, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.98, opacity: 0 }}
            className="bg-white rounded-xl w-full max-w-2xl my-8 max-h-[calc(100vh-4rem)] overflow-y-auto shadow-2xl animate-fadeIn"
          >
            <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b px-6 py-4 rounded-t-xl flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900">
                {mode === 'create' ? 'Buat Embed Code Baru' : 'Edit Embed Code'}
              </h3>
              <button
                onClick={handleClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="px-6 py-4">
            
            {/* Product Selection - Only for create mode */}
            {mode === 'create' && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pilih Produk *
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto">
                  {products.map((product) => (
                    <div
                      key={product.id}
                      onClick={() => setSelectedProduct(product)}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedProduct?.id === product.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-100">
                          {product.poster_url ? (
                            <Image
                              src={getImageUrl(product.poster_url, 'product')}
                              alt={product.name}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <Package className="w-6 h-6 text-gray-400 absolute inset-0 m-auto" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {product.name}
                          </p>
                          <div className="flex items-center gap-2">
                            {isPromoActive(product) && product.promo_price ? (
                              <>
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                  Promo
                                </span>
                                <span className="text-xs font-semibold text-red-600">
                                  {formatPrice(product.promo_price)}
                                </span>
                                <span className="text-xs text-gray-400 line-through">
                                  {formatPrice(product.price)}
                                </span>
                              </>
                            ) : (
                              <span className="text-xs text-gray-500">
                                {formatPrice(product.price)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Product Info - Only for edit mode */}
            {mode === 'edit' && initialData?.product && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Produk
                </label>
                <div className="p-3 border border-gray-200 rounded-lg bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-100">
                      {initialData.product.poster_url ? (
                        <Image
                          src={getImageUrl(initialData.product.poster_url, 'product')}
                          alt={initialData.product.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <Package className="w-6 h-6 text-gray-400 absolute inset-0 m-auto" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {initialData.product.name}
                      </p>
                      <div className="flex items-center gap-2">
                        {isPromoActive(initialData.product) && initialData.product.promo_price ? (
                          <>
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-800">
                              Promo
                            </span>
                            <span className="text-xs font-semibold text-red-600">
                              {formatPrice(initialData.product.promo_price)}
                            </span>
                            <span className="text-xs text-gray-400 line-through">
                              {formatPrice(initialData.product.price)}
                            </span>
                          </>
                        ) : (
                          <span className="text-xs text-gray-500">
                            {formatPrice(initialData.product.price)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Title Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Judul Embed Code *
              </label>
              <input
                type="text"
                value={embedTitle}
                onChange={(e) => setEmbedTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Contoh: Form Pembelian Produk Premium"
              />
            </div>

            {/* Custom Fields */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700">
                  Field Kustom (Opsional)
                </label>
                <button
                  onClick={addCustomField}
                  className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Tambah Field
                </button>
              </div>
              
              <div className="space-y-3">
                {customFields.map((field, index) => (
                  <div key={index} className="p-3 border border-gray-200 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                      <input
                        type="text"
                        value={field.field_label}
                        onChange={(e) => updateCustomField(index, { field_label: e.target.value })}
                        className="px-3 py-2 border border-gray-300 rounded text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Label field"
                      />
                      <select
                        value={field.field_type}
                        onChange={(e) => updateCustomField(index, { field_type: e.target.value as any })}
                        className="px-3 py-2 border border-gray-300 rounded text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="text">Text</option>
                        <option value="textarea">Textarea</option>
                        <option value="select">Select</option>
                        <option value="radio">Radio</option>
                      </select>
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={field.is_required}
                            onChange={(e) => updateCustomField(index, { is_required: e.target.checked })}
                            className="rounded"
                          />
                          <span className="text-sm">Wajib</span>
                        </label>
                        <button
                          onClick={() => removeCustomField(index)}
                          className="text-red-600 hover:text-red-800 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    {(field.field_type === 'select' || field.field_type === 'radio') && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium text-gray-700">Pilihan:</label>
                          <button
                            type="button"
                            onClick={() => {
                              const currentOptions = field.field_options || [];
                              updateCustomField(index, { 
                                field_options: [...currentOptions, '']
                              });
                            }}
                            className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" />
                            Tambah Pilihan
                          </button>
                        </div>
                        <div className="space-y-2">
                          {(field.field_options || ['']).map((option, optionIndex) => (
                            <div key={optionIndex} className="flex items-center gap-2">
                              <input
                                type="text"
                                value={option}
                                onChange={(e) => {
                                  const newOptions = [...(field.field_options || [])];
                                  newOptions[optionIndex] = e.target.value;
                                  updateCustomField(index, { field_options: newOptions });
                                }}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder={`Pilihan ${optionIndex + 1}`}
                              />
                              {(field.field_options || []).length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newOptions = (field.field_options || []).filter((_, i) => i !== optionIndex);
                                    updateCustomField(index, { field_options: newOptions });
                                  }}
                                  className="text-red-600 hover:text-red-800 p-1"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                        {(!field.field_options || field.field_options.length === 0) && (
                          <p className="text-xs text-gray-500 italic">Klik "Tambah Pilihan" untuk menambahkan opsi</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {customFields.length === 0 && (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <Settings className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600 text-sm">Belum ada field kustom</p>
                  <p className="text-gray-500 text-xs">Klik "Tambah Field" untuk membuat field kustom</p>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="mb-6 p-3 bg-blue-50 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium">Catatan:</p>
                  <ul className="mt-1 list-disc list-inside space-y-1 text-xs">
                    <li>Field "Nama" dan "No. WhatsApp" akan selalu ada secara otomatis</li>
                    <li>Field kustom akan muncul di form pembelian pada embed code</li>
                    <li>Data dari field kustom akan tersimpan dalam riwayat transaksi</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <button
                onClick={handleClose}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                onClick={handleSubmit}
                disabled={
                  (mode === 'create' && (!selectedProduct || !embedTitle.trim())) ||
                  (mode === 'edit' && !embedTitle.trim())
                }
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {mode === 'create' ? 'Buat Embed Code' : 'Update Embed Code'}
              </button>
            </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default EmbedFormModal;
