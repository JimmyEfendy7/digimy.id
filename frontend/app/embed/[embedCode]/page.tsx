'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShoppingCart, 
  Package, 
  Phone, 
  User, 
  ChevronRight,
  CheckCircle,
  AlertCircle,
  X,
  ArrowLeft,
  BadgeCheck
} from 'lucide-react';
import { getPublicEmbedCode, processEmbedPurchase } from '@/app/lib/api';
import { extractLabelsFromDescription } from '@/app/lib/formatters';

interface EmbedData {
  id: number;
  embed_code: string;
  title: string;
  is_active: boolean;
  product_id: number;
  product_name: string;
  product_description: string;
  product_image: string;
  product_price: number;
  promo_price?: number | null;
  product_stock?: number;
  category_name?: string | null;
  store_id: number;
  store_name: string;
  store_logo: string;
  store_verified: boolean;
  custom_fields: CustomField[];
  product_reviews?: ProductReview[];
}

interface ProductReview {
  id: number;
  file_url: string;
  file_type: 'image' | 'video';
}

interface CustomField {
  field_name: string;
  field_label: string;
  field_type: 'text' | 'textarea' | 'select' | 'radio';
  field_options?: string[];
  is_required: boolean;
  field_order: number;
}

interface FormData {
  customer_name: string;
  customer_phone: string;
  [key: string]: any;
}

