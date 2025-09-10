import axios from 'axios';

// Tambahkan interface untuk Axios error
interface AxiosErrorType {
  isAxiosError: boolean;
  response?: {
    status: number;
    data: unknown;
    headers?: Record<string, string>;
  };
  request?: unknown;
  message: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || '';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Helper untuk mengubah URL poster menjadi URL lengkap dari backend
export const getImageUrl = (posterPath: string | null | undefined, assetType: 'product' | 'auction' | 'review' | 'store' = 'product'): string => {
  if (!posterPath) return '/product-placeholder.jpg';
  
  // Jika URL sudah lengkap (dimulai dengan http atau https), gunakan langsung
  if (posterPath.startsWith('http://') || posterPath.startsWith('https://')) {
    return posterPath;
  }
  
  // Jika URL relatif, gabungkan dengan BACKEND_URL dan pastikan path benar
  const pathSegment = posterPath.startsWith('/') ? posterPath : `/${posterPath}`;
  
  // Pilih direktori berdasarkan jenis aset
  let assetDir = '';
  switch (assetType) {
    case 'product':
      assetDir = '/public/products';
      break;
    case 'auction':
      assetDir = '/public/auctions';
      break;
    case 'review':
      assetDir = '/public/reviews';
      break;
    case 'store':
      assetDir = '/public/stores';
      break;
    default:
      assetDir = '/public';
  }
  
  // Special handling for review assets to support both old and new storage locations
  if (assetType === 'review') {
    // If path already contains a directory, use it directly
    if (pathSegment.includes('/products/') || pathSegment.includes('/reviews/')) {
      return `${BACKEND_URL}${pathSegment.startsWith('/public') ? pathSegment : `/public${pathSegment}`}`;
    }
    // For new review files without directory, use /public/reviews/
    return `${BACKEND_URL}/public/reviews${pathSegment}`;
  }
  
  // For non-review assets, handle existing directory paths
  if (pathSegment.includes('/products/') || pathSegment.includes('/auctions/') || 
      pathSegment.includes('/reviews/') || pathSegment.includes('/stores/')) {
    return `${BACKEND_URL}${pathSegment.startsWith('/public') ? pathSegment : `/public${pathSegment}`}`;
  }
  
  // Gabungkan path dengan direktori aset
  return `${BACKEND_URL}${assetDir}${pathSegment}`;
};

/**
 * Refund a canceled order item
 */
export const refundOrderItem = async (storeId: number, itemId: number) => {
  try {
    const token = localStorage.getItem('authToken');
    const response = await axios.post(`${API_URL}/orders/store/${storeId}/item/${itemId}/refund`, {}, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error: any) {
    console.error('Error refunding order item:', error);
    return handleAxiosError(error);
  }
};

export const fetchProductCategories = async () => {
  try {
    const response = await api.get('/product-categories');
    return response.data.data;
  } catch (error) {
    console.error('Error fetching product categories:', error);
    return [];
  }
};

export const fetchProductsByCategory = async (categoryId: string) => {
  try {
    const response = await api.get(`/product-categories/${categoryId}/products`);
    return response.data.data;
  } catch (error) {
    console.error(`Error fetching products for category ${categoryId}:`, error);
    return { category: null, products: [] };
  }
};

export const fetchAllProducts = async (limit = 12, page = 1, categoryId?: string) => {
  try {
    let url = `/products?limit=${limit}&page=${page}`;
    if (categoryId) {
      url += `&category_id=${categoryId}`;
    }
    const response = await api.get(url);
    return response.data;
  } catch (error) {
    console.error('Error fetching products:', error);
    return { data: [], pagination: { page, limit, total: 0 } };
  }
};

export const fetchProductById = async (productId: string) => {
  try {
    const response = await api.get(`/products/${productId}`);
    return response.data.data;
  } catch (error) {
    console.error(`Error fetching product ${productId}:`, error);
    return null;
  }
};

export const searchProducts = async (keyword: string, limit = 10, page = 1) => {
  try {
    const response = await api.get(`/products/search?keyword=${keyword}&limit=${limit}&page=${page}`);
    return response.data;
  } catch (error) {
    console.error('Error searching products:', error);
    return { data: [], pagination: { page, limit } };
  }
};

export const fetchServiceCategories = async () => {
  try {
    const response = await api.get('/service-categories');
    return response.data.data;
  } catch (error) {
    console.error('Error fetching service categories:', error);
    return [];
  }
};

export const fetchServiceSubcategories = async (categoryId: string) => {
  try {
    const response = await api.get(`/service-categories/${categoryId}/subcategories`);
    return response.data.data;
  } catch (error) {
    console.error(`Error fetching service subcategories for category ${categoryId}:`, error);
    return { category: null, subcategories: [] };
  }
};

export const fetchServicesBySubcategory = async (subcategoryId: string) => {
  try {
    const response = await api.get(`/service-subcategories/${subcategoryId}/services`);
    return response.data.data;
  } catch (error) {
    console.error(`Error fetching services for subcategory ${subcategoryId}:`, error);
    return { category: null, subcategory: null, services: [], addons: [] };
  }
};

// -----------------------------
// AUTHENTIKASI MITRA / STORE
// -----------------------------

/**
 * Kirim OTP untuk registrasi mitra/toko
 */
export const sendStoreRegisterOtp = async (phone_number: string) => {
  try {
    const response = await axios.post(`${BACKEND_URL}/stores/register`, { phone_number });
    return response.data;
  } catch (error: any) {
    console.error('Error sending store register OTP:', error);
    return handleAxiosError(error);
  }
};

/**
 * Verifikasi OTP dan registrasi mitra/toko
 */
export const registerMitraStore = async (data: Record<string, any>) => {
  try {
    const response = await axios.post(`${BACKEND_URL}/stores/register/verify`, data);
    return response.data;
  } catch (error: any) {
    console.error('Error registering store:', error);
    return handleAxiosError(error);
  }
};

/**
 * Kirim OTP untuk login mitra/toko
 */
export const sendStoreLoginOtp = async (phone_number: string) => {
  try {
    const response = await axios.post(`${BACKEND_URL}/stores/login`, { phone_number });
    return response.data;
  } catch (error: any) {
    console.error('Error sending store login OTP:', error);
    return handleAxiosError(error);
  }
};

/**
 * Verifikasi OTP dan login mitra/toko
 */
export const verifyStoreLoginOtp = async (phone_number: string, otp_code: string) => {
  try {
    const response = await axios.post(`${BACKEND_URL}/stores/login/verify`, { phone_number, otp_code });
    return response.data;
  } catch (error: any) {
    console.error('Error verifying store login OTP:', error);
    return handleAxiosError(error);
  }
};

// Helper untuk menangani error axios
const handleAxiosError = (error: AxiosErrorType) => {
  if (error.isAxiosError && error.response) {
    return error.response.data as any;
  }
  return { success: false, message: error.message };
};

export const fetchAllServices = async (limit = 12, page = 1, categoryId?: string) => {
  try {
    let url = `/services?limit=${limit}&page=${page}`;
    if (categoryId) {
      url += `&category_id=${categoryId}`;
    }
    console.log(`[DEBUG] Memanggil API services dengan URL: ${url}`);
    const response = await api.get(url);
    return response.data;
  } catch (error) {
    console.error('Error fetching all services:', error);
    // Mengembalikan struktur data yang konsisten saat terjadi error
    return { data: [], pagination: { page, limit, total: 0, totalPages: 0 } };
  }
};

export const fetchPopularServices = async (limit = 8) => {
  try {
    console.log(`[DEBUG] Memanggil API popular services dengan limit: ${limit}`);
    const response = await api.get(`/services/popular?limit=${limit}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching popular services:', error);
    return { data: [], pagination: { limit, total: 0 } };
  }
};

// ==================== ORDER MANAGEMENT APIs ====================

/**
 * Get orders for a specific store
 */
export const getStoreOrders = async (storeId: number, page = 1, limit = 10, status = 'all', search = '', date = '') => {
  try {
    const token = localStorage.getItem('authToken');
    const response = await axios.get(`${API_URL}/orders/store/${storeId}`, {
      params: { page, limit, status, search, date },
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error: any) {
    console.error('Error fetching store orders:', error);
    return handleAxiosError(error);
  }
};

/**
 * Update order item status
 */
export const updateOrderItemStatus = async (storeId: number, itemId: number, status: string) => {
  try {
    const token = localStorage.getItem('authToken');
    const response = await axios.put(`${API_URL}/orders/store/${storeId}/item/${itemId}/status`, 
      { status },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  } catch (error: any) {
    console.error('Error updating order item status:', error);
    return handleAxiosError(error);
  }
};

/**
 * Get order statistics for dashboard
 */
export const getOrderStats = async (storeId: number) => {
  try {
    const token = localStorage.getItem('authToken');
    const response = await axios.get(`${API_URL}/orders/store/${storeId}/stats`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error: any) {
    console.error('Error fetching order stats:', error);
    return handleAxiosError(error);
  }
};

// ==================== FINANCE MANAGEMENT APIs ====================

/**
 * Get store financial summary
 */
export const getStoreFinance = async (storeId: number) => {
  try {
    const token = localStorage.getItem('authToken');
    const response = await axios.get(`${API_URL}/finance/store/${storeId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error: any) {
    console.error('Error fetching store finance:', error);
    return handleAxiosError(error);
  }
};

/**
 * Get detailed transaction history
 */
export const getTransactionHistory = async (
  storeId: number,
  page = 1,
  limit = 20,
  type = 'all',
  date_from = '',
  date_to = ''
) => {
  try {
    const token = localStorage.getItem('authToken');
    const response = await axios.get(`${API_URL}/finance/store/${storeId}/transactions`, {
      params: { page, limit, type, date_from, date_to },
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error: any) {
    console.error('Error fetching transaction history:', error);
    return handleAxiosError(error);
  }
};

/**
 * Create withdrawal request
 */
export const createWithdrawal = async (storeId: number, withdrawalData: {
  amount: number;
  bank_name: string;
  account_number: string;
  account_name: string;
}) => {
  try {
    const token = localStorage.getItem('authToken');
    const response = await axios.post(`${API_URL}/finance/store/${storeId}/withdrawal`, 
      withdrawalData,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  } catch (error: any) {
    console.error('Error creating withdrawal:', error);
    return handleAxiosError(error);
  }
};

/**
 * Get revenue analytics
 */
export const getRevenueAnalytics = async (storeId: number, period = 'monthly') => {
  try {
    const token = localStorage.getItem('authToken');
    const response = await axios.get(`${API_URL}/finance/store/${storeId}/analytics`, {
      params: { period },
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error: any) {
    console.error('Error fetching revenue analytics:', error);
    return handleAxiosError(error);
  }
};

export const fetchServiceById = async (serviceId: string) => {
  try {
    const response = await api.get(`/services/${serviceId}`);
    return response.data.data;
  } catch (error) {
    console.error(`Error fetching service ${serviceId}:`, error);
    return null;
  }
};

export const searchServices = async (keyword: string, limit = 10, page = 1) => {
  try {
    const response = await api.get(`/services/search?keyword=${keyword}&limit=${limit}&page=${page}`);
    return response.data;
  } catch (error) {
    console.error('Error searching services:', error);
    return { data: [], pagination: { page, limit } };
  }
};

export const fetchActiveAuctions = async (limit = 10, page = 1) => {
  try {
    console.log(`[DEBUG] Fetching active auctions with limit: ${limit}, page: ${page}`);
    const response = await api.get(`/auctions?limit=${limit}&page=${page}`);
    
    // Log details about bid counts and current prices
    if (response.data && response.data.data) {
      console.log(`[DEBUG] Received ${response.data.data.length} auctions`);
      response.data.data.forEach((auction: {
        id: number | string;
        product_name: string;
        current_price: number;
        bid_count?: number;
        start_price: number;
        highest_bid?: number;
      }) => {
        console.log(`Auction #${auction.id}: ${auction.product_name}`);
        console.log(`- Start price: ${auction.start_price} (${typeof auction.start_price})`);
        console.log(`- Current price: ${auction.current_price} (${typeof auction.current_price})`);
        console.log(`- Highest bid: ${auction.highest_bid || 'N/A'}`);
        console.log(`- Bid count: ${auction.bid_count || 0}`);
        
        // Check for potential issues
        if (auction.start_price <= 0) console.log(`⚠️ Warning: Start price is zero or negative`);
        if (isNaN(Number(auction.start_price))) console.log(`⚠️ Warning: Start price is not a number`);
        if (isNaN(Number(auction.current_price))) console.log(`⚠️ Warning: Current price is not a number`);
        
        // Calculate and log increment percentage
        const incrementPercentage = auction.start_price > 0 
          ? Math.round((auction.current_price / auction.start_price - 1) * 100) 
          : 0;
        console.log(`- Increment: ${incrementPercentage}%`);
      });
    }
    
    return response.data;
  } catch (error) {
    console.error('Error fetching active auctions:', error);
    return { data: [], pagination: { page, limit, total: 0, totalPages: 0 } };
  }
};

export const fetchPendingAuctions = async (limit = 10, page = 1) => {
  try {
    const response = await api.get(`/auctions/pending?limit=${limit}&page=${page}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching pending auctions:', error);
    return { data: [], pagination: { page, limit, total: 0, totalPages: 0 } };
  }
};

export const fetchAuctionById = async (auctionId: string) => {
  try {
    const response = await api.get(`/auctions/${auctionId}`);
    return response.data.data;
  } catch (error) {
    console.error(`Error fetching auction ${auctionId}:`, error);
    return null;
  }
};

export const submitAuctionBid = async (auctionId: string, bidData: {
  user_id?: string;
  bidder_name: string;
  bidder_phone: string;
  bid_amount: number;
}) => {
  try {
    const response = await api.post(`/auctions/${auctionId}/bid`, bidData);
    return response.data;
  } catch (error) {
    console.error('Error submitting auction bid:', error);
    throw error;
  }
};

export const fetchProductReviews = async (productId: string) => {
  try {
    const response = await api.get(`/products/${productId}/reviews`);
    return response.data.data;
  } catch (error) {
    console.error(`Error fetching product reviews for ${productId}:`, error);
    return [];
  }
};

export const fetchStoreDetails = async (storeId: string) => {
  try {
    const response = await api.get(`/stores/${storeId}`);
    return response.data.data;
  } catch (error) {
    console.error(`Error fetching store details for ${storeId}:`, error);
    return null;
  }
};

// ==================== PRODUCT ADDONS (MITRA) ====================

/**
 * List addons for a specific product (Mitra scope)
 */
export const getProductAddons = async (productId: number | string) => {
  try {
    const token = localStorage.getItem('authToken');
    const response = await axios.get(`${API_URL}/store-addons/${productId}/addons`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    });
    return response.data;
  } catch (error: any) {
    console.error('Error fetching product addons:', error);
    return handleAxiosError(error);
  }
};

/**
 * Create addon for a product. Fields: name, description, price, is_active, addon_url(File)
 */
export const createProductAddon = async (productId: number | string, formData: FormData) => {
  try {
    const token = localStorage.getItem('authToken');
    const response = await axios.post(`${API_URL}/store-addons/${productId}/addons`, formData, {
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    });
    return response.data;
  } catch (error: any) {
    console.error('Error creating product addon:', error);
    return handleAxiosError(error);
  }
};

/**
 * Update addon for a product. Supports partial fields and optional file replacement
 */
export const updateProductAddon = async (
  productId: number | string,
  addonId: number | string,
  formData: FormData
) => {
  try {
    const token = localStorage.getItem('authToken');
    const response = await axios.put(`${API_URL}/store-addons/${productId}/addons/${addonId}`, formData, {
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    });
    return response.data;
  } catch (error: any) {
    console.error('Error updating product addon:', error);
    return handleAxiosError(error);
  }
};

/**
 * Delete addon
 */
export const deleteProductAddon = async (productId: number | string, addonId: number | string) => {
  try {
    const token = localStorage.getItem('authToken');
    const response = await axios.delete(`${API_URL}/store-addons/${productId}/addons/${addonId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    });
    return response.data;
  } catch (error: any) {
    console.error('Error deleting product addon:', error);
    return handleAxiosError(error);
  }
};

// Fungsi untuk mendapatkan token Snap dari backend
export const getSnapToken = async (orderId: string, purchaseData: {
  buyer_name: string;
  buyer_phone: string;
  product_id: string;
  product_name: string;
  price: number;
  email?: string;
}) => {
  try {
    const response = await api.post('/snap/token', {
      order_id: orderId,
      gross_amount: purchaseData.price,
      customer_details: {
        first_name: purchaseData.buyer_name,
        phone: purchaseData.buyer_phone,
        email: purchaseData.email || `${purchaseData.buyer_phone}@email.com`
      },
      item_details: [{
        id: purchaseData.product_id,
        name: purchaseData.product_name,
        price: purchaseData.price,
        quantity: 1
      }]
    });
    
    // Verifikasi format respons
    if (response.headers && 
        response.headers['content-type'] && 
        response.headers['content-type'].includes('text/html')) {
      console.error('Received HTML response instead of JSON');
      return { 
        success: false, 
        error: 'Layanan pembayaran sedang tidak tersedia. Silakan coba lagi nanti.' 
      };
    }
    
    // Cek apakah data respons valid
    if (!response.data || typeof response.data !== 'object') {
      console.error('Invalid response data format:', response.data);
      return { 
        success: false, 
        error: 'Format respons tidak valid. Silakan coba lagi.' 
      };
    }
    
    // Cek apakah token ada dalam respons
    if (!response.data.token) {
      console.error('No token in response:', response.data);
      return { 
        success: false, 
        error: 'Token pembayaran tidak ditemukan. Silakan coba lagi.' 
      };
    }
    
    return { 
      success: true, 
      token: response.data.token,
      redirect_url: response.data.redirect_url
    };
  } catch (error: unknown) {
    console.error('Error getting Snap token:', error);
    
    // Cek jika error respons berisi HTML
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as { response?: { headers?: { [key: string]: string } } };
      if (axiosError.response?.headers && 
          axiosError.response.headers['content-type'] && 
          axiosError.response.headers['content-type'].includes('text/html')) {
        return { 
          success: false, 
          error: 'Layanan pembayaran sedang tidak tersedia. Silakan coba lagi nanti.' 
        };
      }
    }
    
    return { 
      success: false, 
      error: 'Gagal memproses permintaan pembayaran. Silakan coba lagi.' 
    };
  }
};

// Fungsi untuk submit pembelian produk digital
export const submitProductPurchase = async (productId: string, purchaseData: {
  buyer_name: string;
  buyer_phone: string;
  product_id: string;
  price: number;
  product_name: string;
  store_id?: string;
}) => {
  try {
    // Buat ID order unik menggunakan timestamp dan random string
    const timestamp = new Date().getTime();
    const randomStr = Math.random().toString(36).substring(2, 10);
    const orderId = `ORDER-${timestamp}-${randomStr}`;
    
    // Dapatkan URL saat ini untuk callback
    const baseUrl = window.location.origin;
    const currentPath = window.location.pathname;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
    
    // Setup URL untuk callback webhook Midtrans
    // Gunakan URL yang bisa diakses dari internet untuk production
    const callbackNotificationUrl = process.env.NEXT_PUBLIC_WEBHOOK_URL 
      ? `${process.env.NEXT_PUBLIC_WEBHOOK_URL}/payment-notification`
      : `${apiUrl}/payment-notification`;
    
    try {
      // Dapatkan Snap token untuk pembayaran langsung dari Midtrans
      const snapResponse = await api.post(`/snap/token`, {
        order_id: orderId,
        gross_amount: purchaseData.price,
        customer_details: {
          first_name: purchaseData.buyer_name,
          phone: purchaseData.buyer_phone
        },
        item_details: [
          {
            id: productId,
            name: purchaseData.product_name,
            price: purchaseData.price,
            quantity: 1,
            store_id: purchaseData.store_id
          }
        ],
        // Callbacks untuk redirect tampilan ke pengguna
        callbacks: {
          finish: `${baseUrl}${currentPath}?status=success&order_id=${orderId}`,
          pending: `${baseUrl}${currentPath}?status=pending&order_id=${orderId}`,
          error: `${baseUrl}${currentPath}?status=error&order_id=${orderId}`
        },
        // URL webhook notifikasi untuk update status otomatis
        // Ini yang penting untuk realtime update
        notification: {
          url: callbackNotificationUrl,
          append_order_id: false // Jangan menambahkan order_id ke URL
        }
      });
      
      // Verifikasi format respons
      if (snapResponse.headers && 
          snapResponse.headers['content-type'] && 
          snapResponse.headers['content-type'].includes('text/html')) {
        console.error('Received HTML response instead of JSON');
        throw new Error('Layanan pembayaran sedang tidak tersedia. Silakan coba lagi nanti.');
      }
      
      // Verifikasi data respons
      if (!snapResponse.data || typeof snapResponse.data !== 'object') {
        console.error('Invalid response format:', snapResponse.data);
        throw new Error('Format respons tidak valid');
      }
      
      if (!snapResponse.data.token) {
        console.error('Token not found in response:', snapResponse.data);
        throw new Error('Gagal mendapatkan token pembayaran');
      }
      
      // Log informasi pembayaran untuk debugging
      console.log('Payment information received:', {
        token: snapResponse.data.token,
        redirect_url: snapResponse.data.redirect_url,
        expiry: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 jam dari sekarang
        webhook_url: callbackNotificationUrl
      });
      
      // Kembalikan data untuk pembayaran
      return { 
        success: true, 
        data: {
          id: orderId,
          product_id: productId,
          buyer_name: purchaseData.buyer_name,
          buyer_phone: purchaseData.buyer_phone,
          price: purchaseData.price,
          snap_token: snapResponse.data.token,
          payment_link: snapResponse.data.redirect_url,
          payment_token: snapResponse.data.token,
          payment_url: snapResponse.data.redirect_url,
          payment_expiry: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 jam dari sekarang
          status: 'pending',
          callback_url: callbackNotificationUrl
        }
      };
    } catch (apiError: unknown) {
      console.error('API Error:', apiError);
      
      // Cek jika ada respons HTML
      if (apiError && typeof apiError === 'object' && 'response' in apiError) {
        const axiosError = apiError as { response?: { headers?: { [key: string]: string } } };
        if (axiosError.response?.headers && 
            axiosError.response.headers['content-type'] && 
            axiosError.response.headers['content-type'].includes('text/html')) {
          throw new Error('Layanan pembayaran sedang tidak tersedia. Silakan coba lagi nanti.');
        }
      }
      
      throw apiError;
    }
  } catch (error: unknown) {
    console.error('Error submitting product purchase:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Gagal memproses pembelian. Silakan coba lagi.' 
    };
  }
};

// Fungsi untuk memeriksa status transaksi 
export const checkTransactionStatus = async (orderId: string) => {
  try {
    // Sambungkan ke API untuk mendapatkan status terkini
    console.log(`Checking transaction status for order ID: ${orderId}`);
    
    // Pastikan URL API yang benar
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
    
    console.log(`Memanggil API status transaksi: ${apiUrl}/transactions/status/${orderId}`);
    
    const response = await axios.get(`${apiUrl}/transactions/status/${orderId}`, {
      // Tingkatkan timeout untuk menghindari error timeout
      timeout: 20000,
      // Tambahkan headers yang mungkin diperlukan
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    // Debugging response
    console.log(`Status response: ${response.status}`);
    
    // Validasi respons dengan lebih ketat
    if (response.data && (response.data.success === true || 
        response.data.transaction_status || 
        response.data.payment_status || 
        response.data.data)) {
      
      console.log('Transaction status response:', 
        typeof response.data === 'object' ? 
        JSON.stringify(response.data).substring(0, 500) : 
        'Non-object response');
      
      // Standardisasi format respons
      let responseData;
      
      if (response.data.data) {
        // Format: { success: true, data: {...} }
        responseData = response.data.data;
      } else if (response.data.transaction_status || response.data.payment_status) {
        // Format: { transaction_status: '...', payment_status: '...', ... }
        responseData = response.data;
      } else {
        // Format tidak dikenali, gunakan seluruh respons
        responseData = response.data;
      }
      
      return {
        success: true,
        data: responseData
      };
    } else {
      // Log error dengan informasi yang lebih lengkap
      console.error('Invalid response format from API:', 
        response.data ? 
        (typeof response.data === 'object' ? 
          JSON.stringify(response.data) : response.data) : 
        'Empty response');
      
      // Fallback ke data dummy jika format tidak valid
      return {
        success: false,
        error: (response.data && response.data.message) || 'Format respons tidak valid',
        data: {
          transaction_status: 'pending',
          payment_status: 'pending',
          payment_type: 'Menunggu pembayaran',
          payment_method: 'Menunggu pembayaran',
          order_id: orderId,
          transaction_id: '',
          payment_token: '',
          payment_url: '',
          snap_token: '',
          amount: 0,
          transaction_time: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          webhook_notified: false,
          callback_received: false
        }
      };
    }
  } catch (error) {
    console.error('Error checking transaction status:', error);
    
    // Tambahkan log untuk error Axios yang lebih detail
    if (error && typeof error === 'object' && 'isAxiosError' in error) {
      const axiosError = error as AxiosErrorType;
      if (axiosError.response) {
        console.error('API error response status:', axiosError.response.status);
        console.error('API error response data:', 
          typeof axiosError.response.data === 'object' ? 
            JSON.stringify(axiosError.response.data) : 
            axiosError.response.data);
      } else if (axiosError.request) {
        // Jika ada request tetapi tidak ada respons (timeout, dll)
        console.error('No response received, request was:', '{}');
      }
    }
    
    // Fallback ke data dummy jika gagal terhubung ke API
    console.log('Returning dummy data as fallback due to error');
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to check transaction status',
      data: {
        transaction_status: 'pending',
        payment_status: 'pending',
        payment_type: 'Menunggu pembayaran',
        payment_method: 'Menunggu pembayaran',
        transaction_id: '',
        order_id: orderId,
        payment_url: '',
        payment_token: '',
        snap_token: '',
        amount: 0,
        transaction_time: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        webhook_notified: false,
        callback_received: false,
        status_from_webhook: false
      }
    };
  }
};

// Fungsi untuk membuka kembali pembayaran Midtrans dengan token yang tersimpan
export const reopenSnapPayment = (token: string) => {
  try {
    console.log('Reopening Snap payment with token:', token);
    
    // Validasi token
    if (!token || token.trim() === '') {
      console.error('Token tidak valid:', token);
      return { success: false, error: 'Token Midtrans tidak valid' };
    }
    
    // Pastikan window.snap tersedia
    if (typeof window === 'undefined') {
      console.error('Window tidak tersedia (SSR context)');
      return { success: false, error: 'Window tidak tersedia' };
    }
    
    if (!window.snap) {
      console.error('Snap.js belum dimuat. Pastikan script Midtrans telah dimuat.');
      
      // Jika dalam mode development, coba muat script Midtrans
      if (process.env.NODE_ENV !== 'production') {
        console.log('Mencoba memuat Midtrans script dalam mode development...');
        const scriptId = 'midtrans-snap';
        if (!document.getElementById(scriptId)) {
          const midtransClientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || '';
          const scriptUrl = 'https://app.sandbox.midtrans.com/snap/snap.js';
          const script = document.createElement('script');
          script.id = scriptId;
          script.src = scriptUrl;
          script.setAttribute('data-client-key', midtransClientKey);
          script.async = true;
          document.head.appendChild(script);
          
          return { 
            success: false, 
            error: 'Snap.js tidak tersedia. Script sedang dimuat, silakan coba lagi dalam beberapa detik.' 
          };
        }
      }
      
      return { success: false, error: 'Snap.js tidak tersedia' };
    }
    
    // Interface untuk hasil pembayaran Midtrans
    interface MidtransResult {
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
    }
    
    // Buka kembali pembayaran dengan Snap
    window.snap.pay(token, {
      onSuccess: function(result: MidtransResult) {
        console.log('Pembayaran berhasil:', result);
        // Hapus window.location.reload() agar tidak refresh halaman
        return { success: true, status: 'success', data: result };
      },
      onPending: function(result: MidtransResult) {
        console.log('Pembayaran pending:', result);
        // Hapus window.location.reload() agar tidak refresh halaman
        return { success: true, status: 'pending', data: result };
      },
      onError: function(result: MidtransResult) {
        console.error('Pembayaran gagal:', result);
        alert('Pembayaran gagal: ' + result.status_message);
        return { success: false, status: 'error', data: result };
      },
      onClose: function() {
        console.log('Customer menutup popup tanpa menyelesaikan pembayaran');
        // Tidak perlu melakukan tindakan apa-apa saat popup ditutup
        return { success: false, status: 'closed' };
      },
      language: 'id'
    });
    
    return { success: true };
  } catch (error: unknown) {
    console.error('Error reopening Snap payment:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Gagal membuka pembayaran' 
    };
  }
};

export const fetchOfficialProductsCount = async () => {
  try {
    const response = await api.get(`/products?is_official=true&limit=1`);
    return response.data.pagination?.total || 0;
  } catch (error) {
    console.error('Error fetching official products count:', error);
    return 0;
  }
};

export const fetchOfficialProducts = async (limit = 12, page = 1) => {
  try {
    const response = await api.get(`/products?is_official=true&limit=${limit}&page=${page}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching official products:', error);
    return { data: [], pagination: { page, limit, total: 0 } };
  }
};

export const fetchOfficialProductsStats = async () => {
  try {
    const response = await api.get('/products/official-stats');
    return {
      totalPaid: response.data.total_paid || 0,
      totalPending: response.data.total_pending || 0
    };
  } catch (error) {
    console.error('Error fetching official products stats:', error);
    return {
      totalPaid: 0,
      totalPending: 0
    };
  }
};

export const fetchStoreStats = async (storeId: string) => {
  try {
    const response = await api.get(`/stores/${storeId}/stats`);
    return {
      totalPaid: response.data.total_paid || 0,
      totalPending: response.data.total_pending || 0
    };
  } catch (error) {
    console.error(`Error fetching stats for store ${storeId}:`, error);
    return {
      totalPaid: 0,
      totalPending: 0
    };
  }
};

export const fetchSimilarProducts = async (storeId: string, limit = 8) => {
  try {
    // Fetch products from other stores in the same category
    const response = await api.get(`/stores/${storeId}/similar-products?limit=${limit}`);
    return response.data.data || [];
  } catch (error) {
    console.error(`Error fetching similar products for store ${storeId}:`, error);
    return [];
  }
};

export const fetchStoreProducts = async (storeId: string, limit = 12, page = 1) => {
  try {
    const response = await api.get(`/stores/${storeId}/products?limit=${limit}&page=${page}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching products for store ${storeId}:`, error);
    return { data: [], pagination: { page, limit, total: 0, totalPages: 0 } };
  }
};

// Auth API endpoints
export const sendRegisterOtp = async (phoneNumber: string) => {
  try {
    const response = await axios.post(`${API_URL}/auth/send-otp/register`, {
      phone_number: phoneNumber
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw error.response.data;
    }
    throw error;
  }
};

export const sendLoginOtp = async (phoneNumber: string) => {
  try {
    const response = await axios.post(`${API_URL}/auth/send-otp/login`, {
      phone_number: phoneNumber
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw error.response.data;
    }
    throw error;
  }
};

export const verifyLoginOtp = async (phoneNumber: string, otpCode: string) => {
  try {
    const response = await axios.post(`${API_URL}/auth/verify-otp/login`, {
      phone_number: phoneNumber,
      otp_code: otpCode
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw error.response.data;
    }
    throw error;
  }
};

export const registerUser = async (userData: {
  name: string;
  email: string;
  phone_number: string;
  password: string;
  otp_code: string;
}) => {
  try {
    const response = await axios.post(`${API_URL}/auth/register/user`, userData);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw error.response.data;
    }
    throw error;
  }
};

export const registerStore = async (storeData: {
  name: string;
  slug: string;
  description?: string;
  email: string;
  phone_number: string;
  address?: string;
  otp_code: string;
}) => {
  try {
    const response = await axios.post(`${API_URL}/auth/register/store`, storeData);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw error.response.data;
    }
    throw error;
  }
};

// -----------------------------
// STORE PROFILE MANAGEMENT
// -----------------------------

/**
 * Get store profile data
 */
export const getStoreProfile = async (slug: string) => {
  try {
    const response = await axios.get(`${BACKEND_URL}/store-profile/${slug}`);
    return response.data;
  } catch (error: any) {
    console.error('Error getting store profile:', error);
    return handleAxiosError(error);
  }
};

/**
 * Update store profile with optional file uploads
 */
export const updateStoreProfile = async (slug: string, data: FormData, token: string) => {
  try {
    const response = await axios.put(`${BACKEND_URL}/store-profile/${slug}`, data, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  } catch (error: any) {
    console.error('Error updating store profile:', error);
    return handleAxiosError(error);
  }
};

// -----------------------------
// STORE PRODUCT MANAGEMENT
// -----------------------------

/**
 * Get store products with pagination
 */
export const getStoreProducts = async (page = 1, limit = 12, token: string) => {
  try {
    const response = await axios.get(`${BACKEND_URL}/store-products?page=${page}&limit=${limit}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.data;
  } catch (error: any) {
    console.error('Error getting store products:', error);
    return handleAxiosError(error);
  }
};

/**
 * Get product categories
 */
export const getProductCategories = async () => {
  try {
    const response = await axios.get(`${BACKEND_URL}/store-products/categories`);
    return response.data;
  } catch (error: any) {
    console.error('Error getting product categories:', error);
    return handleAxiosError(error);
  }
};

/**
 * Add new product
 */
export const addProduct = async (data: FormData, token: string) => {
  try {
    const response = await axios.post(`${BACKEND_URL}/store-products`, data, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  } catch (error: any) {
    console.error('Error adding product:', error);
    return handleAxiosError(error);
  }
};

/**
 * Update product
 */
export const updateProduct = async (id: string, data: FormData, token: string) => {
  try {
    const response = await axios.put(`${BACKEND_URL}/store-products/${id}`, data, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  } catch (error: any) {
    console.error('Error updating product:', error);
    return handleAxiosError(error);
  }
};

/**
 * Delete product
 */
export const deleteProduct = async (id: string, token: string) => {
  try {
    const response = await axios.delete(`${BACKEND_URL}/store-products/${id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.data;
  } catch (error: any) {
    console.error('Error deleting product:', error);
    return handleAxiosError(error);
  }
};

/**
 * Get single product details
 */
export const getProduct = async (id: string, token: string) => {
  try {
    const response = await axios.get(`${BACKEND_URL}/store-products/${id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.data;
  } catch (error: any) {
    console.error('Error getting product:', error);
    return handleAxiosError(error);
  }
};

// ===========================================
// EMBED CODE MANAGEMENT API
// ===========================================

/**
 * Get all embed codes for a store
 */
export const getStoreEmbedCodes = async (storeId: string, token: string) => {
  try {
    const response = await axios.get(`${API_URL}/embed/store/${storeId}/embed-codes`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.data;
  } catch (error: any) {
    console.error('Error fetching store embed codes:', error);
    return handleAxiosError(error);
  }
};

/**
 * Create new embed code
 */
export const createEmbedCode = async (storeId: string, embedData: any, token: string) => {
  try {
    const response = await axios.post(`${API_URL}/embed/store/${storeId}/embed-codes`, embedData, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.data;
  } catch (error: any) {
    console.error('Error creating embed code:', error);
    return handleAxiosError(error);
  }
};

/**
 * Update embed code
 */
export const updateEmbedCode = async (storeId: string, embedCodeId: string, embedData: any, token: string) => {
  try {
    const response = await axios.put(`${API_URL}/embed/store/${storeId}/embed-codes/${embedCodeId}`, embedData, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.data;
  } catch (error: any) {
    console.error('Error updating embed code:', error);
    return handleAxiosError(error);
  }
};

/**
 * Delete embed code
 */
export const deleteEmbedCode = async (storeId: string, embedCodeId: string, token: string) => {
  try {
    const response = await axios.delete(`${API_URL}/embed/store/${storeId}/embed-codes/${embedCodeId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.data;
  } catch (error: any) {
    console.error('Error deleting embed code:', error);
    return handleAxiosError(error);
  }
};

/**
 * Toggle embed code active status
 */
export const toggleEmbedCodeStatus = async (storeId: string, embedCodeId: string, isActive: boolean, token: string) => {
  try {
    const response = await axios.patch(`${API_URL}/embed/store/${storeId}/embed-codes/${embedCodeId}/toggle`, 
      { is_active: isActive }, 
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );
    return response.data;
  } catch (error: any) {
    console.error('Error toggling embed code status:', error);
    return handleAxiosError(error);
  }
};

/**
 * Get public embed code data (no authentication required)
 */
export const getPublicEmbedCode = async (embedCode: string) => {
  try {
    const response = await axios.get(`${API_URL}/embed/public/${embedCode}`);
    return response.data;
  } catch (error: any) {
    console.error('Error fetching public embed code:', error);
    return handleAxiosError(error);
  }
};

/**
 * Process embed code purchase (no authentication required)
 */
export const processEmbedPurchase = async (embedCode: string, purchaseData: any) => {
  try {
    const response = await axios.post(`${API_URL}/embed/public/${embedCode}/purchase`, purchaseData);
    return response.data;
  } catch (error: any) {
    console.error('Error processing embed purchase:', error);
    return handleAxiosError(error);
  }
};

// ========================
// QR CODE API FUNCTIONS
// ========================

/**
 * Get scanned QR codes for store
 */
export const getStoreScannedQRs = async (storeId: string) => {
  try {
    const token = localStorage.getItem('authToken');
    const response = await axios.get(`${API_URL}/qr/store/${storeId}/scanned`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error: any) {
    console.error('Error fetching store scanned QRs:', error);
    return handleAxiosError(error);
  }
};

/**
 * Scan QR code
 */
export const scanQRCode = async (storeId: string, qrData: string) => {
  try {
    const token = localStorage.getItem('authToken');
    const response = await axios.post(`${API_URL}/qr/store/${storeId}/scan`, 
      { qrData },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  } catch (error: any) {
    console.error('Error scanning QR code:', error);
    return handleAxiosError(error);
  }
};

/**
 * Get QR scan statistics
 */
export const getQRScanStats = async (storeId: string) => {
  try {
    const token = localStorage.getItem('authToken');
    const response = await axios.get(`${API_URL}/qr/store/${storeId}/stats`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error: any) {
    console.error('Error fetching QR scan stats:', error);
    return handleAxiosError(error);
  }
};

export default api; 