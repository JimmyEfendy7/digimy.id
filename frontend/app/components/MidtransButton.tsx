"use client";

import { useState, useEffect, useRef } from 'react';
import { ArrowUpRight, Loader2 } from 'lucide-react';

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

interface MidtransButtonProps {
  snapToken: string;
  paymentUrl?: string;
  className?: string;
  buttonText?: string;
  onSuccess?: (result: MidtransResult) => void;
  onPending?: (result: MidtransResult) => void;
  onError?: (result: MidtransResult) => void;
  onClose?: () => void;
}

/**
 * Komponen button untuk membuka Midtrans Snap dengan penanganan error yang lebih baik
 */
const MidtransButton = ({
  snapToken,
  paymentUrl,
  className = '',
  buttonText = 'Lanjutkan Pembayaran',
  onSuccess,
  onPending,
  onError,
  onClose
}: MidtransButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSnapLoaded, setIsSnapLoaded] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Muat script Midtrans saat komponen dimount
  useEffect(() => {
    const loadMidtransSnap = () => {
      if (typeof window === 'undefined') return;
      
      // Cek apakah Snap sudah dimuat
      if (window.snap) {
        setIsSnapLoaded(true);
        return;
      }
      
      const midtransClientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY;
      const scriptId = 'midtrans-snap';
      
      // Periksa apakah script sudah ada
      if (document.getElementById(scriptId)) {
        // Tunggu Snap terinisialisasi
        const checkInterval = setInterval(() => {
          if (window.snap) {
            setIsSnapLoaded(true);
            clearInterval(checkInterval);
          }
        }, 200);
        
        // Pastikan interval dibersihkan
        setTimeout(() => clearInterval(checkInterval), 5000);
        return;
      }
      
      // Tentukan URL script berdasarkan environment
      const scriptUrl = process.env.NODE_ENV === 'production'
        ? 'https://app.midtrans.com/snap/snap.js'
        : 'https://app.sandbox.midtrans.com/snap/snap.js';
      
      // Buat element script baru
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = scriptUrl;
      script.setAttribute('data-client-key', midtransClientKey || '');
      script.async = true;
      
      script.onload = () => {
        setIsSnapLoaded(true);
      };
      
      // Tambahkan script ke dokumen
      document.head.appendChild(script);
    };
    
    loadMidtransSnap();
    
    // Cleanup
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);
  
  // Bersihkan elemen Midtrans dari DOM
  const cleanupMidtransElements = () => {
    try {
      const snapElements = document.querySelectorAll('.snap-container, #snap-container, [id^="snap-midtrans"], iframe[src*="midtrans"]');
      snapElements.forEach(element => element.remove());
    } catch (error) {
      console.error('Error saat membersihkan elemen Midtrans:', error);
    }
  };
  
  // Tutup popup Midtrans jika terbuka
  const hideMidtransPopup = () => {
    if (typeof window.snap?.hide === 'function') {
      try {
        window.snap.hide();
      } catch (error) {
        console.error('Error saat menutup popup:', error);
      }
    }
  };
  
  // Handler untuk tombol pembayaran Midtrans
  const handlePayment = () => {
    // Cegah multiple klik
    if (isLoading) return;
    
    // Debounce untuk mencegah multiple klik
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    setIsLoading(true);
    
    debounceTimerRef.current = setTimeout(() => {
      // Jika tidak ada token, coba gunakan URL pembayaran
      if (!snapToken || snapToken.trim() === '') {
        if (paymentUrl && paymentUrl.trim() !== '') {
          window.open(paymentUrl, '_blank');
        } else {
          alert('Token pembayaran tidak tersedia.');
        }
        setIsLoading(false);
        return;
      }
      
      // Periksa apakah Snap tersedia
      if (!window.snap) {
        console.error('Midtrans Snap tidak tersedia');
        if (paymentUrl && paymentUrl.trim() !== '') {
          window.open(paymentUrl, '_blank');
        } else {
          alert('Midtrans Snap tidak tersedia. Silakan coba lagi nanti.');
        }
        setIsLoading(false);
        return;
      }
      
      // Periksa apakah ada popup yang sudah terbuka
      try {
        const existingPopup = document.getElementById('snap-container');
        if (existingPopup) {
          // Reset popup yang sudah ada
          hideMidtransPopup();
          cleanupMidtransElements();
        }
      } catch (e) {
        console.error('Error saat memeriksa popup:', e);
      }
      
      try {
        // Panggil Snap.pay
        window.snap.pay(snapToken, {
          onSuccess: (result) => {
            console.log('Pembayaran berhasil:', result);
            setIsLoading(false);
            if (onSuccess) onSuccess(result);
          },
          onPending: (result) => {
            console.log('Pembayaran pending:', result);
            setIsLoading(false);
            if (onPending) onPending(result);
          },
          onError: (result) => {
            console.error('Pembayaran error:', result);
            setIsLoading(false);
            if (onError) onError(result);
          },
          onClose: () => {
            console.log('Popup ditutup tanpa menyelesaikan pembayaran');
            setIsLoading(false);
            if (onClose) onClose();
          },
          language: 'id'
        });
      } catch (error: any) {
        setIsLoading(false);
        console.error('Error saat memanggil snap.pay:', error);
        
        // Handle specific error: Invalid state transition
        if (error.message && error.message.includes('Invalid state transition')) {
          console.log('Terdeteksi error state transition, menggunakan URL alternatif');
          
          // Bersihkan elemen yang ada
          cleanupMidtransElements();
          
          // Tunggu sebentar dan coba lagi
          setTimeout(() => {
            try {
              // Coba panggil lagi
              window.snap.pay(snapToken, {
                onSuccess, onPending, onError, onClose, language: 'id'
              });
            } catch (retryError) {
              console.error('Error saat mencoba ulang snap.pay:', retryError);
              
              // Fallback ke URL pembayaran
              if (paymentUrl && paymentUrl.trim() !== '') {
                window.open(paymentUrl, '_blank');
              } else {
                alert('Terjadi kesalahan saat memproses pembayaran. Silakan coba lagi nanti.');
              }
            }
          }, 500);
        } else {
          // Generic error, use payment URL as fallback
          if (paymentUrl && paymentUrl.trim() !== '') {
            window.open(paymentUrl, '_blank');
          } else {
            alert('Terjadi kesalahan saat memproses pembayaran. Silakan coba lagi nanti.');
          }
        }
      }
    }, 300);
  };
  
  return (
    <button
      className={`flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-60 ${className}`}
      onClick={handlePayment}
      disabled={isLoading || (!snapToken && !paymentUrl)}
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Memproses...
        </>
      ) : (
        <>
          {buttonText}
          <ArrowUpRight className="h-4 w-4 ml-1" />
        </>
      )}
    </button>
  );
};

export default MidtransButton;

// Definisi untuk window.snap
declare global {
  interface Window {
    snap?: {
      pay: (token: string, options?: any) => void;
      show: () => void;
      hide: () => void;
    };
  }
} 