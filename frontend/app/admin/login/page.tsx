"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { ShieldCheck, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import axios from 'axios';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpValue, setOtpValue] = useState('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [showOtpInput, setShowOtpInput] = useState(false);

  // Handle change input
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPhoneNumber(value);
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
    if (errors.otp_code) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.otp_code;
        return newErrors;
      });
    }
  };

  // Validate phone
  const validatePhone = () => {
    if (!phoneNumber.trim()) {
      setErrors({ phone_number: 'Nomor telepon wajib diisi' });
      return false;
    }
    if (!/^08\d{8,11}$/.test(phoneNumber)) {
      setErrors({ phone_number: 'Format nomor telepon tidak valid (contoh: 08123456789)' });
      return false;
    }
    return true;
  };

  // Send OTP
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatePhone()) return;
    setIsSubmitting(true);
    setErrors({});
    try {
      const response = await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_URL}/admin/send-login-otp`, {
        phone_number: phoneNumber,
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

  // Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpValue.trim()) {
      setErrors({ otp_code: 'Kode OTP wajib diisi' });
      return;
    }
    setIsSubmitting(true);
    setErrors({});
    try {
      const response = await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_URL}/admin/verify-login-otp`, {
        phone_number: phoneNumber,
        otp_code: otpValue,
      });
      if (response.data.success) {
        // Save token and admin info
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('adminData', JSON.stringify(response.data.admin));
        setSubmitStatus('success');
        setStatusMessage('Login berhasil! Mengarahkan ke panel admin...');
        setTimeout(() => {
          router.push('/admin/panel');
        }, 1200);
      }
    } catch (error: any) {
      setSubmitStatus('error');
      if (error.response?.data?.message) {
        // If OTP expired, allow resend
        if (error.response.data.message.toLowerCase().includes('expired')) {
          setOtpSent(false);
          setShowOtpInput(false);
          setOtpValue('');
        }
        setStatusMessage(error.response.data.message);
      } else {
        setStatusMessage('Gagal verifikasi OTP. Silakan coba lagi.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md bg-white rounded-lg shadow-lg p-6"
      >
        <div className="flex flex-col items-center mb-6">
          <ShieldCheck className="w-12 h-12 text-indigo-600 mb-2" />
          <h1 className="text-2xl font-semibold text-gray-800">Admin Login</h1>
          <p className="text-sm text-gray-500">Masuk menggunakan OTP WhatsApp</p>
        </div>

        <form onSubmit={otpSent ? handleVerifyOtp : handleSendOtp} className="space-y-4">
          {/* Phone Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nomor WhatsApp</label>
            <input
              type="text"
              value={phoneNumber}
              onChange={handlePhoneChange}
              disabled={otpSent}
              placeholder="08xxxxxxxxxx"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${errors.phone_number ? 'border-red-500' : 'border-gray-300'}`}
            />
            {errors.phone_number && (
              <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" /> {errors.phone_number}
              </p>
            )}
          </div>

          {/* OTP Input */}
          {showOtpInput && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kode OTP</label>
              <input
                type="text"
                value={otpValue}
                onChange={handleOtpChange}
                placeholder="6 digit kode"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${errors.otp_code ? 'border-red-500' : 'border-gray-300'}`}
              />
              {errors.otp_code && (
                <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" /> {errors.otp_code}
                </p>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {otpSent ? 'Verifikasi & Masuk' : 'Kirim OTP'}
          </button>
        </form>

        {/* Status Message */}
        {submitStatus !== 'idle' && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`mt-4 text-center text-sm ${submitStatus === 'success' ? 'text-green-600' : 'text-red-600'}`}
          >
            {statusMessage}
          </motion.p>
        )}

        {/* Back to home link */}
        <div className="mt-6 text-center">
          <Link href="/" className="text-indigo-600 hover:underline flex items-center justify-center gap-1 text-sm">
            <ArrowRight className="w-4 h-4" /> Kembali ke Beranda
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
