"use client";

import React from 'react';
import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Check, Copy, X, ExternalLink } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { MidtransResult, openMidtransSnap, loadMidtransSnap, cleanupMidtransElements } from '../lib/midtransHelper';

interface PurchaseStatusProps {
  transactionId: string;
  productName: string;
  status: string;
  paymentMethod?: string;
  amount: number;
  onClose: () => void;
  transactionStatus?: string;
  payment_url?: string;
  payment_token?: string;
  productId?: string;
}

// Definisi tipe MidtransResult
type MidtransResult = {
  status_code: string;
  status_message: string;
  transaction_id?: string;
  order_id?: string;
  gross_amount?: string;
  payment_type?: string;
  transaction_time?: string;
  transaction_status?: string;
  fraud_status?: string;
  [key: string]: unknown;
};

const PurchaseStatus = ({
  transactionId,
  productName,
  status,
  paymentMethod = 'Menunggu pembayaran',
  amount,
  onClose,
  transactionStatus,
  payment_url,
  payment_token,
  productId
}: PurchaseStatusProps) => {
  const router = useRouter();
  // State untuk mengetahui apakah popup sedang terbuka
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  // Tambahkan ref untuk debounce
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Debug log di awal komponen
  useEffect(() => {
    console.log('=== PurchaseStatus Debug ===');
    console.log('payment_token:', payment_token);
    console.log('payment_url:', payment_url);
    console.log('transactionStatus:', transactionStatus);
    console.log('status:', status);
    
    // Log khusus untuk debug token
    if (!payment_token || payment_token.trim() === '') {
      console.warn('⚠️ Token Midtrans tidak tersedia');
    } else {
      console.log('✅ Token Midtrans tersedia:', payment_token);
    }
  }, [payment_token, payment_url, transactionStatus, status]);
  
  // Format price to IDR
  const formattedAmount = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
  
  // Auto close if payment successful
  useEffect(() => {
    const timer: NodeJS.Timeout | null = null;
    
    // Nonaktifkan penutupan otomatis
    // Komentar kode di bawah untuk menonaktifkan penutupan otomatis
    /*
    if (status === 'success') {
      timer = setInterval(() => {
        setCloseCounter(prev => {
          if (prev <= 1) {
            clearInterval(timer as NodeJS.Timeout);
            setTimeout(() => {
              onClose();
            }, 100);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    */
    
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [status, onClose]);
  
  // Muat script Midtrans Snap jika belum dimuat
  const loadMidtransSnap = () => {
    return new Promise<void>((resolve, reject) => {
      if (window.snap) {
        console.log('Midtrans Snap sudah dimuat sebelumnya');
        resolve();
        return;
      }
      
      // Dapatkan Midtrans client key dari env
      const midtransClientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY;
      const scriptId = 'midtrans-snap';
      
      // Periksa apakah script sudah ada
      if (document.getElementById(scriptId)) {
        console.log('Midtrans script element sudah ada, menunggu loading...');
        resolve();
        return;
      }
      
      // Tentukan URL script berdasarkan environment
      const scriptUrl = process.env.NODE_ENV === 'production'
        ? 'https://app.midtrans.com/snap/snap.js'
        : 'https://app.sandbox.midtrans.com/snap/snap.js';
        
      console.log('Memuat Midtrans Snap script dari:', scriptUrl);
      
      // Buat element script baru
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = scriptUrl;
      script.setAttribute('data-client-key', midtransClientKey || '');
      script.async = true;
      
      // Fungsi callback
      script.onload = () => {
        console.log('Midtrans Snap script berhasil dimuat');
        resolve();
      };
      
      script.onerror = (error) => {
        console.error('Gagal memuat Midtrans Snap script:', error);
        reject(new Error('Gagal memuat script Midtrans'));
      };
      
      // Tambahkan script ke dokumen
      document.head.appendChild(script);
    });
  };
  
  // Deteksi ketersediaan Snap
  useEffect(() => {
    const checkSnapLoaded = () => {
      if (window.snap) {
        console.log('Midtrans Snap berhasil dideteksi');
        return true;
      }
      return false;
    };
    
    // Check if Snap is already loaded
    if (!checkSnapLoaded()) {
      // Load Midtrans snap jika belum tersedia
      loadMidtransSnap()
        .then(() => {
          console.log('Snap loaded successfully');
        })
        .catch(error => {
          console.error('Failed to load Snap:', error);
        });
    }
    
    // Cleanup - reset popup status when component unmounts
    return () => {
      setIsPopupOpen(false);
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  
  // Deskripsi status transaksi Midtrans
  const getMidtransStatusDesc = () => {
    if (!transactionStatus) return null;
    
    switch(transactionStatus) {
      case 'settlement':
      case 'capture':
        return 'Pembayaran telah diselesaikan';
      case 'pending':
        return 'Menunggu pembayaran dari pembeli';
      case 'deny':
        return 'Transaksi ditolak';
      case 'cancel':
        return 'Transaksi dibatalkan';
      case 'expire':
        return 'Transaksi telah kedaluwarsa';
      default:
        return transactionStatus;
    }
  };
  
  // Mendapatkan status transaksi yang sesungguhnya
  const getActualStatus = () => {
    // Gunakan transactionStatus jika ada (dari API)
    if (transactionStatus) {
      if (['settlement', 'capture', 'success'].includes(transactionStatus)) {
        return 'success';
      }
      if (['pending', 'waiting'].includes(transactionStatus)) {
        return 'pending';
      }
      if (['expire', 'failure', 'cancel', 'deny'].includes(transactionStatus)) {
        return 'failed';
      }
    }
    
    // Fallback ke status dari props
    return status;
  };
  
  // State untuk menyimpan actual status transaksi
  const [actualStatus, setActualStatus] = useState(getActualStatus());
  
  // Periksa metode pembayaran
  const displayPaymentMethod = () => {
    // Jika metode pembayaran kosong, atau "Menunggu pembayaran" maka tampilkan "Belum ada metode pembayaran"
    if (!paymentMethod || paymentMethod === 'Menunggu pembayaran') {
      return 'Belum ada metode pembayaran';
    }
    
    // Jika ada metode pembayaran yang dipilih, tampilkan
    return paymentMethod;
  };
  
  // Periksa apakah harus menampilkan tombol lanjutkan pembayaran
  const shouldShowContinuePayment = () => {
    return actualStatus === 'pending';
  };
  
  // Periksa apakah ada metode pembayaran yang tersedia
  const hasPaymentMethod = () => {
    // Cek lebih detail saat tidak ada payment method
    if (!payment_token && !payment_url) {
      console.warn('⚠️ Tidak ada metode pembayaran yang tersedia (token atau URL)');
      return false;
    }
    
    const hasToken = payment_token && payment_token.trim() !== '';
    const hasUrl = payment_url && payment_url.trim() !== '';
    
    console.log(`Metode pembayaran tersedia: token=${hasToken}, url=${hasUrl}`);
    return hasToken || hasUrl;
  };
  
  // Handler untuk tombol lanjutkan pembayaran yang langsung mengarah ke Snap Midtrans
  const handleContinuePayment = async () => {
    // Cegah multiple klik
    if (isPopupOpen) {
      console.log('Popup sudah terbuka, menghindari multiple call ke snap.pay');
      return; // Jangan lanjutkan jika popup sudah terbuka
    }
    
    // Debounce untuk mencegah multiple klik
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    debounceTimerRef.current = setTimeout(async () => {
      // Jika tidak ada token, coba gunakan URL pembayaran
      if (!payment_token || payment_token.trim() === '') {
        if (payment_url && payment_url.trim() !== '') {
          console.log('Token tidak tersedia, menggunakan payment_url sebagai fallback');
          window.open(payment_url, '_blank');
          return;
        }
        alert('Token pembayaran tidak tersedia. Silakan coba lakukan pembayaran dari awal.');
        return;
      }
      
      // Set flag bahwa popup sedang terbuka
      setIsPopupOpen(true);
      
      try {
        // Gunakan helper untuk membuka Snap Midtrans dengan penanganan error yang lebih baik
        const result = await openMidtransSnap(
          payment_token,
          {
            onSuccess: function(result) {
              console.log('Pembayaran berhasil:', result);
              setActualStatus('success');
            },
            onPending: function(result) {
              console.log('Pembayaran pending:', result);
            },
            onError: function(result) {
              console.error('Pembayaran error:', result);
              alert('Terjadi kesalahan: ' + result.status_message);
            },
            onClose: function() {
              console.log('Popup ditutup tanpa menyelesaikan pembayaran');
            },
            language: 'id'
          },
          payment_url // URL fallback jika snap.pay gagal
        );
        
        console.log('Hasil pembayaran:', result);
        
        // Reset flag popup
        setIsPopupOpen(false);
        
        // Handle status jika ada perubahan
        if (result.result && 
            (result.result.transaction_status === 'settlement' || 
             result.result.transaction_status === 'capture')) {
          setActualStatus('success');
        }
      } catch (error) {
        console.error('Error dalam handleContinuePayment:', error);
        setIsPopupOpen(false);
        
        // Fallback ke URL pembayaran
        if (payment_url && payment_url.trim() !== '') {
          window.open(payment_url, '_blank');
        } else {
          alert('Tidak dapat memproses pembayaran. Silakan coba lagi nanti.');
        }
      }
    }, 300); // Debounce 300ms
  };
  
  // Variants for animations
  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.3 } }
  };
  
  const containerVariants = {
    hidden: { opacity: 0, y: 50, scale: 0.95 },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1, 
      transition: { type: "spring", stiffness: 300, damping: 25 }
    },
    exit: { 
      opacity: 0, 
      y: 20, 
      scale: 0.95, 
      transition: { duration: 0.2 } 
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
  
  // Handler untuk tombol kembali
  const handleBackButton = () => {
    if (actualStatus === 'success' && productId) {
      // Jika pembayaran berhasil dan productId tersedia, arahkan ke halaman produk
      onClose(); // Tutup modal dahulu
      router.push(`/products/${productId}`); // Navigasi ke halaman produk
    } else {
      // Jika tidak, hanya tutup modal
      onClose();
    }
  };
  
  // Tambahkan fungsi untuk membersihkan elemen Midtrans dari DOM
  const cleanupMidtransElements = () => {
    try {
      // Cari semua elemen yang berkaitan dengan Midtrans Snap
      const snapElements = document.querySelectorAll('.snap-container, #snap-container, [id^="snap-midtrans"], iframe[src*="midtrans"]');
      if (snapElements.length === 0) return;
      
      console.log(`Menemukan ${snapElements.length} elemen Midtrans untuk dibersihkan`);
      
      // Hapus elemen satu per satu
      snapElements.forEach(element => {
        try {
          const elementId = element.id || 'unnamed';
          console.log(`Menghapus elemen Midtrans: ${elementId}`);
          element.remove();
        } catch (removeError) {
          console.error('Gagal menghapus elemen Midtrans:', removeError);
        }
      });
    } catch (error) {
      console.error('Error saat membersihkan elemen Midtrans:', error);
    }
  };

  // Panggil cleanup saat komponen unmount
  useEffect(() => {
    return () => {
      // Cleanup saat komponen unmount
      if (typeof window.snap?.hide === 'function') {
        try {
          console.log('Menutup Snap popup (komponen unmount)');
          window.snap.hide();
        } catch (hideError) {
          console.error('Error saat menutup Snap popup:', hideError);
        }
      }
      
      // Bersihkan elemen Midtrans dari DOM
      cleanupMidtransElements();
      
      // Reset state
      setIsPopupOpen(false);
      
      // Clear timeout
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);
  
  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      exit="hidden"
      variants={overlayVariants}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
    >
      <motion.div 
        initial="hidden"
        animate="visible"
        exit="exit"
        variants={containerVariants}
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6">
          <div className="flex flex-col text-white">
            <div className="flex items-center">
              <ShieldCheck className="h-6 w-6 mr-2" />
              <h2 className="text-xl font-bold">Status Transaksi</h2>
            </div>
            <p className="mt-1 text-white/80 text-sm">
              ID: {transactionId}
            </p>
          </div>
        </div>
        
        {/* Status */}
        <div className="p-6">
          <div className={`rounded-xl p-4 mb-6 flex items-center ${
            actualStatus === 'success' 
              ? 'bg-green-50 text-green-700' 
              : actualStatus === 'pending' 
                ? 'bg-amber-50 text-amber-700'
                : 'bg-red-50 text-red-700'
          }`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${
              actualStatus === 'success' 
                ? 'bg-green-100' 
                : actualStatus === 'pending' 
                  ? 'bg-amber-100'
                  : 'bg-red-100'
            }`}>
              {actualStatus === 'success' ? (
                <Check className="h-5 w-5" />
              ) : actualStatus === 'pending' ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
                  className="h-5 w-5 border-2 border-t-transparent border-amber-500 rounded-full"
                />
              ) : (
                <X className="h-5 w-5" />
              )}
            </div>
            <div>
              <h3 className="font-medium text-lg">
                {actualStatus === 'success' 
                  ? 'Pembayaran Berhasil' 
                  : actualStatus === 'pending' 
                    ? 'Menunggu Pembayaran'
                    : 'Pembayaran Gagal'}
              </h3>
              <p className="text-sm opacity-80">
                {actualStatus === 'success' 
                  ? 'Produk digital telah dikirimkan ke nomor WhatsApp Anda' 
                  : actualStatus === 'pending' 
                    ? (hasPaymentMethod() ? 'Silakan selesaikan pembayaran Anda' : 'Silakan pilih metode pembayaran') 
                    : 'Transaksi tidak dapat diproses'}
              </p>
            </div>
          </div>
          
          {/* Transaction details */}
          <div className="space-y-4">
            <div className="border-b pb-4">
              <h4 className="text-sm text-gray-500 mb-1.5">Detail Produk</h4>
              <p className="font-medium text-gray-800">{productName}</p>
            </div>
            
            <div className="border-b pb-4">
              <h4 className="text-sm text-gray-500 mb-1.5">ID Transaksi</h4>
              <div className="flex items-center">
                <span className="font-medium text-gray-800 mr-2">{transactionId}</span>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => copyToClipboard(transactionId)}
                  className="text-indigo-600 hover:text-indigo-800 p-1 rounded-md hover:bg-indigo-50 transition-colors"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </motion.button>
              </div>
            </div>
            
            {/* Detail status transaksi Midtrans jika tersedia */}
            {transactionStatus && (
              <div className="border-b pb-4">
                <h4 className="text-sm text-gray-500 mb-1.5">Status Detail</h4>
                <p className="font-medium text-gray-800">{getMidtransStatusDesc()}</p>
              </div>
            )}
            
            <div className="pb-2">
              <h4 className="text-sm text-gray-500 mb-1.5">Total Pembayaran</h4>
              <p className="font-bold text-xl bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">{formattedAmount}</p>
            </div>
          </div>
          
          {/* Footer actions */}
          <div className="mt-6 flex flex-col gap-2">
            {shouldShowContinuePayment() && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleContinuePayment}
                className="w-full py-3 px-4 rounded-xl bg-green-600 hover:bg-green-700 text-white font-medium flex items-center justify-center"
                disabled={!hasPaymentMethod()}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Lanjutkan Pembayaran
              </motion.button>
            )}
            
            {/* Tampilkan token Midtrans - selalu tampilkan jika tersedia atau tampilkan pesan jika tidak */}
            <div className="text-xs text-gray-500 text-center mb-1 mt-1 px-2">
              <div className="flex flex-col items-center">
                <span className="font-medium mb-0.5">Token Midtrans:</span>
                {payment_token && payment_token.trim() !== '' ? (
                  <span 
                    className="font-mono bg-gray-100 px-2 py-0.5 rounded-md text-gray-700 w-full overflow-hidden text-ellipsis cursor-pointer" 
                    title={payment_token}
                    onClick={() => copyToClipboard(payment_token)}
                  >
                    {payment_token.substring(0, 20) + '...'}
                  </span>
                ) : (
                  <span className="font-mono bg-gray-50 px-2 py-0.5 rounded-md text-red-500 w-full">
                    Token tidak tersedia
                  </span>
                )}
              </div>
            </div>
            
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleBackButton}
              className="w-full py-3 px-4 rounded-xl border border-gray-300 hover:border-gray-400 text-gray-700 font-medium"
            >
              {actualStatus === 'success' ? 'Kembali ke Halaman Produk' : 'Tutup'}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default PurchaseStatus; 