export default function EmbedPage() {
  const { embedCode } = useParams();
  const searchParams = useSearchParams();
  const [embedData, setEmbedData] = useState<EmbedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    customer_name: '',
    customer_phone: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});
  
  // Product media display state
  const [activeImage, setActiveImage] = useState<string | null>(null);
  const [activeVideo, setActiveVideo] = useState<string | null>(null);
  const [isSnapInitialized, setIsSnapInitialized] = useState(false);
  // Thumbnail pagination for media list in purchase form
  const [mediaStart, setMediaStart] = useState(0);
  const mediaWindowSize = 5;

  // After successful payment, close form and auto-hide success banner
  useEffect(() => {
    if (purchaseSuccess) {
      setShowForm(false);
      const t = setTimeout(() => setPurchaseSuccess(false), 5000);
      return () => clearTimeout(t);
    }
  }, [purchaseSuccess]);

  // Helper function to check if promo is active (simplified - only checks promo_price)
  const isPromoActive = (data: EmbedData): boolean => {
    // If promo price exists and is greater than 0, consider it active
    return !!(data.promo_price && data.promo_price > 0);
  };

  // Helper function to get effective price (promo or regular)
  const getEffectivePrice = (data: EmbedData): number => {
    return isPromoActive(data) && data.promo_price ? data.promo_price : data.product_price;
  };

  // Helper function to format currency
  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  useEffect(() => {
    const fetchEmbedData = async () => {
      if (!embedCode) return;

      try {
        setLoading(true);
        const response = await getPublicEmbedCode(embedCode as string);
        
        if (response.success) {
          setEmbedData(response.data);
          
          // Initialize form data with custom fields
          const initialFormData: FormData = {
            customer_name: '',
            customer_phone: ''
          };
          
          response.data.custom_fields?.forEach((field: CustomField) => {
            initialFormData[field.field_name] = '';
          });
          
          setFormData(initialFormData);
        } else {
          setError(response.message || 'Embed code tidak ditemukan');
        }
      } catch (error) {
        console.error('Error fetching embed data:', error);
        setError('Terjadi kesalahan saat memuat data');
      } finally {
        setLoading(false);
      }
    };

    fetchEmbedData();
  }, [embedCode]);

  // Auto-open purchase form when `?buy=1` is present
  useEffect(() => {
    const buy = searchParams?.get('buy');
    if (!embedData) return;
    if (buy && (buy === '1' || buy.toLowerCase() === 'true')) {
      // Only open if embed is active
      if (embedData.is_active) {
        setShowForm(true);
      }
    }
  }, [searchParams, embedData]);

  // Initialize Midtrans Snap script
  useEffect(() => {
    const midtransClientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY;
    const scriptId = 'midtrans-snap';
    
    if (!document.getElementById(scriptId) && !isSnapInitialized) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = process.env.NODE_ENV === 'production'
        ? 'https://app.midtrans.com/snap/snap.js'
        : 'https://app.sandbox.midtrans.com/snap/snap.js';
      script.setAttribute('data-client-key', midtransClientKey || '');
      script.async = true;
      
      script.onload = () => {
        console.log('Midtrans Snap script loaded successfully');
        setIsSnapInitialized(true);
      };
      
      document.head.appendChild(script);
    }
    
    return () => {
      // Cleanup script on unmount
      const existingScript = document.getElementById(scriptId);
      if (existingScript && existingScript.parentNode) {
        existingScript.parentNode.removeChild(existingScript);
      }
    };
  }, [isSnapInitialized]);

  // Media handling functions
  const handleSetActiveImage = (imageUrl: string) => {
    setActiveImage(imageUrl);
    setActiveVideo(null);
  };

  const handleSetActiveVideo = (videoUrl: string) => {
    setActiveVideo(videoUrl);
    setActiveImage(null);
  };

  const validateForm = (): boolean => {
    const errors: {[key: string]: string} = {};
    
    // Validate required fields
    if (!formData.customer_name.trim()) {
      errors.customer_name = 'Nama wajib diisi';
    }
    
    if (!formData.customer_phone.trim()) {
      errors.customer_phone = 'Nomor WhatsApp wajib diisi';
    } else if (!/^(\+62|62|0)[\d-\s]{8,}$/.test(formData.customer_phone.trim())) {
      errors.customer_phone = 'Format nomor WhatsApp tidak valid';
    }
    
    // Validate custom fields
    embedData?.custom_fields?.forEach((field) => {
      if (field.is_required && !formData[field.field_name]?.toString().trim()) {
        errors[field.field_name] = `${field.field_label} wajib diisi`;
      }
    });
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (fieldName: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
    
    // Clear validation error when user starts typing
    if (validationErrors[fieldName]) {
      setValidationErrors(prev => ({
        ...prev,
        [fieldName]: ''
      }));
    }
  };

  // Add refs for status checking
  const statusCheckInterval = useRef<NodeJS.Timeout | null>(null);
  const errorCounter = useRef<number>(0);

  // Function to check transaction status (mirroring main site logic)
  const checkTransactionStatus = async (orderId: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/transactions/status/${orderId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error checking transaction status:', error);
      throw error;
    }
  };

  const handlePurchase = async () => {
    if (!validateForm() || !embedData) return;

    setSubmitting(true);
    try {
      // Calculate effective price (promo price if available)
      const effectivePrice = getEffectivePrice(embedData);
      
      // Create order ID
      const timestamp = new Date().getTime();
      const randomStr = Math.random().toString(36).substring(2, 10);
      const orderId = `EMBED-${timestamp}-${randomStr}`;

      // Get Snap token from Midtrans via backend
      const snapResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/snap/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          order_id: orderId,
          gross_amount: effectivePrice,
          customer_details: {
            first_name: formData.customer_name,
            phone: formData.customer_phone
          },
          item_details: [{
            id: embedData.product_id.toString(),
            name: embedData.product_name,
            price: effectivePrice,
            quantity: 1,
            store_id: embedData.store_id.toString()
          }],
          // Mark as embed purchase
          custom_field1: 'embed_purchase',
          custom_field2: embedCode
        })
      });

      const snapData = await snapResponse.json();
      
      if (!snapData.token) {
        throw new Error('Gagal mendapatkan token pembayaran');
      }

      // Process embed purchase in database
      const purchaseResponse = await processEmbedPurchase(embedCode as string, {
        form_data: formData,
        customer_name: formData.customer_name,
        customer_phone: formData.customer_phone,
        order_id: orderId,
        amount: effectivePrice
      });

      if (!purchaseResponse.success) {
        throw new Error(purchaseResponse.message || 'Gagal membuat transaksi');
      }

      // Start transaction status polling (mirroring main site logic)
      errorCounter.current = 0;
      statusCheckInterval.current = setInterval(async () => {
        try {
          console.log('Checking transaction status for embed:', orderId);
          const result = await checkTransactionStatus(orderId);
          
          // Reset error counter on successful request
          errorCounter.current = 0;
          
          if (result.success && result.data) {
            const transactionStatus = result.data.transaction_status;
            
            console.log(`Transaction status from server: ${transactionStatus}`);
            console.log(`Payment status: ${result.data.payment_status}`);
            
            // Check if status is final
            if (transactionStatus === 'settlement' || 
                transactionStatus === 'capture' || 
                transactionStatus === 'deny' || 
                transactionStatus === 'cancel' || 
                transactionStatus === 'expire') {
              
              // Clear interval
              if (statusCheckInterval.current) {
                clearInterval(statusCheckInterval.current);
                statusCheckInterval.current = null;
              }
              
              // Update status based on result
              if (transactionStatus === 'settlement' || transactionStatus === 'capture') {
                console.log('Payment successful via polling!');
                setPurchaseSuccess(true);
                setShowForm(false);
                setSubmitting(false);
              } else {
                console.log('Payment failed via polling:', transactionStatus);
                setError('Pembayaran gagal atau dibatalkan');
                setSubmitting(false);
              }
            }
          }
        } catch (error) {
          console.error('Error checking transaction status:', error);
          
          // Increment error counter
          errorCounter.current += 1;
          
          // If more than 5 consecutive errors, stop polling
          if (errorCounter.current >= 5) {
            console.warn('Too many polling errors, stopping status check');
            
            if (statusCheckInterval.current) {
              clearInterval(statusCheckInterval.current);
              statusCheckInterval.current = null;
            }
            
            console.log('Polling stopped due to errors, but payment may still be processed');
          }
        }
      }, 3000); // Poll every 3 seconds (same as main site)

      // Initialize Midtrans Snap
      if (typeof window !== 'undefined' && (window as any).snap) {
        (window as any).snap.pay(snapData.token, {
          onSuccess: (result: any) => {
            console.log('Payment success from Snap callback:', result);
            // Don't immediately set success here, let polling handle it
            // This ensures we get the updated status from database
            console.log('Waiting for polling to confirm status...');
          },
          onPending: (result: any) => {
            console.log('Payment pending:', result);
            // Continue polling to check for status updates
          },
          onError: (result: any) => {
            console.error('Payment error:', result);
            
            // Clear polling on error
            if (statusCheckInterval.current) {
              clearInterval(statusCheckInterval.current);
              statusCheckInterval.current = null;
            }
            
            setError('Pembayaran gagal. Silakan coba lagi.');
            setSubmitting(false);
          },
          onClose: () => {
            console.log('Payment popup closed');
            // Don't stop polling here - user might have completed payment
            // Let polling continue to check for status updates
          }
        });
      } else {
        // Fallback: redirect to payment URL if Snap is not available
        if (snapData.redirect_url) {
          window.open(snapData.redirect_url, '_blank');
        }
      }

    } catch (error) {
      console.error('Purchase error:', error);
      setError(error instanceof Error ? error.message : 'Terjadi kesalahan saat memproses pembelian');
      setSubmitting(false);
    }
  };

  // Cleanup polling interval on component unmount
  useEffect(() => {
    return () => {
      if (statusCheckInterval.current) {
        clearInterval(statusCheckInterval.current);
        statusCheckInterval.current = null;
      }
    };
  }, []);

  const renderCustomField = (field: CustomField) => {
    const fieldError = validationErrors[field.field_name];
    
    switch (field.field_type) {
      case 'textarea':
        return (
          <div key={field.field_name} className="space-y-2">
            <label className="block text-sm font-medium text-gray-900">
              {field.field_label}
              {field.is_required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <textarea
              value={formData[field.field_name] || ''}
              onChange={(e) => handleInputChange(field.field_name, e.target.value)}
              rows={3}
              className={`w-full px-3 py-2.5 border rounded-lg bg-white text-gray-900 placeholder:text-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-500 transition ${
                fieldError ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder={`Masukkan ${field.field_label.toLowerCase()}`}
            />
            {fieldError && <p className="text-red-600 text-sm">{fieldError}</p>}
          </div>
        );
        
      case 'select':
        return (
          <div key={field.field_name} className="space-y-2">
            <label className="block text-sm font-medium text-gray-900">
              {field.field_label}
              {field.is_required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <select
              value={formData[field.field_name] || ''}
              onChange={(e) => handleInputChange(field.field_name, e.target.value)}
              className={`w-full px-3 py-2.5 border rounded-lg bg-white text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-500 transition ${
                fieldError ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">Pilih {field.field_label}</option>
              {field.field_options?.map((option, index) => (
                <option key={index} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {fieldError && <p className="text-red-600 text-sm">{fieldError}</p>}
          </div>
        );
        
      case 'radio':
        return (
          <div key={field.field_name} className="space-y-2">
            <label className="block text-sm font-medium text-gray-900">
              {field.field_label}
              {field.is_required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <div className="grid gap-2">
              {field.field_options?.map((option, index) => (
                <label key={index} className={`flex items-center gap-2 rounded-lg border p-2.5 cursor-pointer transition ${formData[field.field_name] === option ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}`}>
                  <input
                    type="radio"
                    name={field.field_name}
                    value={option}
                    checked={formData[field.field_name] === option}
                    onChange={(e) => handleInputChange(field.field_name, e.target.value)}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-900">{option}</span>
                </label>
              ))}
            </div>
            {fieldError && <p className="text-red-600 text-sm">{fieldError}</p>}
          </div>
        );
        
      default: // text
        return (
          <div key={field.field_name} className="space-y-2">
            <label className="block text-sm font-medium text-gray-900">
              {field.field_label}
              {field.is_required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
              type="text"
              value={formData[field.field_name] || ''}
              onChange={(e) => handleInputChange(field.field_name, e.target.value)}
              className={`w-full px-3 py-2.5 rounded-lg border bg-white text-gray-900 placeholder:text-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-500 transition ${
                fieldError ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder={`Masukkan ${field.field_label.toLowerCase()}`}
            />
            {fieldError && <p className="text-red-600 text-sm">{fieldError}</p>}
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Terjadi Kesalahan</h2>
          <p className="text-gray-600 mb-4">{error}</p>
        </div>
      </div>
    );
  }

  if (!embedData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
          <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Produk Tidak Ditemukan</h2>
          <p className="text-gray-600">Embed code yang Anda akses tidak valid atau sudah tidak aktif.</p>
        </div>
      </div>
    );
  }

  // Do not redirect to a separate success page; keep showing the preview

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto p-4">
        {purchaseSuccess && (
          <div className="mb-4 flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-3 text-green-800">
            <CheckCircle className="w-5 h-5 mt-0.5" />
            <div>
              <div className="font-semibold">Pembelian berhasil</div>
              <div className="text-sm">Terima kasih! Detail akan dikirim ke WhatsApp Anda.</div>
            </div>
          </div>
        )}
        <AnimatePresence>
          {!showForm ? (
            // Product Display
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100 max-w-md mx-auto"
            >
              {/* Store Header */}
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  {embedData.store_logo && (
                    <div className="relative w-12 h-12 rounded-full overflow-hidden bg-gray-100">
                      <Image
                        src={`${process.env.NEXT_PUBLIC_BACKEND_URL}/public${embedData.store_logo}`}
                        alt={embedData.store_name}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                  <div>
                    <h3 className="font-bold text-gray-900">{embedData.store_name}</h3>
                    <a 
                      href={process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-green-600 font-medium hover:text-green-700 hover:underline transition-colors cursor-pointer"
                    >
                      Mitra Digipro
                    </a>
                  </div>
                </div>
              </div>

              {/* Product Image - 1:1 Ratio */}
              <div className="relative aspect-square overflow-hidden bg-gray-100">
                {/* Main Product Image with Promo Badge */}
                <div className="relative w-full h-full">
                  {isPromoActive(embedData) && (
                    <div className="absolute top-2 right-2 z-10">
                      <span className="bg-gradient-to-r from-red-500 to-red-600 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg">
                        Promo
                      </span>
                    </div>
                  )}
                  <Image
                    src={`${process.env.NEXT_PUBLIC_BACKEND_URL}/public${embedData.product_image}`}
                    alt={embedData.product_name}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
                {/* Out of Stock Badge */}
                {typeof embedData.product_stock === 'number' && embedData.product_stock <= 0 && (
                  <div className="absolute inset-0 z-20 flex items-center justify-center">
                    <span className="bg-red-600 text-white text-sm md:text-base font-bold px-4 py-2 rounded-full shadow-lg">
                      Stok Habis
                    </span>
                  </div>
                )}
                {/* Overlay gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-80"></div>
              </div>

              {/* Product Info */}
              <div className="p-5">
                {/* Category */}
                <div className="mb-2">
                  <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                    {embedData.category_name || 'Produk Digital'}
                  </span>
                </div>
                
                {/* Product Name */}
                <h1 className="font-bold text-gray-800 mb-2 text-lg line-clamp-2">
                  {embedData.product_name}
                </h1>
                
                {/* Labels from Description - Match ProductCard */}
                {embedData.product_description && (
                  <div className="mb-3">
                    {(() => {
                      const { labels } = extractLabelsFromDescription(embedData.product_description);
                      const maxDisplayedLabels = 2;
                      const hasMoreLabels = labels.length > maxDisplayedLabels;
                      const displayedLabels = labels.slice(0, maxDisplayedLabels);
                      
                      if (labels.length === 0) return null;
                      
                      return (
                        <div className="flex flex-wrap gap-1.5">
                          {displayedLabels.map((label, index) => (
                            <span 
                              key={`label-${index}`} 
                              className="inline-block bg-indigo-50 text-indigo-700 text-xs py-0.5 px-1.5 rounded border border-indigo-100"
                            >
                              {label}
                            </span>
                          ))}
                          {hasMoreLabels && (
                            <span className="inline-block bg-gray-50 text-gray-600 text-xs py-0.5 px-1.5 rounded border border-gray-200">
                              +{labels.length - maxDisplayedLabels} lainnya
                            </span>
                          )}
                        </div>
                      );
                    })()} 
                  </div>
                )}

                {/* Price and Button - Match ProductCard Layout */}
                <div className="pt-3 border-t border-gray-100">
                  <div className="flex justify-between items-center">
                    <div>
                      {isPromoActive(embedData) && embedData.promo_price ? (
                        <div className="flex flex-col">
                          {/* Promo price */}
                          <div className="bg-gradient-to-r from-rose-500 to-red-500 bg-clip-text text-transparent font-bold text-lg">
                            {formatPrice(embedData.promo_price)}
                          </div>
                          {/* Original price with strikethrough */}
                          <div className="text-gray-500 text-xs line-through">
                            {formatPrice(embedData.product_price)}
                          </div>
                        </div>
                      ) : (
                        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent font-bold text-lg">
                          {formatPrice(embedData.product_price)}
                        </div>
                      )}
                    </div>
                    
                    {/* Purchase Button - Match ProductCard */}
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => { if (!(typeof embedData.product_stock === 'number' && embedData.product_stock <= 0)) setShowForm(true); }}
                      disabled={typeof embedData.product_stock === 'number' && embedData.product_stock <= 0}
                      aria-disabled={typeof embedData.product_stock === 'number' && embedData.product_stock <= 0}
                      className={`${typeof embedData.product_stock === 'number' && embedData.product_stock <= 0 ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:shadow-md'} py-2 px-4 rounded-lg transition-shadow flex items-center text-xs font-medium`}
                    >
                      <ShoppingCart className="w-3.5 h-3.5 mr-1.5" />
                      {typeof embedData.product_stock === 'number' && embedData.product_stock <= 0 ? 'Stok Habis' : 'Beli Sekarang'}
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            // Purchase Form (Modern UI)
            <motion.div
              initial={{ opacity: 0, x: 300 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -300 }}
              className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100"
            >
              {/* Form Header */}
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-5">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowForm(false)}
                    className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div>
                    <h3 className="font-semibold text-white/95">Form Pembelian</h3>
                    <p className="text-blue-100 text-sm">{embedData.product_name}</p>
                  </div>
                </div>
               </div>

              {/* Form Content */}
              <div className="p-6">
                {/* Product Media Section */}
                {embedData.product_reviews && embedData.product_reviews.length > 0 && (
                  <div className="mb-6">
                    <h3 className="font-semibold text-gray-900 mb-3">Media Produk</h3>
                    <div className="flex items-center gap-2 mb-3">
                      {(() => {
                        const reviews = embedData.product_reviews || [];
                        const mediaList = [
                          { id: 'main', file_url: embedData.product_image, file_type: 'image' as const, isMain: true },
                          ...reviews.map(r => ({ ...r, isMain: false }))
                        ];
                        const total = mediaList.length;
                        const lastStart = Math.max(0, total - mediaWindowSize);
                        const start = Math.min(mediaStart, lastStart);
                        if (start !== mediaStart) {
                          setMediaStart(start);
                        }
                        const windowItems = mediaList.slice(start, start + mediaWindowSize);

                        return (
                          <>
                            {total > mediaWindowSize && (
                              <button
                                type="button"
                                onClick={() => setMediaStart(s => Math.max(0, s - 1))}
                                disabled={start === 0}
                                className={`px-2 py-2 rounded-md border text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed`}
                                aria-label="Sebelumnya"
                              >
                                <ArrowLeft className="w-4 h-4" />
                              </button>
                            )}

                            <div className="flex gap-2">
                              {windowItems.map((item, index) => {
                                const isActive = item.isMain
                                  ? (!activeImage && !activeVideo)
                                  : (activeImage === (item as any).file_url || activeVideo === (item as any).file_url);
                                const key = item.isMain ? 'main' : String((item as any).id);
                                const onClick = () => {
                                  if (item.isMain) {
                                    setActiveImage(null);
                                    setActiveVideo(null);
                                  } else if ((item as any).file_type === 'video') {
                                    handleSetActiveVideo((item as any).file_url);
                                  } else {
                                    handleSetActiveImage((item as any).file_url);
                                  }
                                };
                                return (
                                  <button
                                    key={key}
                                    onClick={onClick}
                                    className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 relative ${
                                      isActive ? 'border-blue-500' : 'border-gray-200 hover:border-gray-300'
                                    }`}
                                  >
                                    {item.isMain || (item as any).file_type !== 'video' ? (
                                      <Image
                                        src={`${process.env.NEXT_PUBLIC_BACKEND_URL}/public${(item as any).file_url}`}
                                        alt={item.isMain ? 'Product' : `Review ${index + 1}`}
                                        width={64}
                                        height={64}
                                        className="w-full h-full object-cover"
                                        unoptimized
                                      />
                                    ) : (
                                      <>
                                        <video
                                          src={`${process.env.NEXT_PUBLIC_BACKEND_URL}/public${(item as any).file_url}`}
                                          className="w-full h-full object-cover"
                                        />
                                        <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center">
                                          <div className="w-4 h-4 bg-white rounded-full flex items-center justify-center">
                                            <div className="w-0 h-0 border-l-2 border-l-gray-800 border-t-1 border-t-transparent border-b-1 border-b-transparent ml-0.5"></div>
                                          </div>
                                        </div>
                                      </>
                                    )}
                                  </button>
                                );
                              })}
                            </div>

                            {total > mediaWindowSize && (
                              <button
                                type="button"
                                onClick={() => setMediaStart(s => Math.min(lastStart, s + 1))}
                                disabled={start >= lastStart}
                                className={`px-2 py-2 rounded-md border text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed`}
                                aria-label="Berikutnya"
                              >
                                <ChevronRight className="w-4 h-4" />
                              </button>
                            )}
                          </>
                        );
                      })()}
                    </div>

                    {/* Active media preview */}
                    <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 mb-4">
                      {activeVideo ? (
                        <video
                          src={`${process.env.NEXT_PUBLIC_BACKEND_URL}/public${activeVideo}`}
                          className="w-full h-full object-cover"
                          controls
                          autoPlay
                        />
                      ) : (
                        <Image
                          src={activeImage ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/public${activeImage}` : `${process.env.NEXT_PUBLIC_BACKEND_URL}/public${embedData.product_image}`}
                          alt={embedData.product_name}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      )}
                    </div>
                  </div>
                )}

                <motion.div className="space-y-5" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
                  {/* Required Fields */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-900">
                      Nama Lengkap <span className="text-red-500">*</span>
                    </label>
                    <div className={`relative group`}>
                      <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                        <User className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        value={formData.customer_name}
                        onChange={(e) => handleInputChange('customer_name', e.target.value)}
                        className={`w-full pl-10 pr-3 py-2.5 rounded-lg border bg-white text-gray-900 placeholder:text-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-500 transition ${
                          validationErrors.customer_name ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="Masukkan nama lengkap Anda"
                      />
                    </div>
                    {validationErrors.customer_name && (
                      <p className="text-red-600 text-sm">{validationErrors.customer_name}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-900">
                      Nomor WhatsApp <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                        <Phone className="w-4 h-4" />
                      </div>
                      <input
                        type="tel"
                        value={formData.customer_phone}
                        onChange={(e) => handleInputChange('customer_phone', e.target.value)}
                        className={`w-full pl-10 pr-3 py-2.5 rounded-lg border bg-white text-gray-900 placeholder:text-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-500 transition ${
                          validationErrors.customer_phone ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="Contoh: 08123456789"
                      />
                    </div>
                    {validationErrors.customer_phone && (
                      <p className="text-red-600 text-sm">{validationErrors.customer_phone}</p>
                    )}
                  </div>

                  {/* Custom Fields */}
                  {embedData.custom_fields?.map((field) => renderCustomField(field))}
                </motion.div>

                {/* Price Summary */}
                <div className="border-t pt-5 mt-7">
                  <div className="flex justify-between items-center text-lg font-semibold text-gray-900">
                    <span>Total Pembayaran:</span>
                    <span className="text-blue-600 font-bold">
                      Rp {getEffectivePrice(embedData).toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  onClick={handlePurchase}
                  disabled={submitting}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-xl font-semibold mt-6 disabled:opacity-50 disabled:cursor-not-allowed hover:from-blue-700 hover:to-purple-700 shadow-sm hover:shadow transition-all"
                >
                  {submitting ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Memproses...
                    </div>
                  ) : (
                    'Lanjutkan ke Pembayaran'
                  )}
                </button>

                <p className="text-xs text-gray-500 mt-3 text-center">
                  Dengan melanjutkan, Anda menyetujui pembelian produk ini. 
                  Invoice dan detail produk akan dikirim via WhatsApp.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
