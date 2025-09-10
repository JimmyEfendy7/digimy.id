"use client";

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, CreditCard, X, AlertCircle, Check } from 'lucide-react';
import { validatePurchaseForm, PurchaseFormValues, PurchaseFormErrors } from '../lib/validators';
import { submitProductPurchase } from '../lib/api';
import { checkTransactionStatus } from '../lib/api-fix';

// Import tipe MidtransResult dari types.d.ts
type MidtransResult = {
  status_code: string;
  status_message: string;
  transaction_id: string;
  order_id: string;
  gross_amount: string;
  payment_type: string;
  transaction_time: string;
  transaction_status: string;
  fraud_status?: string;
  [key: string]: unknown;
};

interface PurchaseFormProps {
  productId: string;
  productName: string;
  productPrice: number;
  productPromoPrice?: number | null;
  storeId?: string;
  onClose: () => void;
  onSuccess: (data: { id: string; status: string; [key: string]: unknown }) => void;
}

declare global {
  interface Window {
    snap: {
      pay: (snapToken: string, options?: {
        onSuccess?: (result: MidtransResult) => void;
        onPending?: (result: MidtransResult) => void;
        onError?: (result: MidtransResult) => void;
        onClose?: () => void;
        language?: string;
        autoCloseDelay?: number;
        selectedPaymentType?: string;
        uiMode?: string;
      }) => void;
      show: () => void;
      hide: () => void;
    };
  }
}

// Interface untuk nilai form
interface FormValues {
  buyer_name: string;
  buyer_phone: string;
  email?: string;
}

