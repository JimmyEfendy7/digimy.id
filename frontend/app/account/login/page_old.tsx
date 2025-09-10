"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { AlertCircle, Loader2, LogIn } from 'lucide-react';
import { sendLoginOtp, verifyLoginOtp } from '../../lib/api';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Handle mengirim OTP
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validasi nomor telepon
    if (!phoneNumber || !/^08[0-9]{8,11}$/.test(phoneNumber)) {
      setError('Format nomor telepon tidak valid. Gunakan format: 08xxxxxxxxxx');
      return;
    }
    
    setError('');
    setIsSubmitting(true);
    
    try {
      // Panggil API untuk mengirim OTP
      const response = await sendLoginOtp(phoneNumber);
      
      if (response && response.success) {
        setOtpSent(true);
        setSuccessMessage(response.message);
      } else if (response) {
        throw new Error(response.message || 'Terjadi kesalahan saat mengirim OTP');
      } else {
        // Jika tidak ada respons yang valid
        throw new Error('Tidak dapat terhubung ke server');
      }
    } catch (error: any) {
      console.error('Error sending OTP:', error);
      
      // Jika OTP mungkin sudah terkirim meskipun ada error
      if (error.message && error.message.includes('serialize')) {
        setOtpSent(true);
        setSuccessMessage('Kode OTP mungkin telah dikirim ke WhatsApp Anda. Silakan cek dan masukkan kode yang diterima.');
      } else {
        setError(error.message || 'Gagal mengirim kode OTP. Silakan coba lagi.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle verifikasi OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validasi kode OTP
    if (!otpCode || otpCode.length !== 6) {
      setError('Kode OTP harus 6 digit');
      return;
    }
    
    setError('');
    setIsSubmitting(true);
    
    try {
      // Panggil API untuk verifikasi OTP
      const response = await verifyLoginOtp(phoneNumber, otpCode);
      
      if (response.success) {
        setSuccessMessage('Login berhasil! Mengalihkan...');
        
        // Simpan data login di localStorage
        localStorage.setItem('authToken', response.data.accessToken);
        localStorage.setItem('userData', JSON.stringify(response.data));
        
        // Redirect berdasarkan tipe pengguna
        setTimeout(() => {
          if (response.data.type === 'store') {
            router.push(`/stores/${response.data.store.slug}`);
          } else {
            router.push('/');
          }
        }, 1500);
      } else {
        throw new Error(response.message);
      }
    } catch (error: any) {
      console.error('Error verifying OTP:', error);
      setError(error.message || 'Gagal verifikasi kode OTP. Silakan coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-16 flex items-center">
      <div className="container mx-auto px-4">
        <div className="max-w-md mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-700 to-purple-700 bg-clip-text text-transparent">
              Login ke DIGIPRO
            </h1>
            <p className="mt-3 text-gray-600">
              Masuk dengan nomor WhatsApp Anda
            </p>
          </div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-xl overflow-hidden"
          >
            <div className="p-6 md:p-8">
              {!otpSent ? (
                <form onSubmit={handleSendOtp}>
                  {/* Nomor Telepon */}
                  <div className="mb-6">
                    <label htmlFor="phoneNumber" className="block text-gray-700 font-medium mb-2">
                      Nomor WhatsApp <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      id="phoneNumber"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="08123456789"
                      disabled={isSubmitting}
                      required
                    />
                    <p className="mt-1 text-gray-500 text-sm">
                      Kode verifikasi akan dikirim ke WhatsApp Anda
                    </p>
                  </div>
                  
                  {/* Error Message */}
                  {error && (
                    <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
                      <AlertCircle className="w-5 h-5 text-red-500 mr-3 flex-shrink-0 mt-0.5" />
                      <p className="text-red-700">{error}</p>
                    </div>
                  )}
                  
                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center justify-center">
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Mengirim Kode OTP...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center">
                        <LogIn className="w-5 h-5 mr-2" />
                        Kirim Kode OTP
                      </span>
                    )}
                  </button>
                  
                  {/* Register Link */}
                  <div className="mt-6 text-center">
                    <p className="text-gray-600">
                      Belum punya akun?{' '}
                      <Link href="/account/register" className="text-indigo-600 font-medium hover:underline">
                        Daftar di sini
                      </Link>
                    </p>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp}>
                  {/* Success Message after OTP sent */}
                  {successMessage && (
                    <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
                      <p className="text-green-700">{successMessage}</p>
                    </div>
                  )}
                  
                  {/* OTP Input */}
                  <div className="mb-6">
                    <label htmlFor="otpCode" className="block text-gray-700 font-medium mb-2">
                      Kode OTP <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="otpCode"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center text-lg font-bold tracking-wider"
                      placeholder="Masukkan 6 digit kode"
                      maxLength={6}
                      disabled={isSubmitting}
                      required
                    />
                  </div>
                  
                  {/* Error Message */}
                  {error && (
                    <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
                      <AlertCircle className="w-5 h-5 text-red-500 mr-3 flex-shrink-0 mt-0.5" />
                      <p className="text-red-700">{error}</p>
                    </div>
                  )}
                  
                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 px-6 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center justify-center">
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Verifikasi...
                      </span>
                    ) : (
                      'Verifikasi & Login'
                    )}
                  </button>
                  
                  {/* Resend OTP */}
                  <div className="mt-4 text-center">
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={isSubmitting}
                      className="text-indigo-600 font-medium hover:underline"
                    >
                      Kirim Ulang Kode OTP
                    </button>
                  </div>
                </form>
              )}
            </div>
            
            {/* Footer */}
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 border-t border-indigo-100 text-center">
              <p className="text-sm text-gray-600">
                Dengan masuk, Anda menyetujui{' '}
                <Link href="/terms" className="text-indigo-600 hover:underline">
                  Syarat & Ketentuan
                </Link>{' '}
                dan{' '}
                <Link href="/privacy" className="text-indigo-600 hover:underline">
                  Kebijakan Privasi
                </Link>{' '}
                kami.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
} 