/**
 * Validasi untuk nomor WhatsApp Indonesia
 * Format yang valid:
 * - Diawali dengan 08, +62, 62
 * - Minimal 10 digit, maksimal 15 digit
 * @param phoneNumber Nomor telepon yang akan divalidasi
 * @returns Boolean apakah nomor valid atau tidak
 */
export const isValidIndonesianPhoneNumber = (phoneNumber: string): boolean => {
  // Hapus semua karakter non-numerik, kecuali tanda +
  const cleanPhone = phoneNumber.replace(/[^\d+]/g, '');
  
  // Regex untuk validasi nomor Indonesia
  // Bisa dimulai dengan +62, 62, atau 0
  // Diikuti dengan 8-13 digit angka
  const regex = /^(?:\+62|62|0)[8-9][0-9]{8,13}$/;
  
  return regex.test(cleanPhone);
};

/**
 * Mengubah nomor telepon Indonesia menjadi format WhatsApp internasional
 * e.g. 081234567890 → 6281234567890
 * @param phoneNumber Nomor telepon lokal
 * @returns Nomor telepon format internasional
 */
export const formatToInternationalNumber = (phoneNumber: string): string => {
  // Hapus semua karakter non-numerik, kecuali tanda +
  let cleaned = phoneNumber.replace(/[^\d+]/g, '');
  
  // Jika dimulai dengan 0, ganti dengan 62
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.substring(1);
  }
  
  // Jika dimulai dengan +62, hapus +
  if (cleaned.startsWith('+62')) {
    cleaned = cleaned.substring(1);
  }
  
  return cleaned;
};

/**
 * Validasi form pembelian produk
 * @param values Nilai-nilai form pembelian
 * @returns Object berisi error (jika ada)
 */
export interface PurchaseFormValues {
  buyer_name: string;
  buyer_phone: string;
}

export interface PurchaseFormErrors {
  buyer_name?: string;
  buyer_phone?: string;
}

export const validatePurchaseForm = (values: PurchaseFormValues): PurchaseFormErrors => {
  const errors: PurchaseFormErrors = {};
  
  // Validasi nama
  if (!values.buyer_name?.trim()) {
    errors.buyer_name = 'Nama pembeli harus diisi';
  } else if (values.buyer_name.length < 3) {
    errors.buyer_name = 'Nama harus minimal 3 karakter';
  }
  
  // Validasi nomor telepon
  if (!values.buyer_phone?.trim()) {
    errors.buyer_phone = 'Nomor WhatsApp harus diisi';
  } else if (!isValidIndonesianPhoneNumber(values.buyer_phone)) {
    errors.buyer_phone = 'Format nomor WhatsApp tidak valid (contoh: 081234567890)';
  }
  
  return errors;
}; 