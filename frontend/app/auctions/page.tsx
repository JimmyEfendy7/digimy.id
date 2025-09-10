"use client";

import { useEffect, useState } from "react";
import { fetchActiveAuctions, fetchPendingAuctions } from "../lib/api";
import AuctionSection from "../components/AuctionSection";
import PendingAuctionCard from "../components/PendingAuctionCard";
import { motion } from "framer-motion";
import Head from "next/head";
import { Search, ChevronRight } from "lucide-react";
import Link from "next/link";

// Definisikan tipe untuk particle animasi
type Particle = {
  id: number;
  top: string;
  left: string;
  animationDuration: number;
  animationDelay: number;
};

// Definisikan tipe untuk data API dan pagination
interface ApiResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Definisikan tipe untuk data lelang dari API
interface AuctionDataFromApi {
  id: number;
  product_name: string;
  product_poster_url: string;
  start_price: number;
  current_price: number;
  scheduled_start_date?: string;
  end_date: string;
  min_bid_increment: number;
  bid_count?: number;
}

// Definisikan tipe untuk data lelang pending dari API
interface PendingAuctionDataFromApi {
  id: number;
  product_name: string;
  product_poster_url: string;
  start_price: number;
  scheduled_start_date: string;
}

// Sesuaikan dengan interface di AuctionSection
interface AuctionProps {
  id: string;
  product_name: string;
  product_poster_url: string;
  start_price: number;
  current_price: number;
  min_bid_increment: number;
  end_date: string;
  bid_count?: number;
}

// Sesuaikan dengan interface di PendingAuctionCard
interface PendingAuctionProps {
  id: string;
  product_name: string;
  product_poster_url: string;
  start_price: number;
  scheduled_start_date: string;
  description?: string;
}

