"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { User, AlertCircle, Loader2, ArrowRight, Phone, Mail } from 'lucide-react';
import axios from 'axios';

export default function CustomerRegistrationPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone_number: '',
  });
  
  const [otpValue, setOtpValue] = useState('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [showOtpInput, setShowOtpInput] = useState(false);

  // Handle perubahan input
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    
    // Hapus error untuk field yang diubah
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setOtpValue(value);
    
    // Hapus error jika ada
    if (errors.otp_code) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.otp_code;
        return newErrors;
      });
    }
  };

  // Validasi form
  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};
    
    if (!formData.name.trim()) {
      newErrors.name = "Nama lengkap wajib diisi";
    }
    
    if (!formData.phone_number.trim()) {
      newErrors.phone_number = "Nomor telepon wajib diisi";
    } else if (!/^08\d{8,11}$/.test(formData.phone_number)) {
      newErrors.phone_number = "Format nomor telepon tidak valid (contoh: 08123456789)";
    }
    
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Format email tidak valid";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Kirim OTP untuk registrasi
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    setErrors({});
    
    try {
      const response = await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_URL}/account/register`, {
        phone_number: formData.phone_number
      });

      if (response.data.success) {
        setOtpSent(true);
        setShowOtpInput(true);
        setSubmitStatus('success');
        setStatusMessage('Kode OTP telah dikirim ke WhatsApp Anda');
      }
    } catch (error: any) {
      setSubmitStatus('error');
      if (error.response?.data?.message) {
        setStatusMessage(error.response.data.message);
      } else {
        setStatusMessage('Gagal mengirim OTP. Silakan coba lagi.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Verifikasi OTP dan registrasi
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!otpValue.trim()) {
      setErrors({ otp_code: "Kode OTP wajib diisi" });
      return;
    }
    
    setIsSubmitting(true);
    setErrors({});
    
    try {
      const response = await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_URL}/account/register/verify`, {
        name: formData.name,
        phone_number: formData.phone_number,
        email: formData.email,
        otp_code: otpValue
      });
      
      if (response.data.success) {
        setSubmitStatus('success');
        setStatusMessage('Registrasi berhasil! Mengarahkan ke halaman utama...');
        
        // Simpan token
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('userType', 'customer');
        localStorage.setItem('userData', JSON.stringify(response.data.user));
        
        // Redirect ke halaman utama
        setTimeout(() => {
          window.location.href = response.data.redirect_url;
        }, 1500);
      }
    } catch (error: any) {
      setSubmitStatus('error');
      const errorMessage = error.response?.data?.message || 'Registrasi gagal. Silakan coba lagi.';
      setStatusMessage(errorMessage);

      // Jika OTP kadaluarsa, kembalikan ke form awal
      if (errorMessage.includes('kadaluarsa')) {
        setOtpSent(false);
        setShowOtpInput(false);
        setOtpValue('');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-md">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-8"
          >
            <Link href="/" className="inline-block mb-6">
              <Image
                src="/logo.svg"
                alt="DIGIPRO"
                width={120}
                height={40}
                className="mx-auto"
              />
            </Link>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              Daftar Akun
            </h1>
            <p className="text-gray-600">
              Bergabunglah dengan DIGIPRO untuk berbelanja mudah
            </p>
          </motion.div>

          {/* Form Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-white rounded-2xl shadow-xl overflow-hidden"
          >
            <div className="p-6 md:p-8">
              {/* Status Messages */}
              {statusMessage && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`p-4 rounded-lg mb-6 flex items-center ${
                    submitStatus === 'success'
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}
                >
                  <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" />
                  <span>{statusMessage}</span>
                </motion.div>
              )}

              <form onSubmit={otpSent ? handleVerifyOtp : handleSendOtp} className="space-y-6">
                {/* Name Input */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    Nama Lengkap <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      disabled={otpSent}
                      className={`w-full pl-12 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                        errors.name ? 'border-red-500' : 'border-gray-300'
                      } ${otpSent ? 'bg-gray-50' : ''}`}
                      placeholder="Masukkan nama lengkap Anda"
                    />
                    <User className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2" />
                  </div>
                  {errors.name && (
                    <p className="text-red-500 text-sm mt-1">{errors.name}</p>
                  )}
                </div>

                {/* Phone Number Input */}
                <div>
                  <label htmlFor="phone_number" className="block text-sm font-medium text-gray-700 mb-2">
                    Nomor WhatsApp <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      id="phone_number"
                      name="phone_number"
                      value={formData.phone_number}
                      onChange={handleChange}
                      disabled={otpSent}
                      className={`w-full pl-12 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                        errors.phone_number ? 'border-red-500' : 'border-gray-300'
                      } ${otpSent ? 'bg-gray-50' : ''}`}
                      placeholder="08123456789"
                    />
                    <Phone className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2" />
                  </div>
                  {errors.phone_number && (
                    <p className="text-red-500 text-sm mt-1">{errors.phone_number}</p>
                  )}
                </div>

                {/* Email Input (Optional) */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email (Opsional)
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      disabled={otpSent}
                      className={`w-full pl-12 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                        errors.email ? 'border-red-500' : 'border-gray-300'
                      } ${otpSent ? 'bg-gray-50' : ''}`}
                      placeholder="nama@email.com"
                    />
                    <Mail className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2" />
                  </div>
                  {errors.email && (
                    <p className="text-red-500 text-sm mt-1">{errors.email}</p>
                  )}
                </div>

                {/* OTP Input (conditional) */}
                {showOtpInput && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    transition={{ duration: 0.3 }}
                    className="space-y-4"
                  >
                    <div>
                      <label htmlFor="otp_code" className="block text-sm font-medium text-gray-700 mb-2">
                        Kode OTP <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="otp_code"
                        value={otpValue}
                        onChange={handleOtpChange}
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-center text-xl tracking-widest ${
                          errors.otp_code ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="123456"
                        maxLength={6}
                      />
                      {errors.otp_code && (
                        <p className="text-red-500 text-sm mt-1">{errors.otp_code}</p>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <span>{otpSent ? 'Verifikasi & Daftar' : 'Kirim Kode OTP'}</span>
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </form>

              {/* Login Link */}
              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                  Sudah punya akun?{' '}
                  <Link href="/account/login" className="text-blue-600 hover:text-blue-700 font-medium">
                    Masuk di sini
                  </Link>
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
