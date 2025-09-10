"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Calendar, AlertCircle, Bell } from "lucide-react";
import { useState } from "react";
import { getImageUrl } from "../lib/api";
import { extractLabelsFromDescription } from "../lib/formatters";

interface PendingAuctionCardProps {
  id: string;
  product_name: string;
  product_poster_url: string;
  start_price: number;
  scheduled_start_date: string;
  description?: string;
}

const PendingAuctionCard = ({
  id,
  product_name,
  product_poster_url,
  start_price,
  scheduled_start_date,
  description = "",
}: PendingAuctionCardProps) => {
  const [isNotificationEnabled, setIsNotificationEnabled] = useState(false);

  // Format price to IDR
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(value);
  };

  // Format date
  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString('id-ID', options);
  };

  // Default poster if not available
  const imageSrc = getImageUrl(product_poster_url);
  
  const handleNotificationToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsNotificationEnabled(!isNotificationEnabled);
  };

  return (
    <motion.div
      className="bg-white rounded-xl shadow-lg overflow-hidden transition-all hover:shadow-xl relative h-full"
      whileHover={{ y: -5 }}
    >
      <Link href={`/auctions/${id}`}>
        <div className="relative aspect-square overflow-hidden bg-gray-100">
          <Image
            src={imageSrc}
            alt={product_name}
            className="w-full h-full object-cover transform transition-transform hover:scale-105"
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            priority={false}
            onError={(e) => {
              // Fallback to placeholder image
              const target = e.target as HTMLImageElement;
              target.src = "/auction-placeholder.jpg";
            }}
          />
          
          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"></div>
          
          {/* Status badge */}
          <div className="absolute top-3 left-3 py-1.5 px-4 rounded-full text-xs font-semibold flex items-center bg-amber-500 text-white">
            <AlertCircle className="w-3 h-3 mr-1.5" />
            Akan Datang
          </div>
          
          {/* Price badge */}
          <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm text-gray-900 py-1.5 px-3 rounded-lg text-sm font-bold">
            {formatCurrency(start_price)}
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

          <div className="mb-4 bg-amber-50 p-3 rounded-lg">
            <p className="text-xs text-amber-700 font-medium mb-2 flex items-center">
              <Calendar className="w-3.5 h-3.5 mr-1.5" />
              Jadwal Mulai Lelang:
            </p>
            <div className="bg-white p-3 rounded-lg shadow-sm text-center">
              <span className="block text-sm font-bold text-gray-800">
                {formatDate(scheduled_start_date)}
              </span>
            </div>
          </div>
          
          <div className="pt-3 border-t border-gray-100">
            <div className="flex justify-between items-center">
              <div>
                <span className="block text-xs text-gray-500 mb-1">Harga Awal</span>
                <span className="text-amber-600 font-bold">{formatCurrency(start_price)}</span>
              </div>
              <motion.button
                onClick={handleNotificationToggle}
                className={`py-2 px-4 rounded-lg text-xs font-medium flex items-center ${
                  isNotificationEnabled 
                  ? "bg-green-100 text-green-600" 
                  : "bg-gray-100 text-gray-600"
                }`}
                whileTap={{ scale: 0.95 }}
              >
                <Bell className="w-3.5 h-3.5 mr-1.5" />
                {isNotificationEnabled ? "Notifikasi Aktif" : "Aktifkan Notifikasi"}
              </motion.button>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default PendingAuctionCard; 