export default function AuctionsPage() {
  const [activeAuctions, setActiveAuctions] = useState<AuctionProps[]>([]);
  const [pendingAuctions, setPendingAuctions] = useState<PendingAuctionProps[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [particles, setParticles] = useState<Particle[]>([]);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const auctionsData: ApiResponse<AuctionDataFromApi> = await fetchActiveAuctions(20, 1);
        const pendingAuctionsData: ApiResponse<PendingAuctionDataFromApi> = await fetchPendingAuctions(8, 1);
        
        // Konversi data lelang aktif agar ID menjadi string
        setActiveAuctions(
          auctionsData.data.map((item) => ({
            ...item,
            id: item.id.toString()
          }))
        );
        
        // Konversi data lelang pending agar ID menjadi string
        setPendingAuctions(
          pendingAuctionsData.data.map((item) => ({
            ...item,
            id: item.id.toString()
          }))
        );
      } catch (error) {
        console.error("Error fetching auctions:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
    
    // Generate particles for visual effect
    setIsClient(true);
    const newParticles = Array.from({ length: 15 }, (_, i) => ({
      id: i,
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      animationDuration: 3 + Math.random() * 2,
      animationDelay: Math.random() * 2,
    }));
    
    setParticles(newParticles);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Implement search when backend is ready
    console.log("Searching for:", searchQuery);
  };

  return (
    <div>
      <Head>
        <title>Lelang Digital | DIGIPRO</title>
        <meta name="description" content="Lelang digital yang sedang berlangsung untuk berbagai produk dan jasa digital" />
      </Head>

      {/* Hero Section with gradient background matching homepage */}
      <section className="relative bg-gradient-to-br from-indigo-900 via-purple-800 to-blue-900 py-16 overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-20 bg-[url('/grid-pattern.svg')] bg-repeat"></div>
        
        {/* Animated Particles */}
        <div className="absolute inset-0">
          {isClient && particles.map((particle: Particle) => (
            <motion.div
              key={particle.id}
              className="absolute w-2 h-2 rounded-full bg-white/30"
              style={{
                top: particle.top,
                left: particle.left,
              }}
              animate={{
                y: [0, -20, 0],
                opacity: [0.2, 0.5, 0.2],
              }}
              transition={{
                duration: particle.animationDuration,
                repeat: Infinity,
                delay: particle.animationDelay,
              }}
            />
          ))}
        </div>
        
        {/* Hero Content - Updated to match homepage style */}
        <div className="container mx-auto px-4 relative z-10">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-4xl md:text-5xl font-bold mb-4 text-center bg-clip-text text-transparent bg-gradient-to-r from-blue-300 via-pink-300 to-purple-300"
          >
            Lelang Digital
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-xl text-indigo-100 max-w-2xl mx-auto text-center mb-8"
          >
            Ikuti lelang digital yang sedang berlangsung dan dapatkan produk atau jasa dengan harga terbaik
          </motion.p>
          
          {/* Search Form with style matching homepage */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="max-w-xl mx-auto"
          >
            <form onSubmit={handleSearch} className="relative">
              <div className="relative">
                <Search className="w-5 h-5 absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Cari lelang digital..."
                  className="w-full py-4 pl-12 pr-32 rounded-full shadow-xl focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-gray-800"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white py-2 px-6 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                >
                  Cari
                </button>
              </div>
            </form>
          </motion.div>
        </div>
        
        {/* Animated Wave Effect at bottom */}
        <div className="absolute bottom-0 left-0 right-0">
          <motion.div
            initial={{ y: 100, opacity: 0.3 }}
            animate={{ y: 0, opacity: 0.4 }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              repeatType: "reverse",
              ease: "easeInOut",
            }}
            className="w-full h-16 bg-white/10 rounded-t-[100%]"
          ></motion.div>
          <motion.div
            initial={{ y: 70, opacity: 0.3 }}
            animate={{ y: 0, opacity: 0.2 }}
            transition={{
              duration: 3,
              repeat: Infinity,
              repeatType: "reverse",
              ease: "easeInOut",
              delay: 0.3,
            }}
            className="w-full h-16 mt-[-10px] bg-white/10 rounded-t-[100%]"
          ></motion.div>
        </div>
      </section>

      {/* Active Auctions Section */}
      {loading ? (
        <div className="h-32 flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <AuctionSection
          title="Lelang Digital Aktif"
          auctions={activeAuctions}
          description="Lelang digital yang sedang berlangsung saat ini"
        />
      )}

      {/* Info Box with updated styling to match homepage */}
      <section className="py-12 bg-gradient-to-r from-indigo-50 to-purple-50">
        <div className="container mx-auto px-4">
          <div className="bg-white rounded-xl border-l-4 border-indigo-500 p-8 shadow-xl overflow-hidden relative">
            <div className="absolute right-0 top-0 w-32 h-32 bg-gradient-to-br from-indigo-500/10 to-purple-500/5 rounded-bl-full"></div>
            
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-xl md:text-2xl font-bold mb-4 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Panduan Lelang Digital</h2>
              <p className="text-gray-700 mb-5">
                Lelang digital di DIGIPRO dilakukan secara transparan dan aman. Ikuti aturan berikut untuk mendapatkan pengalaman lelang terbaik:
              </p>
              <ul className="space-y-3">
                {[
                  "Registrasi dan verifikasi akun sebelum mengikuti lelang",
                  "Pastikan Anda memahami deskripsi dan syarat lelang dengan baik",
                  "Penawaran yang sudah diajukan tidak dapat dibatalkan",
                  "Pemenang lelang wajib menyelesaikan pembayaran dalam 24 jam",
                  "Semua transaksi dilindungi oleh sistem escrow DIGIPRO"
                ].map((item, index) => (
                  <li key={index}>
                    <motion.div 
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.3, delay: 0.1 * index }}
                      className="flex items-start"
                    >
                      <div className="h-6 w-6 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 flex-shrink-0 flex items-center justify-center text-white text-sm mr-3">
                        {index + 1}
                      </div>
                      <p className="text-gray-700">{item}</p>
                    </motion.div>
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                <Link 
                  href="/auctions/guide" 
                  className="inline-flex items-center px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-full font-medium hover:shadow-lg transform hover:-translate-y-1 transition-all duration-300"
                >
                  Pelajari Lebih Lanjut
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Pending Auctions Section - Updated to match homepage style */}
      {loading ? (
        <div className="h-32 flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
        </div>
      ) : pendingAuctions.length > 0 ? (
        <section className="py-16 bg-gradient-to-br from-purple-50 via-white to-indigo-50">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-12">
              <div>
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: "40%" }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="h-1 bg-gradient-to-r from-orange-500 to-yellow-500 rounded mb-4 hidden md:block"
                />
                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5 }}
                  className="text-3xl md:text-4xl font-bold mb-3 bg-gradient-to-r from-orange-600 to-yellow-600 bg-clip-text text-transparent"
                >
                  Lelang Digital yang Akan Datang
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="text-gray-600 max-w-2xl"
                >
                  Lelang digital yang dijadwalkan segera berlangsung. Siapkan diri Anda untuk mengikuti lelang berikut:
                </motion.p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
              {pendingAuctions.map((auction, index) => (
                <motion.div
                  key={auction.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                  whileHover={{ y: -10, transition: { duration: 0.3 } }}
                  className="transform transition-all duration-300 rounded-xl shadow-lg hover:shadow-xl h-full"
                >
                  <PendingAuctionCard 
                    id={auction.id}
                    product_name={auction.product_name}
                    product_poster_url={auction.product_poster_url}
                    start_price={auction.start_price}
                    scheduled_start_date={auction.scheduled_start_date}
                    description={auction.description}
                  />
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* Call to Action section matching homepage */}
      <section className="py-16 bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 animate-pulse">Bergabunglah dengan DIGIPRO</h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Temukan produk dan jasa digital terbaik atau mulai jual produk dan jasa Anda sendiri
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link 
              href="/register" 
              className="px-6 py-3 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-md font-medium hover:from-pink-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
              Daftar Sekarang
            </Link>
            <Link 
              href="/products" 
              className="px-6 py-3 bg-white text-indigo-600 rounded-md font-medium hover:bg-indigo-50 transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
              Jelajahi Produk
            </Link>
            <Link 
              href="/services" 
              className="px-6 py-3 bg-indigo-500 text-white rounded-md font-medium hover:bg-indigo-400 transition-all duration-300 transform hover:scale-105 shadow-lg border border-indigo-400"
            >
              Temukan Jasa
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
} 