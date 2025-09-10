"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { TrendingUp, Users, Clock, Zap } from "lucide-react";
import { useState, useEffect } from "react";
import { getImageUrl } from "../lib/api";
import { extractLabelsFromDescription } from "../lib/formatters";

interface AuctionCardProps {
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

const AuctionCard = ({
  id,
  product_name,
  product_poster_url,
  start_price,
  current_price,
  min_bid_increment,
  end_date,
  bid_count = 0,
  description = "",
}: AuctionCardProps) => {
  // Format price to IDR
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(value);
  };

  // Calculate time remaining
  const [timeRemaining, setTimeRemaining] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isEnded: false,
  });

  // Logika debugging dipisahkan ke useEffect sendiri
  useEffect(() => {
    // Log untuk debugging
    console.log(`[DEBUG] AuctionCard #${id}:`);
    console.log(`- Product: ${product_name}`);
    console.log(`- Start price: ${start_price} (${typeof start_price})`);
    console.log(`- Current price: ${current_price} (${typeof current_price})`);
    console.log(`- Bid count: ${bid_count}`);
  }, [id, product_name, start_price, current_price, bid_count]);
  
  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const endTime = new Date(end_date);
      const diff = endTime.getTime() - now.getTime();
      
      if (diff <= 0) {
        setTimeRemaining({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          isEnded: true,
        });
        return;
      }
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      setTimeRemaining({
        days,
        hours,
        minutes,
        seconds,
        isEnded: false,
      });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    
    return () => clearInterval(interval);
  }, [end_date]);

  // Default poster if not available
  const imageSrc = getImageUrl(product_poster_url);
  
  // Status badge variants
  const statusVariants = {
    ended: "bg-gray-800 text-white",
    active: "bg-gradient-to-r from-purple-600 to-indigo-600 text-white",
  };

  // Get status
  const getStatus = () => {
    if (timeRemaining.isEnded) return "ended";
    return "active";
  };

  const status = getStatus();

  // Format bid count to display correctly
  const formattedBidCount = bid_count?.toString() || "0";
  
  return (
    <motion.div
      className="bg-white rounded-xl shadow-lg overflow-hidden transition-all hover:shadow-xl relative"
    >
      <Link href={`/auctions/${id}`}>
        <div className="relative aspect-square overflow-hidden bg-gray-100">
          <Image
            src={imageSrc}
            alt={product_name}
            className="w-full h-full object-cover transform transition-transform hover:scale-110"
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            onError={(e) => {
              // Fallback to placeholder image
              const target = e.target as HTMLImageElement;
              target.src = "/auction-placeholder.jpg";
            }}
          />
          
          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-80"></div>
          
          {/* Status badge */}
          <div className={`absolute top-3 left-3 py-1.5 px-4 rounded-full text-xs font-semibold flex items-center ${statusVariants[status]}`}>
            {status === "ended" ? (
              <>Lelang Berakhir</>
            ) : (
              <>
                <Zap className="w-3 h-3 mr-1.5" />
                Sedang Berlangsung
              </>
            )}
          </div>
        </div>

        <div className="p-5">
          <h3 className="font-bold text-gray-800 mb-2 line-clamp-2 h-12 text-lg">{product_name}</h3>

          {/* Label dari deskripsi */}
          {description && (
            <div className="mb-3">
              {(() => {
                const { labels } = extractLabelsFromDescription(description);
                const maxDisplayedLabels = 2;
                const hasMoreLabels = labels.length > maxDisplayedLabels;
                const displayedLabels = labels.slice(0, maxDisplayedLabels);
                
                return (
                  <div className="flex flex-wrap gap-1.5">
                    {displayedLabels.map((label, index) => (
                      <span 
                        key={`label-${index}`} 
                        className="inline-block bg-indigo-50 text-indigo-700 text-xs py-0.5 px-1.5 rounded border border-indigo-100"
                      >
                        {label}
                      </span>
                    ))}
                    {hasMoreLabels && (
                      <span className="inline-block bg-gray-50 text-gray-600 text-xs py-0.5 px-1.5 rounded border border-gray-200">
                        +{labels.length - maxDisplayedLabels} lainnya
                      </span>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {!timeRemaining.isEnded ? (
            <div className="mb-4 bg-indigo-50 p-3 rounded-lg">
              <p className="text-xs text-indigo-600 font-medium mb-2 flex items-center">
                <Clock className="w-3.5 h-3.5 mr-1.5" />
                Waktu tersisa:
              </p>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="bg-white p-2 rounded-lg shadow-sm">
                  <motion.span 
                    key={timeRemaining.days}
                    initial={{ scale: 1.2, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="block text-lg font-bold text-indigo-800"
                  >
                    {timeRemaining.days}
                  </motion.span>
                  <span className="text-[10px] text-gray-500 uppercase font-medium">Hari</span>
                </div>
                <div className="bg-white p-2 rounded-lg shadow-sm">
                  <motion.span 
                    key={timeRemaining.hours}
                    initial={{ scale: 1.2, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="block text-lg font-bold text-indigo-800"
                  >
                    {timeRemaining.hours}
                  </motion.span>
                  <span className="text-[10px] text-gray-500 uppercase font-medium">Jam</span>
                </div>
                <div className="bg-white p-2 rounded-lg shadow-sm">
                  <motion.span 
                    key={timeRemaining.minutes}
                    initial={{ scale: 1.2, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="block text-lg font-bold text-indigo-800"
                  >
                    {timeRemaining.minutes}
                  </motion.span>
                  <span className="text-[10px] text-gray-500 uppercase font-medium">Menit</span>
                </div>
                <div className="bg-white p-2 rounded-lg shadow-sm">
                  <motion.span 
                    key={timeRemaining.seconds}
                    initial={{ scale: 1.2, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="block text-lg font-bold text-indigo-800"
                  >
                    {timeRemaining.seconds}
                  </motion.span>
                  <span className="text-[10px] text-gray-500 uppercase font-medium">Detik</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="mb-4 py-3 text-center bg-gray-100 rounded-lg">
              <p className="text-gray-600 font-medium">Lelang ini telah berakhir</p>
            </div>
          )}
          
          <div className="mb-3 space-y-2">
            {/* Penawaran tertinggi */}
            <div className="bg-green-50/80 rounded-lg p-2 flex justify-between items-center">
              <div className="flex items-center">
                <TrendingUp className="w-3.5 h-3.5 text-green-600 mr-1.5" />
                <span className="text-xs text-gray-700">Penawaran Tertinggi</span>
              </div>
              <span className="text-sm font-bold text-green-700">
                {parseInt(formattedBidCount) > 0 
                  ? formatCurrency(current_price)
                  : "Belum ada"}
              </span>
            </div>
            
            {/* Jumlah penawaran */}
            <div className="bg-indigo-50/80 rounded-lg p-2 flex justify-between items-center">
              <div className="flex items-center">
                <Users className="w-3.5 h-3.5 text-indigo-600 mr-1.5" />
                <span className="text-xs text-gray-700">Jumlah Penawaran</span>
              </div>
              <span className="text-sm font-bold text-indigo-700">{bid_count || 0}</span>
            </div>
          </div>
          
          <div className="pt-3 border-t border-gray-100">
            <div className="flex justify-between items-center">
              <div>
                <span className="block text-xs text-gray-500 mb-1">Penawaran Minimum</span>
                <span className="text-indigo-600 font-bold">{formatCurrency(min_bid_increment)}</span>
              </div>
              <div className="bg-gradient-to-r from-purple-100 to-indigo-100 text-indigo-700 text-xs py-2 px-4 rounded-lg font-medium flex items-center">
                <Zap className="w-3.5 h-3.5 mr-1.5" />
                Ikuti Lelang
              </div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default AuctionCard; 