"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ChevronLeft, CheckCircle, AlertCircle, HelpCircle, FileText, Clock, CreditCard, Shield, Award } from "lucide-react";

export default function AuctionGuidePage() {
  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  // Content sections
  const faqItems = [
    {
      question: "Bagaimana cara memenangkan lelang?",
      answer: "Penawaran tertinggi pada saat lelang berakhir akan memenangkan lelang. Pastikan untuk memantau status lelang secara berkala dan tingkatkan penawaran Anda jika diperlukan."
    },
    {
      question: "Apa yang terjadi jika saya memenangkan lelang?",
      answer: "Jika Anda memenangkan lelang, Anda akan menerima notifikasi melalui email dan pada akun Anda. Anda akan diberikan instruksi mengenai cara pembayaran dan pengiriman produk digital."
    },
    {
      question: "Bisakah saya membatalkan penawaran?",
      answer: "Penawaran yang sudah diajukan tidak dapat dibatalkan. Pastikan Anda yakin dengan harga yang Anda tawarkan sebelum mengajukan penawaran."
    },
    {
      question: "Bagaimana jika terjadi masalah teknis saat lelang?",
      answer: "Jika terjadi masalah teknis, silakan hubungi tim dukungan kami segera. Kami akan berusaha menyelesaikan masalah secepat mungkin."
    }
  ];

  return (
    <main className="min-h-screen py-16 bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] bg-repeat opacity-5 -z-10"></div>
      
      <div className="container mx-auto px-4">
        {/* Back button */}
        <Link 
          href="/auctions"
          className="inline-flex items-center text-indigo-600 hover:text-indigo-800 font-medium mb-8 transition-colors duration-200"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          <span>Kembali ke Lelang</span>
        </Link>

        {/* Page header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-16 text-center"
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-purple-800 via-indigo-700 to-purple-700 bg-clip-text text-transparent">
            Panduan Lelang Digital
          </h1>
          <p className="text-gray-600 max-w-3xl mx-auto text-lg">
            Panduan lengkap tentang cara mengikuti lelang digital, syarat dan ketentuan, serta tips untuk memenangkan lelang.
          </p>
        </motion.div>

        {/* Main content */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12"
        >
          {/* How To Participate Section */}
          <motion.div 
            variants={itemVariants}
            className="bg-white rounded-xl shadow-lg p-8 h-fit"
          >
            <div className="flex items-center mb-6">
              <div className="flex-shrink-0 h-12 w-12 flex items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                <HelpCircle className="w-6 h-6" />
              </div>
              <h2 className="ml-4 text-2xl font-bold text-gray-800">Cara Mengikuti Lelang</h2>
            </div>
            
            <ol className="space-y-4">
              <li className="flex">
                <div className="flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-full bg-indigo-100 text-indigo-600 font-bold mr-3">
                  1
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">Buat Akun</h3>
                  <p className="text-gray-600">Registrasi akun di platform kami dengan mengisi data diri yang valid.</p>
                </div>
              </li>
              <li className="flex">
                <div className="flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-full bg-indigo-100 text-indigo-600 font-bold mr-3">
                  2
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">Verifikasi Akun</h3>
                  <p className="text-gray-600">Lakukan verifikasi melalui email dan nomor telepon untuk mengaktifkan fitur lelang.</p>
                </div>
              </li>
              <li className="flex">
                <div className="flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-full bg-indigo-100 text-indigo-600 font-bold mr-3">
                  3
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">Pilih Lelang</h3>
                  <p className="text-gray-600">Pilih produk digital yang ingin Anda ikuti lelangnya.</p>
                </div>
              </li>
              <li className="flex">
                <div className="flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-full bg-indigo-100 text-indigo-600 font-bold mr-3">
                  4
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">Ajukan Penawaran</h3>
                  <p className="text-gray-600">Masukkan jumlah penawaran Anda sesuai dengan ketentuan minimum penawaran.</p>
                </div>
              </li>
              <li className="flex">
                <div className="flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-full bg-indigo-100 text-indigo-600 font-bold mr-3">
                  5
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">Pantau Status Lelang</h3>
                  <p className="text-gray-600">Pantau status lelang dan tingkatkan penawaran jika diperlukan.</p>
                </div>
              </li>
            </ol>
          </motion.div>

          {/* Terms and Conditions Section */}
          <motion.div 
            variants={itemVariants}
            className="bg-white rounded-xl shadow-lg p-8 h-fit"
          >
            <div className="flex items-center mb-6">
              <div className="flex-shrink-0 h-12 w-12 flex items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                <FileText className="w-6 h-6" />
              </div>
              <h2 className="ml-4 text-2xl font-bold text-gray-800">Syarat & Ketentuan</h2>
            </div>
            
            <ul className="space-y-4">
              <li className="flex">
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-gray-800">Persyaratan Peserta</h3>
                  <p className="text-gray-600">Peserta lelang harus berusia minimal 17 tahun dan memiliki akun terverifikasi.</p>
                </div>
              </li>
              <li className="flex">
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-gray-800">Jaminan Penawaran</h3>
                  <p className="text-gray-600">Peserta harus memiliki saldo yang cukup untuk mengajukan penawaran.</p>
                </div>
              </li>
              <li className="flex">
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-gray-800">Penawaran Mengikat</h3>
                  <p className="text-gray-600">Semua penawaran yang diajukan bersifat mengikat dan tidak dapat dibatalkan.</p>
                </div>
              </li>
              <li className="flex">
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-gray-800">Kenaikan Penawaran</h3>
                  <p className="text-gray-600">Kenaikan penawaran harus memenuhi minimal kenaikan yang ditentukan untuk setiap produk.</p>
                </div>
              </li>
              <li className="flex">
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-gray-800">Batas Waktu Pembayaran</h3>
                  <p className="text-gray-600">Pemenang lelang harus melakukan pembayaran dalam waktu 24 jam setelah lelang berakhir.</p>
                </div>
              </li>
              <li className="flex">
                <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-gray-800">Sanksi</h3>
                  <p className="text-gray-600">Pemenang yang tidak melakukan pembayaran akan dikenakan sanksi berupa pemblokiran akun.</p>
                </div>
              </li>
            </ul>
          </motion.div>

          {/* Benefits Section */}
          <motion.div 
            variants={itemVariants}
            className="bg-white rounded-xl shadow-lg p-8 h-fit"
          >
            <div className="flex items-center mb-6">
              <div className="flex-shrink-0 h-12 w-12 flex items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                <Award className="w-6 h-6" />
              </div>
              <h2 className="ml-4 text-2xl font-bold text-gray-800">Keuntungan Lelang Digital</h2>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="flex">
                <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-full bg-green-100 text-green-600 mr-3">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">Efisiensi Waktu</h3>
                  <p className="text-gray-600">Ikuti lelang dari mana saja tanpa harus hadir secara fisik.</p>
                </div>
              </div>
              <div className="flex">
                <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-full bg-blue-100 text-blue-600 mr-3">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">Harga Kompetitif</h3>
                  <p className="text-gray-600">Dapatkan produk digital premium dengan harga yang kompetitif.</p>
                </div>
              </div>
              <div className="flex">
                <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-full bg-purple-100 text-purple-600 mr-3">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">Keamanan Transaksi</h3>
                  <p className="text-gray-600">Semua transaksi diproses dengan sistem yang aman dan terpercaya.</p>
                </div>
              </div>
              <div className="flex">
                <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-full bg-yellow-100 text-yellow-600 mr-3">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">Produk Premium</h3>
                  <p className="text-gray-600">Semua produk digital dijamin keaslian dan kualitasnya.</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* FAQ Section */}
          <motion.div 
            variants={itemVariants}
            className="bg-white rounded-xl shadow-lg p-8 h-fit"
          >
            <div className="flex items-center mb-6">
              <div className="flex-shrink-0 h-12 w-12 flex items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                <HelpCircle className="w-6 h-6" />
              </div>
              <h2 className="ml-4 text-2xl font-bold text-gray-800">Pertanyaan Umum</h2>
            </div>
            
            <div className="space-y-6">
              {faqItems.map((item, index) => (
                <div key={index} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                  <h3 className="font-semibold text-gray-800 mb-2">{item.question}</h3>
                  <p className="text-gray-600">{item.answer}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>

        {/* Contact Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="mt-16 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl shadow-xl overflow-hidden"
        >
          <div className="p-8 flex flex-col md:flex-row items-center justify-between">
            <div className="mb-6 md:mb-0 text-white">
              <h3 className="text-2xl font-bold mb-2">Butuh Bantuan?</h3>
              <p className="text-purple-100">Tim kami siap membantu Anda dengan pertanyaan seputar lelang digital</p>
            </div>
            <Link 
              href="/contact"
              className="px-6 py-3 bg-white text-indigo-700 rounded-full font-medium hover:bg-indigo-50 transform hover:scale-105 transition-all duration-300 shadow-md"
            >
              Hubungi Kami
            </Link>
          </div>
        </motion.div>
      </div>
    </main>
  );
} 