"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { Store, ShieldCheck, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import axios from 'axios';

export default function MitraLoginPage() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpValue, setOtpValue] = useState('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [showOtpInput, setShowOtpInput] = useState(false);

  // Handle perubahan input
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPhoneNumber(value);
    
    // Hapus error jika ada
    if (errors.phone_number) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.phone_number;
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

  // Validasi nomor telepon
  const validatePhone = () => {
    if (!phoneNumber.trim()) {
      setErrors({ phone_number: "Nomor telepon wajib diisi" });
      return false;
    }
    
    if (!/^08\d{8,11}$/.test(phoneNumber)) {
      setErrors({ phone_number: "Format nomor telepon tidak valid (contoh: 08123456789)" });
      return false;
    }
    
    return true;
  };

  // Kirim OTP
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validatePhone()) return;
    
    setIsSubmitting(true);
    setErrors({});
    
    try {
      const response = await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_URL}/stores/login`, {
        phone_number: phoneNumber
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

  // Verifikasi OTP dan Login
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!otpValue.trim()) {
      setErrors({ otp_code: 'Kode OTP wajib diisi' });
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/stores/login/verify`,
        {
          phone_number: phoneNumber,
          otp_code: otpValue,
        }
      );

      if (response.data.success) {
        setSubmitStatus('success');
        setStatusMessage('Login berhasil! Mengarahkan ke dashboard...');

        // Simpan token
        localStorage.setItem('authToken', response.data.token);
        localStorage.setItem('userType', 'mitra');
        const userPayload = { store: response.data.store };
        localStorage.setItem('userData', JSON.stringify(userPayload));

        // Redirect ke dashboard mitra
        setTimeout(() => {
          window.location.href = response.data.redirect_url;
        }, 1500);
      }
    } catch (error: any) {
      setSubmitStatus('error');
      const errorMessage =
        error.response?.data?.message || 'Gagal login. Silakan coba lagi.';
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
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
              Login Mitra
            </h1>
            <p className="text-gray-600">
              Masuk ke dashboard toko Anda
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
                {/* Phone Number Input */}
                <div>
                  <label htmlFor="phone_number" className="block text-sm font-medium text-gray-700 mb-2">
                    Nomor WhatsApp <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    id="phone_number"
                    name="phone_number"
                    value={phoneNumber}
                    onChange={handlePhoneChange}
                    disabled={otpSent}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${
                      errors.phone_number ? 'border-red-300' : 'border-gray-300'
                    } ${otpSent ? 'bg-gray-50' : ''}`}
                    placeholder="Contoh: 08123456789"
                  />
                  {errors.phone_number && (
                    <p className="mt-1 text-sm text-red-600">{errors.phone_number}</p>
                  )}
                </div>

                {/* OTP Input */}
                {showOtpInput && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    transition={{ duration: 0.3 }}
                  >
                    <label htmlFor="otp_code" className="block text-sm font-medium text-gray-700 mb-2">
                      Kode OTP <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="otp_code"
                      name="otp_code"
                      value={otpValue}
                      onChange={handleOtpChange}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${
                        errors.otp_code ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Masukkan 6 digit kode OTP"
                      maxLength={6}
                    />
                    {errors.otp_code && (
                      <p className="mt-1 text-sm text-red-600">{errors.otp_code}</p>
                    )}
                    <p className="mt-2 text-sm text-gray-600">
                      Kode OTP telah dikirim ke WhatsApp {phoneNumber}
                    </p>
                  </motion.div>
                )}

                {/* Submit Button */}
                <div>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`w-full py-3 px-4 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors flex items-center justify-center ${
                      submitStatus === 'success'
                        ? 'bg-green-600 hover:bg-green-700 text-white'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    } ${isSubmitting ? 'opacity-75 cursor-not-allowed' : ''}`}
                  >
                    {isSubmitting ? (
                      <span className="flex items-center">
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Memproses...
                      </span>
                    ) : otpSent ? (
                      <span className="flex items-center">
                        Login
                        <ArrowRight className="w-5 h-5 ml-2" />
                      </span>
                    ) : (
                      'Kirim Kode OTP'
                    )}
                  </button>
                </div>

                {/* Don't have account */}
                <div className="text-center">
                  <p className="text-gray-600">
                    Belum punya akun mitra?{' '}
                    <Link href="/stores/register" className="text-indigo-600 font-medium hover:underline">
                      Daftar di sini
                    </Link>
                  </p>
                </div>
              </form>
            </div>

            {/* Features */}
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 border-t border-indigo-100">
              <div className="flex items-center justify-center space-x-8">
                <div className="flex items-center">
                  <div className="bg-indigo-100 p-2 rounded-full mr-2">
                    <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  </div>
                  <span className="text-sm text-gray-700">Login Aman</span>
                </div>
                <div className="flex items-center">
                  <div className="bg-indigo-100 p-2 rounded-full mr-2">
                    <Store className="w-4 h-4 text-indigo-600" />
                  </div>
                  <span className="text-sm text-gray-700">Dashboard Mitra</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Back to Home */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="text-center mt-8"
          >
            <Link href="/" className="text-gray-600 hover:text-indigo-600 transition-colors">
              ← Kembali ke Beranda
            </Link>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
