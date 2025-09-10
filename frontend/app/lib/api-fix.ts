import axios from 'axios';

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

// Fungsi untuk memeriksa status transaksi dengan penanganan error yang lebih baik
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