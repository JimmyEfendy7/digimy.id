"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Star, Check, Tag, ShoppingCart, Users } from "lucide-react";
import { getImageUrl } from "../lib/api";

interface ServiceCardProps {
  id: string;
  name: string;
  price: number;
  poster_url: string;
  rating?: number;
  review_count?: number;
  store_name?: string;
  category_name?: string;
  status?: 'exclusive' | 'premium' | '';
  features?: string[];
}

const ServiceCard = ({
  id,
  name,
  price,
  poster_url,
  rating,
  review_count,
  store_name,
  category_name,
  status,
  features = [],
}: ServiceCardProps) => {
  const formattedPrice = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);

  return (
    <motion.div
      whileHover={{ y: -5 }}
      transition={{ duration: 0.3 }}
      className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl h-full border border-gray-100"
    >
      <Link href={`/services/${id}`}>
        {/* Image Container */}
        <div className="relative aspect-square overflow-hidden bg-gray-100">
          <Image
            src={getImageUrl(poster_url)}
            alt={name}
            fill
            className="w-full h-full object-cover transform transition-transform duration-500 hover:scale-110"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            priority={false}
            onError={(e) => {
              // Fallback to placeholder image
              const target = e.target as HTMLImageElement;
              target.src = "/product-placeholder.jpg";
            }}
          />
          
          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-80"></div>
          
          {/* Status badge */}
          {status && (
            <div className={`absolute top-3 right-3 ${status === 'exclusive' ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 'bg-gradient-to-r from-indigo-600 to-purple-600'} text-white px-3 py-1.5 rounded-full text-xs font-bold uppercase shadow-md`}>
              {status}
            </div>
          )}
          
          {/* Category badge - Similar to official badge in product */}
          {category_name && (
            <div className="absolute top-3 left-3 z-10 bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-xs py-1.5 px-3 rounded-full font-medium flex items-center shadow-md">
              <Tag className="w-3.5 h-3.5 mr-1" />
              <span>{category_name}</span>
          </div>
          )}
          
          {/* Delivery time badge - moved to content area */}
        </div>

        <div className="p-5">
          <h3 className="font-bold text-gray-800 mb-2 line-clamp-2 h-12 text-lg">{name}</h3>
          
          {/* Features list - styled as labels */}
          {features.length > 0 && (
            <div className="mb-3">
              <div className="flex flex-wrap gap-1.5">
                {features.slice(0, 2).map((feature, index) => (
                  <span 
                    key={`feature-${index}`} 
                    className="inline-block bg-indigo-50 text-indigo-700 text-xs py-0.5 px-1.5 rounded border border-indigo-100"
                  >
                    <Check className="w-3 h-3 inline mr-0.5 text-indigo-600" />
                    {feature}
                  </span>
                ))}
                {features.length > 2 && (
                  <span className="inline-block bg-gray-50 text-gray-600 text-xs py-0.5 px-1.5 rounded border border-gray-200">
                    +{features.length - 2} lainnya
                  </span>
                )}
              </div>
            </div>
          )}
          
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {/* Delivery time badge - DIHAPUS */}
            
            {/* Rating badge */}
            {rating !== undefined && rating > 0 && (
              <div className="flex items-center bg-yellow-50 rounded-full px-2.5 py-1 shadow-sm">
                <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                <span className="text-xs text-gray-700 ml-1 font-medium">
                  {rating.toFixed(1)}
                </span>
              </div>
            )}
            
            {/* Review count */}
            {review_count !== undefined && review_count > 0 && (
              <div className="bg-green-50 text-green-700 text-xs py-1 px-2.5 rounded-full font-medium flex items-center shadow-sm">
                <Users className="w-3 h-3 mr-1" />
                  {review_count} ulasan
              </div>
            )}
            
            {/* Store name */}
            {store_name && (
              <div className="w-full mt-1">
                <span className="text-xs text-gray-500 flex items-center">
                  <span className="w-2 h-2 bg-indigo-400 rounded-full mr-1.5"></span>
                  {store_name}
                </span>
              </div>
              )}
            </div>
          
          <div className="pt-3 border-t border-gray-100">
            <div className="flex justify-between items-center">
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent font-bold text-lg">
              {formattedPrice}
            </div>
              <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
                className="py-2 px-4 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:shadow-md transition-shadow flex items-center text-xs font-medium"
              >
                <ShoppingCart className="w-3.5 h-3.5 mr-1.5" />
                Pesan Jasa
              </motion.button>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default ServiceCard; 