const PurchaseForm = ({
  productId,
  productName,
  productPrice,
  productPromoPrice,
  storeId,
  onClose,
  onSuccess
}: PurchaseFormProps) => {
  const [formValues, setFormValues] = useState<PurchaseFormValues>({
    buyer_name: '',
    buyer_phone: '',
  });
  
  const [errors, setErrors] = useState<PurchaseFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});
  const [isSnapInitialized, setIsSnapInitialized] = useState(false);
  
  // Status untuk pelacakan transaksi
  const statusCheckInterval = useRef<NodeJS.Timeout | null>(null);
  const errorCounter = useRef<number>(0);
  
  // Gunakan harga promo jika tersedia
  const finalPrice = productPromoPrice || productPrice;
  
  // Format price to IDR
  const formattedPrice = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(finalPrice);
  
  const formattedOriginalPrice = productPromoPrice ? new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(productPrice) : null;
  
  // Inisialisasi Midtrans Snap
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
      // Bersihkan script jika component unmounted
      const existingScript = document.getElementById(scriptId);
      if (existingScript && existingScript.parentNode) {
        existingScript.parentNode.removeChild(existingScript);
      }
    };
  }, [isSnapInitialized]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormValues(prev => ({
      ...prev,
      [name]: value,
    }));
    
    // Clear error when typing
    if (errors[name as keyof PurchaseFormErrors]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined,
      }));
    }
  };
  
  const handleFocus = (name: string) => {
    setFocusedField(name);
  };
  
  const handleBlur = (name: string) => {
    setFocusedField(null);
    setTouchedFields(prev => ({
      ...prev,
      [name]: true
    }));
    
    // Validate field on blur
    const fieldErrors = validatePurchaseForm({
      ...formValues,
      [name]: formValues[name as keyof PurchaseFormValues]
    });
    
    if (fieldErrors[name as keyof PurchaseFormErrors]) {
      setErrors(prev => ({
        ...prev,
        [name]: fieldErrors[name as keyof PurchaseFormErrors]
      }));
    }
  };
  
  // Cek validitas form
  const isFormValid = () => {
    return Object.keys(validatePurchaseForm(formValues)).length === 0;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Mark all fields as touched
    const allTouched = Object.keys(formValues).reduce((acc, key) => {
      acc[key] = true;
      return acc;
    }, {} as Record<string, boolean>);
    setTouchedFields(allTouched);
    
    // Form validation
    const validationErrors = validatePurchaseForm(formValues);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      
      // Focus first error field
      const firstErrorField = Object.keys(validationErrors)[0];
      const element = document.getElementById(firstErrorField);
      if (element) element.focus();
      
      return;
    }
    
    setIsSubmitting(true);
    setSubmitError('');
    
    try {
      // Buat ID order unik
      const timestamp = new Date().getTime();
      const randomStr = Math.random().toString(36).substring(2, 10);
      const newOrderId = `ORDER-${timestamp}-${randomStr}`;
      
      // Submit purchase data dengan finalPrice, bukan productPrice
      const response = await submitProductPurchase(productId, {
        ...formValues,
        product_id: productId,
        price: finalPrice, // Gunakan final price
        product_name: productName,
        store_id: storeId
      });
      
      if (response.success) {
        // Simpan order ID untuk pengecekan status
        const orderId = response.data?.id || newOrderId;
        
        // Mulai pengecekan status
        // Setel ulang penghitung error
        errorCounter.current = 0;
        
        // Buat interval untuk memeriksa status transaksi
        statusCheckInterval.current = setInterval(async () => {
          try {
            // Periksa status transaksi
            const result = await checkTransactionStatus(orderId);
            console.log('Hasil pemeriksaan status:', result);
            
            // Reset penghitung error pada permintaan sukses
            errorCounter.current = 0;
            
            if (result.success && result.data) {
              const transactionStatus = result.data.transaction_status;
              
              // Tambahkan log untuk membantu debug
              console.log(`Status transaksi dari server: ${transactionStatus}`);
              console.log(`Payment status: ${result.data.payment_status}`);
              
              // Periksa status dari webhook (gunakan variabel yang ada)
              console.log('Memeriksa status terbaru dari server...');
              
              // Jika status transaksi sudah final, hentikan pemeriksaan
              if (transactionStatus === 'settlement' || 
                  transactionStatus === 'capture' || 
                  transactionStatus === 'deny' || 
                  transactionStatus === 'cancel' || 
                  transactionStatus === 'expire') {
                
                // Bersihkan interval
                if (statusCheckInterval.current) {
                  clearInterval(statusCheckInterval.current);
                  statusCheckInterval.current = null;
                }
                
                // Update status berdasarkan hasil
                if (transactionStatus === 'settlement' || transactionStatus === 'capture') {
                  // Pembayaran berhasil
                  onSuccess({
                    id: orderId,
                    status: 'success',
                    transaction_id: result.data.transaction_id,
                    payment_type: result.data.payment_type,
                    transactionStatus: transactionStatus,
                    gross_amount: result.data.amount // Gunakan amount sebagai pengganti gross_amount
                  });
                } else {
                  // Pembayaran gagal atau dibatalkan
                  onSuccess({
                    id: orderId,
                    status: 'failed',
                    payment_type: result.data.payment_type || 'Pembayaran gagal',
                    transactionStatus: transactionStatus
                  });
                }
              } else if (transactionStatus === 'pending') {
                // Untuk status pending, tetap update data tapi jangan tutup modal
                onSuccess({
                  id: orderId,
                  status: 'pending',
                  payment_type: result.data.payment_type || 'Menunggu pembayaran',
                  transactionStatus: transactionStatus,
                  payment_url: result.data.payment_url,
                  payment_token: result.data.payment_token
                });
              }
            }
          } catch (error) {
            console.error('Error memeriksa status transaksi:', error);
            
            // Tambah penghitung error
            errorCounter.current += 1;
            
            // Jika lebih dari 5 error berturut-turut, hentikan pemeriksaan
            if (errorCounter.current >= 5) {
              console.warn('Terlalu banyak error, menghentikan pemeriksaan status');
              
              if (statusCheckInterval.current) {
                clearInterval(statusCheckInterval.current);
                statusCheckInterval.current = null;
                
                // Tetap tampilkan info transaksi meskipun pengecekan gagal
                onSuccess({
                  id: orderId,
                  status: 'pending',
                  payment_type: 'Menunggu pembayaran',
                  transactionStatus: 'pending',
                  message: 'Status tidak dapat diperiksa, silakan refresh halaman untuk cek status terbaru'
                });
              }
            }
          }
        }, 8000); // Meningkatkan interval dari 5 detik menjadi 8 detik
        
        // Jika menggunakan Midtrans, trigger Snap payment
        if (response.data?.snap_token && window.snap && isSnapInitialized) {
          window.snap.pay(response.data.snap_token, {
            onSuccess: function(result: MidtransResult) {
              console.log('Pembayaran berhasil:', result);
              onSuccess({
                id: orderId,
                status: 'success',
                transaction_id: result.transaction_id,
                payment_type: result.payment_type,
                transactionStatus: result.transaction_status,
                gross_amount: result.gross_amount
              });
              // Bersihkan interval pengecekan setelah pembayaran sukses
              if (statusCheckInterval.current) {
                clearInterval(statusCheckInterval.current);
              }
              setIsSubmitting(false);
            },
            onPending: function(result: MidtransResult) {
              console.log('Pembayaran pending:', result);
              onSuccess({
                id: orderId,
                status: 'pending',
                transaction_id: result.transaction_id,
                payment_type: result.payment_type,
                transactionStatus: result.transaction_status,
                gross_amount: result.gross_amount
              });
              setIsSubmitting(false);
            },
            onError: function(result: MidtransResult) {
              console.error('Pembayaran gagal:', result);
              setSubmitError('Pembayaran gagal. Silakan coba lagi.');
              setIsSubmitting(false);
            },
            onClose: function() {
              console.log('Customer menutup popup tanpa menyelesaikan pembayaran');
              
              // Tampilkan link pembayaran alternatif jika ada
              if (response.data?.payment_url || response.data?.payment_link) {
                console.log('Menyediakan URL pembayaran alternatif:', response.data.payment_url || response.data.payment_link);
              }
              
              // Kirim status pending saat user menutup popup
              onSuccess({
                id: orderId,
                status: 'pending',
                transactionStatus: 'pending',
                payment_type: 'Menunggu pembayaran',
                payment_url: response.data?.payment_url || response.data?.payment_link,
                payment_token: response.data?.payment_token || response.data?.snap_token
              });
              setIsSubmitting(false);
            },
            language: 'id'
          });
        } else {
          // Fallback jika tidak ada snap token atau Snap belum dimuat
          if (response.data) {
            onSuccess({...response.data, id: orderId, status: response.data.status || 'pending'});
          } else {
            // Jika tidak ada data, buat minimal objek yang diperlukan
            onSuccess({id: orderId, status: 'error'});
          }
        }
      } else {
        setSubmitError(response.error || 'Terjadi kesalahan saat memproses pembelian');
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error('Error submitting purchase:', error);
      setSubmitError('Terjadi kesalahan saat memproses pembelian. Silakan coba lagi.');
      setIsSubmitting(false);
    }
  };
  
  // Variants for animations
  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.3 } }
  };
  
  const formVariants = {
    hidden: { opacity: 0, y: 50, scale: 0.95 },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1, 
      transition: { 
        type: "spring", 
        stiffness: 300,
        damping: 25,
        delay: 0.1
      }
    },
    exit: { 
      opacity: 0, 
      y: 20, 
      scale: 0.95, 
      transition: { duration: 0.2 } 
    }
  };
  
  const inputVariants = {
    focused: { 
      boxShadow: "0 0 0 3px rgba(99, 102, 241, 0.3)",
      borderColor: "#6366F1",
      scale: 1.01,
    },
    filled: {
      borderColor: "#D1D5DB",
      scale: 1
    },
    error: {
      boxShadow: "0 0 0 3px rgba(239, 68, 68, 0.2)",
      borderColor: "#EF4444",
      scale: 1
    }
  };
  
  // Close modal on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);
  
  return (
    <AnimatePresence>
      <motion.div 
        initial="hidden"
        animate="visible"
        exit="hidden"
        variants={overlayVariants}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div 
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={formVariants}
          className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-5 flex justify-between items-center">
            <motion.div 
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="flex items-center text-white"
            >
              <ShoppingBag className="mr-3 h-5 w-5" />
              <h2 className="text-lg font-bold">Form Pembelian Produk Digital</h2>
            </motion.div>
            <motion.button 
              whileHover={{ rotate: 90, scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="text-white/90 hover:text-white p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              aria-label="Tutup"
            >
              <X className="h-5 w-5" />
            </motion.button>
          </div>
          
          {/* Product Info */}
          <motion.div 
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-100"
          >
            <h3 className="font-medium text-gray-800 mb-1">{productName}</h3>
            {productPromoPrice ? (
              <div className="flex items-center gap-2">
                <div className="text-xl font-bold bg-gradient-to-r from-rose-500 to-red-600 bg-clip-text text-transparent">{formattedPrice}</div>
                <div className="text-sm text-gray-500 line-through">{formattedOriginalPrice}</div>
              </div>
            ) : (
            <div className="text-xl font-bold bg-gradient-to-r from-indigo-700 to-purple-700 bg-clip-text text-transparent">{formattedPrice}</div>
            )}
          </motion.div>
          
          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <AnimatePresence>
              {submitError && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-start"
                >
                  <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                  <span>{submitError}</span>
                </motion.div>
              )}
            </AnimatePresence>
            
            <div>
              <motion.label 
                initial={{ x: -10, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                htmlFor="buyer_name" 
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                Nama Lengkap
              </motion.label>
              <motion.div 
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="relative"
              >
                <motion.input
                  type="text"
                  id="buyer_name"
                  name="buyer_name"
                  value={formValues.buyer_name}
                  onChange={handleChange}
                  onFocus={() => handleFocus('buyer_name')}
                  onBlur={() => handleBlur('buyer_name')}
                  variants={inputVariants}
                  animate={
                    errors.buyer_name && touchedFields.buyer_name
                      ? "error"
                      : focusedField === 'buyer_name'
                      ? "focused"
                      : "filled"
                  }
                  className={`w-full px-4 py-3 bg-white text-gray-800 font-medium border ${
                    errors.buyer_name && touchedFields.buyer_name
                      ? 'border-red-300 bg-red-50/50'
                      : 'border-gray-300'
                  } rounded-xl focus:outline-none transition-all duration-200`}
                  placeholder="Masukkan nama lengkap Anda"
                />
                {formValues.buyer_name && !errors.buyer_name && touchedFields.buyer_name && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-3.5 right-3 h-5 w-5 rounded-full bg-green-500 flex items-center justify-center"
                  >
                    <Check className="h-3 w-3 text-white" />
                  </motion.div>
                )}
              </motion.div>
              <AnimatePresence>
                {errors.buyer_name && touchedFields.buyer_name && (
                  <motion.p 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mt-1.5 text-sm text-red-600 flex items-center"
                  >
                    <AlertCircle className="h-3.5 w-3.5 mr-1 flex-shrink-0" />
                    {errors.buyer_name}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
            
            <div>
              <motion.label 
                initial={{ x: -10, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
                htmlFor="buyer_phone" 
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                Nomor WhatsApp Aktif
              </motion.label>
              <motion.div 
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="relative"
              >
                <motion.input
                  type="tel"
                  id="buyer_phone"
                  name="buyer_phone"
                  value={formValues.buyer_phone}
                  onChange={handleChange}
                  onFocus={() => handleFocus('buyer_phone')}
                  onBlur={() => handleBlur('buyer_phone')}
                  variants={inputVariants}
                  animate={
                    errors.buyer_phone && touchedFields.buyer_phone
                      ? "error"
                      : focusedField === 'buyer_phone'
                      ? "focused"
                      : "filled"
                  }
                  className={`w-full px-4 py-3 bg-white text-gray-800 font-medium border ${
                    errors.buyer_phone && touchedFields.buyer_phone
                      ? 'border-red-300 bg-red-50/50'
                      : 'border-gray-300'
                  } rounded-xl focus:outline-none transition-all duration-200`}
                  placeholder="Contoh: 081234567890"
                />
                {formValues.buyer_phone && !errors.buyer_phone && touchedFields.buyer_phone && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-3.5 right-3 h-5 w-5 rounded-full bg-green-500 flex items-center justify-center"
                  >
                    <Check className="h-3 w-3 text-white" />
                  </motion.div>
                )}
              </motion.div>
              <AnimatePresence>
                {errors.buyer_phone && touchedFields.buyer_phone && (
                  <motion.p 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mt-1.5 text-sm text-red-600 flex items-center"
                  >
                    <AlertCircle className="h-3.5 w-3.5 mr-1 flex-shrink-0" />
                    {errors.buyer_phone}
                  </motion.p>
                )}
              </AnimatePresence>
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="mt-1.5 text-xs text-gray-500"
              >
                Nomor ini akan digunakan untuk mengirimkan konfirmasi dan detail produk digital
              </motion.p>
            </div>
            
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.9 }}
              className="pt-4"
            >
              <motion.button
                whileHover={{ scale: 1.02, boxShadow: "0 10px 25px -5px rgba(99, 102, 241, 0.4)" }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={isSubmitting}
                className={`w-full py-3.5 px-4 rounded-xl ${
                  isFormValid() ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700' : 'bg-gradient-to-r from-indigo-400 to-purple-400'
                } text-white font-medium flex items-center justify-center shadow-lg transition-all duration-300`}
              >
                {isSubmitting ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                    className="flex items-center"
                  >
                    <div className="h-5 w-5 border-2 border-t-transparent border-white rounded-full mr-2"></div>
                    Memproses...
                  </motion.div>
                ) : (
                  <>
                    <CreditCard className="h-5 w-5 mr-2" />
                    Lanjutkan ke Pembayaran
                  </>
                )}
              </motion.button>
            </motion.div>
            
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="text-center text-xs text-gray-500 mt-4"
            >
              Dengan melanjutkan, Anda menyetujui syarat dan ketentuan pembelian produk digital DIGIPRO
            </motion.p>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PurchaseForm; 