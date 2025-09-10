/**
 * Modul helper untuk Midtrans Snap
 * Membantu menangani error umum dan memperbaiki masalah "Invalid state transition"
 */

// Definisi tipe MidtransResult
export type MidtransResult = {
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

// Opsi callback untuk Midtrans Snap
export interface SnapOptions {
  onSuccess?: (result: MidtransResult) => void;
  onPending?: (result: MidtransResult) => void;
  onError?: (result: MidtransResult) => void;
  onClose?: () => void;
  language?: string;
  autoCloseDelay?: number;
  selectedPaymentType?: string;
  [key: string]: any;
}

/**
 * Membersihkan elemen Midtrans dari DOM
 * Digunakan untuk mencegah elemen orphan dan konflik
 */
export const cleanupMidtransElements = (): void => {
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

/**
 * Muat script Midtrans Snap
 * @returns Promise yang resolve saat script dimuat
 */
export const loadMidtransSnap = (): Promise<void> => {
  return new Promise<void>((resolve, reject) => {
    // Cek apakah Snap sudah dimuat
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
      // Tunggu 1 detik untuk loading
      setTimeout(resolve, 1000);
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
      // Tambahkan delay kecil untuk memastikan Snap terinialisasi dengan benar
      setTimeout(resolve, 500);
    };
    
    script.onerror = (error) => {
      console.error('Gagal memuat Midtrans Snap script:', error);
      reject(new Error('Gagal memuat script Midtrans'));
    };
    
    // Tambahkan script ke dokumen
    document.head.appendChild(script);
  });
};

/**
 * Menutup popup Midtrans jika terbuka
 */
export const hideMidtransPopup = async (): Promise<void> => {
  if (typeof window.snap?.hide === 'function') {
    try {
      console.log('Menutup Snap popup');
      window.snap.hide();
      // Tunggu sebentar untuk DOM update
      await new Promise(resolve => setTimeout(resolve, 300));
    } catch (hideError) {
      console.error('Error saat menutup popup:', hideError);
    }
  }
};

/**
 * Buka Midtrans Snap dengan penanganan error yang lebih baik
 * 
 * @param token Token Snap Midtrans
 * @param options Opsi callback untuk Snap
 * @param fallbackUrl URL pembayaran alternatif jika Snap gagal
 * @returns Promise yang berisi hasil pembayaran atau error
 */
export const openMidtransSnap = async (
  token: string,
  options: SnapOptions = {},
  fallbackUrl?: string
): Promise<{ success: boolean; result?: MidtransResult | null; error?: string }> => {
  if (!token || token.trim() === '') {
    console.error('Token tidak valid:', token);
    if (fallbackUrl) {
      window.open(fallbackUrl, '_blank');
      return { success: true, result: null, error: 'Menggunakan URL pembayaran alternatif' };
    }
    return { success: false, error: 'Token tidak valid' };
  }

  try {
    // Pastikan script Midtrans dimuat
    if (!window.snap) {
      await loadMidtransSnap();
    }

    // Periksa elemen Midtrans di DOM
    const existingPopup = document.getElementById('snap-container');
    if (existingPopup) {
      console.log('Popup Midtrans sudah terbuka, reset terlebih dahulu');
      // Tutup popup yang ada
      await hideMidtransPopup();
      // Bersihkan elemen dari DOM
      cleanupMidtransElements();
    }

    // Pastikan window.snap tersedia
    if (!window.snap) {
      console.error('Midtrans Snap tidak tersedia setelah loading');
      if (fallbackUrl) {
        window.open(fallbackUrl, '_blank');
        return { success: true, result: null, error: 'Menggunakan URL pembayaran alternatif' };
      }
      return { success: false, error: 'Midtrans Snap tidak tersedia' };
    }

    // Buka Snap Midtrans dengan token
    return new Promise<{ success: boolean; result?: MidtransResult | null; error?: string }>((resolve) => {
      try {
        console.log('Memanggil snap.pay dengan token', token);
        
        // Tambahkan callback standar
        const snapCallbacks: SnapOptions = {
          onSuccess: function(result) {
            console.log('Pembayaran berhasil:', result);
            if (options.onSuccess) options.onSuccess(result);
            resolve({ success: true, result });
          },
          onPending: function(result) {
            console.log('Pembayaran pending:', result);
            if (options.onPending) options.onPending(result);
            resolve({ success: true, result });
          },
          onError: function(result) {
            console.error('Pembayaran error:', result);
            if (options.onError) options.onError(result);
            resolve({ success: false, result, error: result.status_message });
          },
          onClose: function() {
            console.log('Popup ditutup tanpa menyelesaikan pembayaran');
            if (options.onClose) options.onClose();
            resolve({ success: true, result: null, error: 'Popup ditutup' });
          },
          language: options.language || 'id'
        };
        
        // Tambahkan opsi tambahan
        if (options.selectedPaymentType) snapCallbacks.selectedPaymentType = options.selectedPaymentType;
        if (options.autoCloseDelay) snapCallbacks.autoCloseDelay = options.autoCloseDelay;
        
        // Panggil snap.pay
        window.snap.pay(token, snapCallbacks);
      } catch (snapError: any) {
        console.error('Error saat memanggil snap.pay:', snapError);
        
        // Periksa jika error adalah "Invalid state transition"
        if (snapError.message && snapError.message.includes('Invalid state transition')) {
          console.log('Error state transition terdeteksi, menggunakan URL alternatif');
          
          // Bersihkan elemen dan state Midtrans
          cleanupMidtransElements();
          
          // Coba lagi dengan URL pembayaran alternatif
          if (fallbackUrl) {
            window.open(fallbackUrl, '_blank');
            resolve({ success: true, result: null, error: 'Menggunakan URL pembayaran alternatif' });
          } else {
            resolve({ success: false, error: 'Invalid state transition, URL alternatif tidak tersedia' });
          }
        } else {
          resolve({ success: false, error: snapError.message || 'Error tidak diketahui' });
        }
      }
    });
  } catch (error: any) {
    console.error('Error global:', error);
    
    // Coba gunakan URL pembayaran alternatif
    if (fallbackUrl) {
      window.open(fallbackUrl, '_blank');
      return { success: true, result: null, error: 'Menggunakan URL pembayaran alternatif' };
    }
    
    return { success: false, error: error.message || 'Error tidak diketahui' };
  }
};

// Definisi untuk window.snap
declare global {
  interface Window {
    snap?: {
      pay: (token: string, options?: SnapOptions) => void;
      show: () => void;
      hide: () => void;
    };
  }
} 