"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Facebook, Instagram, Twitter, Linkedin, Mail, Phone, MapPin, ArrowRight, Shield, Award, Star } from "lucide-react";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 }
  };

  return (
    <footer className="relative overflow-hidden bg-gradient-to-b from-gray-900 to-indigo-900 text-white">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] bg-repeat opacity-[0.03] -z-10"></div>
      
      {/* Animated shine effect */}
      <motion.div 
        className="absolute -inset-10 bg-gradient-to-r from-transparent via-indigo-500/10 to-transparent -z-10"
        animate={{
          x: ["100%", "-100%"],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: "linear",
        }}
      />
      
      {/* Newsletter Section - Replaced with Join DIGIPRO */}
      <div className="container mx-auto px-4 pt-16">
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden bg-gradient-to-r from-indigo-800 via-purple-700 to-indigo-700 rounded-xl shadow-xl mb-16"
        >
          {/* Decorative elements */}
          <div className="absolute -right-10 -bottom-10 w-72 h-72 bg-gradient-to-br from-purple-500/40 to-blue-500/40 blur-3xl rounded-full z-0"></div>
          <div className="absolute -left-10 -top-10 w-72 h-72 bg-gradient-to-tr from-indigo-500/30 to-purple-500/30 blur-3xl rounded-full z-0"></div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0 relative z-10">
            {/* Left side - content */}
            <div className="p-8 md:p-10">
              <h3 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-blue-200 to-indigo-100 bg-clip-text text-transparent">
                Bergabung dengan DIGIPRO
              </h3>
              <p className="text-purple-100 mb-6 text-lg">
                Jual beli produk digital di DIGIPRO
              </p>
              <div className="space-y-4 mb-6">
                <div className="flex items-center">
                  <div className="bg-indigo-500/30 p-2 rounded-full mr-4">
                    <Shield className="w-5 h-5 text-indigo-200" />
                  </div>
                  <p className="text-indigo-100">Transaksi aman dan terpercaya</p>
                </div>
                <div className="flex items-center">
                  <div className="bg-indigo-500/30 p-2 rounded-full mr-4">
                    <Star className="w-5 h-5 text-indigo-200" />
                  </div>
                  <p className="text-indigo-100">Kualitas produk terjamin</p>
                </div>
                <div className="flex items-center">
                  <div className="bg-indigo-500/30 p-2 rounded-full mr-4">
                    <Award className="w-5 h-5 text-indigo-200" />
                  </div>
                  <p className="text-indigo-100">Terhubung dengan komunitas digital</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-4 mt-8">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Link 
                    href="/stores/register" 
                    className="px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg font-medium hover:shadow-lg transition-all duration-300 flex items-center"
                  >
                    <span>Daftar Mitra</span>
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Link>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Link 
                    href="/account/register" 
                    className="px-6 py-3 bg-white text-indigo-700 rounded-lg font-medium hover:shadow-lg transition-all duration-300 flex items-center"
                  >
                    <span>Daftar Customer</span>
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Link>
                </motion.div>
              </div>
            </div>
            
            {/* Right side - illustration */}
            <div className="relative hidden md:block">
              <div className="absolute inset-0 bg-gradient-to-tr from-purple-600/20 to-indigo-600/40 z-10"></div>
              <div className="absolute inset-0 flex items-center justify-center p-10 z-20">
                <div className="w-full h-full rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 flex items-center justify-center overflow-hidden">
                  <div className="transform rotate-12 -translate-y-6">
                    <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-xl flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-12 h-12 text-white">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 10l3 3m0 0l3-3m-3 3V7" />
                      </svg>
                    </div>
                  </div>
                  <div className="transform -rotate-12 translate-x-8 translate-y-8">
                    <div className="w-20 h-20 bg-gradient-to-br from-pink-500 to-rose-600 rounded-2xl shadow-xl flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-10 h-10 text-white">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-indigo-800 to-transparent z-30"></div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Main Footer Content */}
      <div className="container mx-auto px-4 pb-12">
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10"
        >
          {/* Brand and Description */}
          <motion.div variants={itemVariants} className="space-y-4">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">
              DIGIPRO
            </h2>
            <p className="text-gray-300 text-sm leading-relaxed">
              Platform marketplace digital terkemuka di Indonesia yang menawarkan produk digital, 
              jasa digital, dan lelang digital dengan kualitas terbaik.
            </p>
            
            {/* Trust badges */}
            <div className="pt-3 flex items-center space-x-4">
              <div className="bg-white/10 rounded-full p-2 flex items-center justify-center">
                <Shield className="w-4 h-4 text-indigo-300" />
              </div>
              <div className="bg-white/10 rounded-full p-2 flex items-center justify-center">
                <Award className="w-4 h-4 text-indigo-300" />
              </div>
              <div className="bg-white/10 rounded-full p-2 flex items-center justify-center">
                <Star className="w-4 h-4 text-indigo-300" />
              </div>
            </div>
            
            {/* Social Icons */}
            <div className="flex space-x-3 pt-2">
              <Link href="https://facebook.com" className="bg-white/10 hover:bg-indigo-600 p-2 rounded-full transition-colors duration-300" aria-label="Facebook">
                <Facebook size={18} />
              </Link>
              <Link href="https://instagram.com" className="bg-white/10 hover:bg-indigo-600 p-2 rounded-full transition-colors duration-300" aria-label="Instagram">
                <Instagram size={18} />
              </Link>
              <Link href="https://twitter.com" className="bg-white/10 hover:bg-indigo-600 p-2 rounded-full transition-colors duration-300" aria-label="Twitter">
                <Twitter size={18} />
              </Link>
              <Link href="https://linkedin.com" className="bg-white/10 hover:bg-indigo-600 p-2 rounded-full transition-colors duration-300" aria-label="LinkedIn">
                <Linkedin size={18} />
              </Link>
            </div>
          </motion.div>

          {/* Quick Links */}
          <motion.div variants={itemVariants}>
            <h3 className="text-lg font-semibold mb-5 relative inline-block">
              <span className="bg-gradient-to-r from-purple-500 to-indigo-500 h-1 w-8 absolute -bottom-2 left-0 rounded-full"></span>
              Tautan Cepat
            </h3>
            <ul className="space-y-3 mt-6">
              <li>
                <Link href="/products" className="text-gray-300 hover:text-white transition-colors duration-300 flex items-center group">
                  <ArrowRight className="w-3.5 h-3.5 mr-2 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                  <span>Produk Digital</span>
                </Link>
              </li>
              <li>
                <Link href="/services" className="text-gray-300 hover:text-white transition-colors duration-300 flex items-center group">
                  <ArrowRight className="w-3.5 h-3.5 mr-2 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                  <span>Jasa Digital</span>
                </Link>
              </li>
              <li>
                <Link href="/auctions" className="text-gray-300 hover:text-white transition-colors duration-300 flex items-center group">
                  <ArrowRight className="w-3.5 h-3.5 mr-2 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                  <span>Lelang Digital</span>
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-gray-300 hover:text-white transition-colors duration-300 flex items-center group">
                  <ArrowRight className="w-3.5 h-3.5 mr-2 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                  <span>Tentang Kami</span>
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-gray-300 hover:text-white transition-colors duration-300 flex items-center group">
                  <ArrowRight className="w-3.5 h-3.5 mr-2 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                  <span>Hubungi Kami</span>
                </Link>
              </li>
            </ul>
          </motion.div>

          {/* Information */}
          <motion.div variants={itemVariants}>
            <h3 className="text-lg font-semibold mb-5 relative inline-block">
              <span className="bg-gradient-to-r from-purple-500 to-indigo-500 h-1 w-8 absolute -bottom-2 left-0 rounded-full"></span>
              Informasi
            </h3>
            <ul className="space-y-3 mt-6">
              <li>
                <Link href="/terms" className="text-gray-300 hover:text-white transition-colors duration-300 flex items-center group">
                  <ArrowRight className="w-3.5 h-3.5 mr-2 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                  <span>Syarat & Ketentuan</span>
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-gray-300 hover:text-white transition-colors duration-300 flex items-center group">
                  <ArrowRight className="w-3.5 h-3.5 mr-2 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                  <span>Kebijakan Privasi</span>
                </Link>
              </li>
              <li>
                <Link href="/faq" className="text-gray-300 hover:text-white transition-colors duration-300 flex items-center group">
                  <ArrowRight className="w-3.5 h-3.5 mr-2 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                  <span>FAQ</span>
                </Link>
              </li>
              <li>
                <Link href="/help" className="text-gray-300 hover:text-white transition-colors duration-300 flex items-center group">
                  <ArrowRight className="w-3.5 h-3.5 mr-2 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                  <span>Pusat Bantuan</span>
                </Link>
              </li>
              <li>
                <Link href="/blog" className="text-gray-300 hover:text-white transition-colors duration-300 flex items-center group">
                  <ArrowRight className="w-3.5 h-3.5 mr-2 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                  <span>Blog & Artikel</span>
                </Link>
              </li>
            </ul>
          </motion.div>

          {/* Contact Information */}
          <motion.div variants={itemVariants}>
            <h3 className="text-lg font-semibold mb-5 relative inline-block">
              <span className="bg-gradient-to-r from-purple-500 to-indigo-500 h-1 w-8 absolute -bottom-2 left-0 rounded-full"></span>
              Hubungi Kami
            </h3>
            <ul className="space-y-4 mt-6">
              <li className="flex items-start">
                <div className="bg-white/10 p-2 rounded-lg mr-3 flex-shrink-0">
                  <MapPin size={16} className="text-indigo-300" />
                </div>
                <div>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    Jl. Digital Teknologi No. 123, Jakarta Pusat, Indonesia 10110
                  </p>
                </div>
              </li>
              <li className="flex items-center">
                <div className="bg-white/10 p-2 rounded-lg mr-3 flex-shrink-0">
                  <Phone size={16} className="text-indigo-300" />
                </div>
                <p className="text-gray-300 text-sm">+62 21 1234 5678</p>
              </li>
              <li className="flex items-center">
                <div className="bg-white/10 p-2 rounded-lg mr-3 flex-shrink-0">
                  <Mail size={16} className="text-indigo-300" />
                </div>
                <p className="text-gray-300 text-sm">info@digipro.id</p>
              </li>
            </ul>
          </motion.div>
        </motion.div>

        {/* Bottom section with copyright and payments */}
        <div className="border-t border-indigo-800/50 mt-12 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <motion.p 
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5 }}
              className="text-sm text-indigo-300"
            >
              &copy; {currentYear} DIGIPRO. Hak Cipta Dilindungi.
            </motion.p>
            <motion.div 
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.7 }}
              className="mt-4 md:mt-0 flex items-center bg-white/5 px-4 py-2 rounded-full"
            >
              <span className="text-xs text-indigo-300 mr-3">Metode Pembayaran:</span>
              <Image 
                src="/payment-methods.png" 
                alt="Metode Pembayaran" 
                width={120}
                height={24}
                className="h-6"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }} 
              />
            </motion.div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 