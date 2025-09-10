// Tipe untuk form pembelian
export interface PurchaseFormValues {
  buyer_name: string;
  buyer_phone: string;
  email?: string;
  [key: string]: string | undefined;
}

// Tipe untuk error form pembelian
export interface PurchaseFormErrors {
  buyer_name?: string;
  buyer_phone?: string;
  email?: string;
  [key: string]: string | undefined;
}

/**
 * Validasi form pembelian
 * @param values - Nilai form yang akan divalidasi
 * @returns Objek berisi pesan error, jika ada
 */
export const validatePurchaseForm = (values: PurchaseFormValues): PurchaseFormErrors => {
  const errors: PurchaseFormErrors = {};
  
  // Validasi nama pembeli
  if (!values.buyer_name) {
    errors.buyer_name = 'Nama pembeli wajib diisi';
  } else if (values.buyer_name.length < 3) {
    errors.buyer_name = 'Nama pembeli minimal 3 karakter';
  } else if (values.buyer_name.length > 50) {
    errors.buyer_name = 'Nama pembeli maksimal 50 karakter';
  }
  
  // Validasi nomor telepon
  if (!values.buyer_phone) {
    errors.buyer_phone = 'Nomor telepon wajib diisi';
  } else if (!/^08[1-9][0-9]{7,11}$/.test(values.buyer_phone)) {
    errors.buyer_phone = 'Nomor telepon tidak valid (harus dimulai dengan 08 dan 9-13 digit)';
  }
  
  // Validasi email (opsional)
  if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
    errors.email = 'Format email tidak valid';
  }
  
  return errors;
};

/**
 * Validasi apakah form valid
 * @param values - Nilai form
 * @returns Boolean yang menandakan kevalidan form
 */
export const isPurchaseFormValid = (values: PurchaseFormValues): boolean => {
  const errors = validatePurchaseForm(values);
  return Object.keys(errors).length === 0;
}; 