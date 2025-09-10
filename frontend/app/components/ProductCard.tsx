"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Star, ShoppingCart, BadgeCheck, Clock } from "lucide-react";
import { getImageUrl } from "../lib/api";
import { extractLabelsFromDescription } from "../lib/formatters";

interface ProductCardProps {
  id: string;
  name: string;
  price: number;
  promo_price?: number | null;
  poster_url: string;
  is_official: boolean;
  rating?: number;
  sales_count?: number;
  store_name?: string;
  description?: string;
  category_name?: string;
  stock?: number;
}

const ProductCard = ({
  id,
  name,
  price,
  promo_price,
  poster_url,
  is_official,
  rating = 0,
  sales_count = 0,
  store_name = "",
  description = "",
  category_name = "",
  stock,
}: ProductCardProps) => {
  // Format price to IDR
  const formattedPrice = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(price);

  // Format promo price to IDR if available
  const formattedPromoPrice = promo_price ? new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(promo_price) : null;

  // Default poster if not available
  const imageSrc = getImageUrl(poster_url);
  const isOutOfStock = typeof stock === 'number' && stock <= 0;

  return (
    <motion.div
      whileHover={{ y: -5 }}
      transition={{ duration: 0.3 }}
      className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl h-full border border-gray-100"
    >
      <Link href={`/products/${id}`}>
        <div className="relative aspect-square overflow-hidden bg-gray-100">
          {/* 
            Pastikan tidak ada output '0' jika bukan produk official
            Hanya tampilkan badge jika is_official=true
          */}
          {is_official ? (
            <div className="absolute top-3 left-3 z-10 bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-xs py-1.5 px-3 rounded-full font-medium flex items-center shadow-md">
              <BadgeCheck className="w-3.5 h-3.5 mr-1" />
              Produk Official
            </div>
          ) : (
            /* Tag kosong untuk memastikan tidak ada output yang tidak diinginkan */
            <></>
          )}
          
          {/* Tambahkan badge promo jika ada harga promo */}
          {promo_price && (
            <div className="absolute top-3 right-3 z-10 bg-gradient-to-r from-rose-500 to-red-500 text-white text-xs py-1.5 px-3 rounded-full font-medium shadow-md">
              Promo
            </div>
          )}

          {/* Out of Stock Badge */}
          {isOutOfStock && (
            <div className="absolute inset-0 z-20 flex items-center justify-center">
              <span className="bg-red-600 text-white text-sm md:text-base font-bold px-4 py-2 rounded-full shadow-lg">
                Stok Habis
              </span>
            </div>
          )}
          
          <Image 
            src={imageSrc}
            alt={name}
            className="w-full h-full object-cover transform transition-transform duration-500 hover:scale-110"
            fill
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
        </div>

        <div className="p-5">
          {/* Tampilkan kategori produk */}
          {category_name && (
            <div className="mb-1">
              <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                {category_name}
              </span>
            </div>
          )}
          
          <h3 className="font-bold text-gray-800 mb-2 line-clamp-2 h-12 text-lg">{name}</h3>
          
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
          
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {rating > 0 && (
              <div className="flex items-center bg-yellow-50 rounded-full px-2.5 py-1 shadow-sm">
                <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                <span className="text-xs text-gray-700 ml-1 font-medium">
                  {rating.toFixed(1)}
                </span>
              </div>
            )}
            
            {sales_count > 0 && (
              <div className="bg-green-50 text-green-700 text-xs py-1 px-2.5 rounded-full font-medium flex items-center shadow-sm">
                <Clock className="w-3 h-3 mr-1" />
                {sales_count} terjual
              </div>
            )}
          </div>
          
          <div className="pt-3 border-t border-gray-100">
            <div className="flex justify-between items-center">
              <div>
                {promo_price ? (
                  <div className="flex flex-col">
                    <div className="bg-gradient-to-r from-rose-500 to-red-500 bg-clip-text text-transparent font-bold text-lg">
                      {formattedPromoPrice}
                    </div>
                    <div className="text-gray-500 text-xs line-through">
                      {formattedPrice}
                    </div>
                  </div>
                ) : (
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent font-bold text-lg">
                {formattedPrice}
                  </div>
                )}
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`${isOutOfStock ? 'bg-gray-300 cursor-not-allowed text-gray-600' : 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:shadow-md'} py-2 px-4 rounded-lg transition-shadow flex items-center text-xs font-medium`}
                disabled={isOutOfStock}
                aria-disabled={isOutOfStock}
              >
                <ShoppingCart className="w-3.5 h-3.5 mr-1.5" />
                {isOutOfStock ? 'Stok Habis' : 'Beli Sekarang'}
              </motion.button>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default ProductCard; 