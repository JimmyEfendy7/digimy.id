"use client";

import Link from "next/link";
import { useState, useRef } from "react";
import { X, ArrowRight, Grid, Zap } from "lucide-react";
import AuctionCard from "./AuctionCard";
import { motion } from "framer-motion";
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';

interface AuctionProps {
  id: string;
  product_name: string;
  product_poster_url: string;
  start_price: number;
  current_price: number;
  min_bid_increment: number;
  end_date: string;
  bid_count?: number;
  description?: string;
}

interface AuctionSectionProps {
  title: string;
  auctions: AuctionProps[];
  description?: string;
  emptyMessage?: string;
  viewAllLink?: string;
}

const AuctionSection = ({ 
  title, 
  auctions = [], 
  description,
  emptyMessage = "Belum ada lelang yang aktif",
  viewAllLink
}: AuctionSectionProps) => {
  const [showAll, setShowAll] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  const toggleShowAll = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowAll(!showAll);
    
    // Scroll ke bagian atas section saat tampilan berubah agar hasil tetap terlihat
    setTimeout(() => {
      if (sectionRef.current) {
        sectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  return (
    <section ref={sectionRef} className="py-16 relative overflow-hidden">
      {/* Background gradient and pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 -z-10"></div>
      <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] bg-repeat opacity-5 -z-10"></div>
      
      {/* Animated shine effect */}
      <motion.div 
        className="absolute -inset-10 bg-gradient-to-r from-transparent via-purple-200/20 to-transparent -z-10"
        animate={{
          x: ["100%", "-100%"],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "linear",
        }}
      />

      <div className="container mx-auto px-4">
        {/* Heading with animated highlight */}
        <div className="flex flex-col md:flex-row justify-between md:items-center mb-8">
          <div className="relative">
            <motion.div
              initial={{ width: 0 }}
              whileInView={{ width: 80 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="h-1 bg-gradient-to-r from-purple-600 to-indigo-600 rounded absolute top-0 left-0"
            />
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-3xl md:text-4xl font-bold mb-3 pt-4 bg-gradient-to-r from-purple-800 via-indigo-700 to-purple-700 bg-clip-text text-transparent flex items-center"
            >
              <Zap className="w-6 h-6 mr-2 text-purple-600" /> {title}
            </motion.h2>
            {description && (
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="text-gray-600 max-w-2xl"
              >
                {description}
              </motion.p>
            )}
          </div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-3"
          >
            {auctions.length > 0 && (
              <>
                {showAll ? (
                  <button 
                    onClick={toggleShowAll}
                    className="mt-3 md:mt-0 bg-white border border-purple-300 text-purple-700 px-5 py-2 rounded-full font-medium hover:bg-purple-50 transform hover:-translate-y-1 transition-all duration-300 flex items-center group shadow-sm"
                  >
                    <X className="w-4 h-4 mr-2" />
                    <span>Tampilan Slide</span>
                  </button>
                ) : (
                  <button 
                    onClick={toggleShowAll}
                    className="mt-3 md:mt-0 bg-white border border-purple-300 text-purple-700 px-3 py-2 rounded-full font-medium hover:bg-purple-50 transform hover:-translate-y-1 transition-all duration-300 flex items-center group shadow-sm"
                    title="Tampilan Grid"
                  >
                    <Grid className="w-4 h-4" />
                  </button>
                )}
              </>
            )}
            {viewAllLink && (
              <Link 
                href={viewAllLink}
                className="mt-3 md:mt-0 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-5 py-2 rounded-full font-medium hover:shadow-lg transform hover:-translate-y-1 transition-all duration-300 flex items-center group"
              >
                <span>Lihat Semua</span>
                <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </Link>
            )}
          </motion.div>
        </div>

        {auctions.length > 0 ? (
          <>
            {/* Tampilan Semua (Grid) */}
            {showAll && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
                {auctions.map((auction, index) => (
                  <motion.div 
                    key={auction.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ 
                      duration: 0.4,
                      delay: index * 0.05 
                    }}
                    className="transform transition-all duration-300 rounded-xl shadow-lg hover:shadow-xl h-full"
                  >
                    <AuctionCard
                      id={auction.id}
                      product_name={auction.product_name}
                      product_poster_url={auction.product_poster_url}
                      start_price={auction.start_price}
                      current_price={auction.current_price}
                      min_bid_increment={auction.min_bid_increment}
                      end_date={auction.end_date}
                      bid_count={auction.bid_count}
                      description={auction.description}
                    />
                  </motion.div>
                ))}
              </div>
            )}
            
            {/* Tampilan Slide (Swiper) */}
            {!showAll && (
              <div className="pb-10">
                <Swiper
                  modules={[Autoplay, Pagination]}
                  spaceBetween={24}
                  slidesPerView={1}
                  breakpoints={{
                    640: {
                      slidesPerView: 2,
                    },
                    1024: {
                      slidesPerView: 3,
                    },
                    1280: {
                      slidesPerView: 4,
                    },
                  }}
                  autoplay={{
                    delay: 3000,
                    disableOnInteraction: false,
                  }}
                  pagination={{
                    clickable: true,
                    dynamicBullets: true,
                  }}
                  loop={auctions.length > 4}
                  className="py-4 swiper-auction"
                >
                  {auctions.map((auction) => (
                    <SwiperSlide key={auction.id} className="pb-8">
                      <motion.div 
                        whileHover={{ y: -10, transition: { duration: 0.3 } }}
                        className="transform transition-all duration-300 rounded-xl shadow-lg hover:shadow-xl h-full"
                      >
                        <AuctionCard
                          id={auction.id}
                          product_name={auction.product_name}
                          product_poster_url={auction.product_poster_url}
                          start_price={auction.start_price}
                          current_price={auction.current_price}
                          min_bid_increment={auction.min_bid_increment}
                          end_date={auction.end_date}
                          bid_count={auction.bid_count}
                          description={auction.description}
                        />
                      </motion.div>
                    </SwiperSlide>
                  ))}
                </Swiper>
              </div>
            )}
          </>
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-white rounded-lg p-8 text-center shadow-md"
          >
            <p className="text-gray-500">{emptyMessage}</p>
          </motion.div>
        )}
        
        {/* Call to action banner for auctions */}
        {auctions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-8 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl shadow-xl overflow-hidden"
          >
            <div className="p-8 flex flex-col md:flex-row items-center justify-between">
              <div className="mb-6 md:mb-0 text-white">
                <h3 className="text-2xl font-bold mb-2">Ingin Ikut Lelang?</h3>
                <p className="text-purple-100">Pelajari cara, syarat dan ketentuan untuk mengikuti lelang</p>
              </div>
              <Link 
                href="/auctions/guide"
                className="px-6 py-3 bg-white text-indigo-700 rounded-full font-medium hover:bg-indigo-50 transform hover:scale-105 transition-all duration-300 shadow-md"
              >
                Cara & Ketentuan Lelang
              </Link>
            </div>
          </motion.div>
        )}
      </div>

      {/* Add custom styles for pagination */}
      <style jsx global>{`
        .swiper-auction .swiper-pagination {
          bottom: 0;
          margin-bottom: 5px;
        }
        
        .swiper-auction .swiper-pagination-bullet {
          background: #a78bfa;
          opacity: 0.5;
          width: 8px;
          height: 8px;
        }
        
        .swiper-auction .swiper-pagination-bullet-active {
          background: #6d28d9;
          opacity: 1;
          width: 10px;
          height: 10px;
        }
      `}</style>
    </section>
  );
};

export default AuctionSection; 