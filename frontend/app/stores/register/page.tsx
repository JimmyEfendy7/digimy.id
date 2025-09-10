"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { Store, ShieldCheck, AlertCircle, BadgeCheck, Loader2 } from 'lucide-react';
import axios from 'axios';

export default function StoreRegistrationPage() {
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    phone_number: '',
    email: '',
    address: '',
  });
  
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpValue, setOtpValue] = useState('');
  const [showOtpInput, setShowOtpInput] = useState(false);
  
  // Fungsi untuk menghasilkan slug dari nama
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^\w\s]/gi, '')
      .replace(/\s+/gi, '-');
  };
  
  // Handle perubahan input
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // Jika mengubah nama, otomatis update slug
    if (name === 'name') {
      const generatedSlug = generateSlug(value);
      setFormData((prev) => ({
        ...prev,
        [name]: value,
        slug: generatedSlug,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
    
    // Hapus error untuk field yang diubah
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };
  
  // Validasi form
  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};
    
    if (!formData.name.trim()) {
      newErrors.name = "Nama toko wajib diisi";
    }
    
    if (!formData.slug.trim()) {
      newErrors.slug = "Slug toko wajib diisi";
    } else if (!/^[a-z0-9-]+$/g.test(formData.slug)) {
      newErrors.slug = "Slug hanya boleh berisi huruf kecil, angka, dan tanda -";
    }
    
    if (!formData.phone_number.trim()) {
      newErrors.phone_number = "Nomor telepon wajib diisi";
    } else if (!/^08[0-9]{8,11}$/g.test(formData.phone_number)) {
      newErrors.phone_number = "Format nomor telepon tidak valid (contoh: 081234567890)";
    }
    
    if (!formData.email.trim()) {
      newErrors.email = "Email wajib diisi";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Format email tidak valid";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Mengirim OTP ke WhatsApp
  const sendOtp = async () => {
    if (!validateForm()) return;
    
    try {
      setIsSubmitting(true);
      
      // Panggil API untuk mengirim OTP
      const { sendStoreRegisterOtp } = await import('../../lib/api');
      const response = await sendStoreRegisterOtp(formData.phone_number);
      
      if (response && response.success) {
        setOtpSent(true);
        setShowOtpInput(true);
        setStatusMessage(response.message);
      } else if (response) {
        throw new Error(response.message || 'Terjadi kesalahan saat mengirim OTP');
      } else {
        // Jika tidak ada respons yang valid
        throw new Error('Tidak dapat terhubung ke server');
      }
      
    } catch (error: any) {
      console.error('Error sending OTP:', error);
      setSubmitStatus('error');
      
      // Jika OTP mungkin sudah terkirim meskipun ada error
      if (error.message && error.message.includes('serialize')) {
        setOtpSent(true);
        setShowOtpInput(true);
        setStatusMessage('Kode OTP mungkin telah dikirim ke WhatsApp Anda. Silakan cek dan masukkan kode yang diterima.');
      } else {
        setStatusMessage(error.message || 'Gagal mengirim kode OTP. Silakan coba lagi.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!otpSent) {
      sendOtp();
      return;
    }
    
    if (!otpValue || otpValue.length !== 6) {
      setErrors((prev) => ({
        ...prev,
        otp: "Kode OTP harus 6 digit"
      }));
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Panggil API untuk registrasi toko
      const { registerMitraStore } = await import('../../lib/api');
      const response = await registerMitraStore({
        store_name: formData.name,
        slug: formData.slug,
        description: formData.description,
        phone_number: formData.phone_number,
        email: formData.email,
        address: formData.address,
        otp_code: otpValue
      });
      
      if (response && response.success) {
        setSubmitStatus('success');
        setStatusMessage('Pendaftaran berhasil! Silakan tunggu verifikasi dari admin.');
        
        // Simpan data login di localStorage atau state global
        localStorage.setItem('authToken', response.token);
        localStorage.setItem('userData', JSON.stringify({ store: response.store }));
        
        // Redirect ke halaman dashboard mitra setelah 2 detik
        setTimeout(() => {
          window.location.href = `/stores/mitra/${response.store.slug}`;
        }, 2000);
      } else {
        throw new Error(response.message);
      }
      
    } catch (error: any) {
      console.error('Error registering store:', error);
      setSubmitStatus('error');
      setStatusMessage(error.message || 'Gagal mendaftar. Silakan coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-indigo-700 to-purple-700 bg-clip-text text-transparent">
              Daftar Sebagai Mitra DIGIPRO
            </h1>
            <p className="mt-3 text-gray-600">
              Jadilah mitra resmi dan jual produk digital Anda di platform DIGIPRO
            </p>
          </div>
          
          {submitStatus === 'success' ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl shadow-xl p-8 text-center"
            >
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <BadgeCheck className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Pendaftaran Berhasil!</h2>
              <p className="text-gray-600 mb-6">
                Terima kasih telah mendaftar sebagai mitra DIGIPRO. Tim kami akan memverifikasi
                data Anda dan menghubungi melalui WhatsApp.
              </p>
              <Link
                href="/"
                className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
              >
                Kembali ke Beranda
              </Link>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl shadow-xl overflow-hidden"
            >
              {/* Form Container */}
              <div className="p-6 md:p-8">
                <form onSubmit={handleSubmit}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Nama Toko */}
                    <div>
                      <label htmlFor="name" className="block text-gray-700 font-medium mb-2">
                        Nama Toko <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        className={`w-full px-4 py-3 rounded-lg border ${
                          errors.name ? 'border-red-500' : 'border-gray-300'
                        } focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                        placeholder="Nama toko Anda"
                        disabled={isSubmitting}
                      />
                      {errors.name && (
                        <p className="mt-1 text-red-500 text-sm">{errors.name}</p>
                      )}
                    </div>
                    
                    {/* Slug */}
                    <div>
                      <label htmlFor="slug" className="block text-gray-700 font-medium mb-2">
                        Slug <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="slug"
                        name="slug"
                        value={formData.slug}
                        onChange={handleChange}
                        className={`w-full px-4 py-3 rounded-lg border ${
                          errors.slug ? 'border-red-500' : 'border-gray-300'
                        } focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50`}
                        placeholder="slug-toko-anda"
                        disabled={isSubmitting}
                      />
                      {errors.slug ? (
                        <p className="mt-1 text-red-500 text-sm">{errors.slug}</p>
                      ) : (
                        <p className="mt-1 text-gray-500 text-sm">
                          URL toko: digipro.id/stores/{formData.slug}
                        </p>
                      )}
                    </div>
                    
                    {/* Nomor Telepon */}
                    <div>
                      <label htmlFor="phone_number" className="block text-gray-700 font-medium mb-2">
                        Nomor WhatsApp <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        id="phone_number"
                        name="phone_number"
                        value={formData.phone_number}
                        onChange={handleChange}
                        className={`w-full px-4 py-3 rounded-lg border ${
                          errors.phone_number ? 'border-red-500' : 'border-gray-300'
                        } focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                        placeholder="08123456789"
                        disabled={isSubmitting || otpSent}
                      />
                      {errors.phone_number ? (
                        <p className="mt-1 text-red-500 text-sm">{errors.phone_number}</p>
                      ) : (
                        <p className="mt-1 text-gray-500 text-sm">
                          Nomor WhatsApp akan digunakan untuk login dan OTP
                        </p>
                      )}
                    </div>
                    
                    {/* Email */}
                    <div>
                      <label htmlFor="email" className="block text-gray-700 font-medium mb-2">
                        Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className={`w-full px-4 py-3 rounded-lg border ${
                          errors.email ? 'border-red-500' : 'border-gray-300'
                        } focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                        placeholder="email@example.com"
                        disabled={isSubmitting}
                      />
                      {errors.email && (
                        <p className="mt-1 text-red-500 text-sm">{errors.email}</p>
                      )}
                    </div>
                    
                    {/* Alamat */}
                    <div className="md:col-span-2">
                      <label htmlFor="address" className="block text-gray-700 font-medium mb-2">
                        Alamat
                      </label>
                      <textarea
                        id="address"
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Alamat lengkap toko"
                        rows={3}
                        disabled={isSubmitting}
                      />
                    </div>
                    
                    {/* Deskripsi */}
                    <div className="md:col-span-2">
                      <label htmlFor="description" className="block text-gray-700 font-medium mb-2">
                        Deskripsi Toko
                      </label>
                      <textarea
                        id="description"
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Deskripsi singkat tentang toko Anda"
                        rows={4}
                        disabled={isSubmitting}
                      />
                    </div>
                    
                    {/* OTP Input */}
                    {showOtpInput && (
                      <div className="md:col-span-2">
                        <label htmlFor="otp" className="block text-gray-700 font-medium mb-2">
                          Kode OTP <span className="text-red-500">*</span>
                        </label>
                        <div className="flex space-x-4">
                          <input
                            type="text"
                            id="otp"
                            name="otp"
                            value={otpValue}
                            onChange={(e) => setOtpValue(e.target.value)}
                            className={`w-full px-4 py-3 rounded-lg border ${
                              errors.otp ? 'border-red-500' : 'border-gray-300'
                            } focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center text-lg font-bold tracking-wider`}
                            placeholder="Masukkan kode 6 digit"
                            maxLength={6}
                            disabled={isSubmitting}
                          />
                          <button
                            type="button"
                            onClick={sendOtp}
                            disabled={isSubmitting}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium text-sm"
                          >
                            Kirim Ulang
                          </button>
                        </div>
                        {errors.otp && (
                          <p className="mt-1 text-red-500 text-sm">{errors.otp}</p>
                        )}
                        <p className="mt-1 text-gray-500 text-sm">
                          Kode OTP telah dikirim ke WhatsApp {formData.phone_number}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {/* Status Message */}
                  {submitStatus === 'error' && (
                    <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
                      <AlertCircle className="w-5 h-5 text-red-500 mr-3 flex-shrink-0 mt-0.5" />
                      <p className="text-red-700">{statusMessage}</p>
                    </div>
                  )}
                  
                  {/* Submit Button */}
                  <div className="mt-8">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className={`w-full py-3 px-6 ${
                        otpSent
                          ? 'bg-green-600 hover:bg-green-700'
                          : 'bg-indigo-600 hover:bg-indigo-700'
                      } text-white rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors`}
                    >
                      {isSubmitting ? (
                        <span className="flex items-center justify-center">
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Memproses...
                        </span>
                      ) : otpSent ? (
                        'Daftar Sekarang'
                      ) : (
                        'Kirim Kode OTP'
                      )}
                    </button>
                  </div>
                  
                  {/* Already have account */}
                  <div className="mt-6 text-center">
                    <p className="text-gray-600">
                      Sudah punya akun mitra?{' '}
                      <Link href="/stores/login" className="text-indigo-600 font-medium hover:underline">
                        Login di sini
                      </Link>
                    </p>
                  </div>
                  
                  {/* Disclaimer */}
                  <div className="mt-6 text-center text-sm text-gray-500">
                    <p>
                      Dengan mendaftar, Anda menyetujui{' '}
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
                </form>
              </div>
              
              {/* Features */}
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 md:p-8 border-t border-indigo-100">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Keuntungan Menjadi Mitra DIGIPRO
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="flex items-start">
                    <div className="bg-indigo-100 p-2 rounded-full mr-3">
                      <ShieldCheck className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-800">Transaksi Aman</h4>
                      <p className="text-sm text-gray-600">
                        Pembayaran diproses dengan sistem terenkripsi dan aman
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="bg-indigo-100 p-2 rounded-full mr-3">
                      <Store className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-800">Halaman Toko</h4>
                      <p className="text-sm text-gray-600">
                        Dapatkan halaman toko khusus dengan URL unik
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="bg-indigo-100 p-2 rounded-full mr-3">
                      <BadgeCheck className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-800">Verifikasi Resmi</h4>
                      <p className="text-sm text-gray-600">
                        Tingkatkan kepercayaan pembeli dengan status terverifikasi
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
} 