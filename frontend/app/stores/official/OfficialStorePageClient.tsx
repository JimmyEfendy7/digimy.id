'use client';

import React, { useEffect, useState } from 'react';
import { fetchOfficialProducts, fetchOfficialProductsCount, fetchOfficialProductsStats, getImageUrl } from '@/app/lib/api';
import ProductCard from '@/app/components/ProductCard';
import { BadgeCheck, Store, ShoppingBag, CreditCard, Clock } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

interface ProductType {
  id: string;
  name: string;
  description: string;
  price: number;
  promo_price?: number | null;
  poster_url: string;
  category_name?: string;
  is_official: boolean;
  rating?: number;
  stock?: number;
}

export default function OfficialStorePageClient() {
  const [products, setProducts] = useState<ProductType[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [productCount, setProductCount] = useState(0);
  const [stats, setStats] = useState({
    totalPaid: 0,
    totalPending: 0
  });

  useEffect(() => {
    const loadProductCount = async () => {
      const count = await fetchOfficialProductsCount();
      setProductCount(count);
    };

    const loadStats = async () => {
      const stats = await fetchOfficialProductsStats();
      setStats(stats);
    };

    loadProductCount();
    loadStats();
  }, []);

  useEffect(() => {
    const loadProducts = async () => {
      setLoading(true);
      try {
        // Get only official products with is_official=true
        const response = await fetchOfficialProducts(12, currentPage);
        setProducts(response.data);
        
        // Calculate total pages
        const total = Math.ceil(response.pagination?.total / 12) || 1;
        setTotalPages(total);
      } catch (error) {
        console.error('Error loading official products:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, [currentPage]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo(0, 0);
    }
  };

  // Format number with thousand separator
  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('id-ID').format(num);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 pt-8 pb-16">
      <div className="container mx-auto px-4">
        {/* Store Header */}
        <div className="bg-gradient-to-br from-indigo-900 to-purple-900 rounded-xl p-6 mb-8 relative overflow-hidden shadow-xl">
          <div className="absolute inset-0 bg-gradient-to-tr from-indigo-600/20 to-purple-600/10 z-0"></div>
          <div className="flex items-center relative z-10">
            <div className="h-24 w-24 rounded-full overflow-hidden mr-6 bg-white flex items-center justify-center border-4 border-white shadow-lg">
              <Image 
                src={getImageUrl("digipro-official.png", 'store')}
                alt="DIGIPRO Official"
                width={96}
                height={96}
                className="object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = "/product-placeholder.jpg";
                }}
              />
            </div>
            <div>
              <div className="flex items-center gap-4">
                <h1 className="text-3xl font-bold text-white">DIGIPRO Official</h1>
                <button
                  onClick={() => {
                    const message = encodeURIComponent(`Halo, saya tertarik dengan produk di toko DIGIPRO Official`);
                    window.open(`https://wa.me/085271654890?text=${message}`, '_blank');
                  }}
                  className="py-2 px-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2 shadow-md"
                  title="Hubungi via WhatsApp"
                  aria-label="Hubungi toko via WhatsApp"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="0" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  <span className="font-medium text-sm">Chat WhatsApp</span>
                </button>
              </div>
              <div className="flex items-center text-white/90 mt-1">
                <BadgeCheck className="w-5 h-5 mr-2" />
                <span className="font-medium">Toko Resmi</span>
              </div>
              <p className="text-white/90 mt-3">
                Toko resmi DIGIPRO menyediakan berbagai produk digital premium dengan jaminan kualitas terbaik. Semua produk dijamin asli dan bergaransi.
              </p>
            </div>
          </div>
        </div>

        {/* Products Section */}
        <div className="mb-10">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-700 to-purple-700 bg-clip-text text-transparent">Produk Kami</h2>
            <div className="flex items-center">
              <div className="bg-indigo-100 rounded-full py-1 px-3 text-indigo-700 text-sm font-medium shadow-sm">
                {productCount} Produk
              </div>
            </div>
          </div>
          
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : products.length === 0 ? (
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-8 text-center border border-indigo-100">
              <Store className="w-12 h-12 text-indigo-400 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-indigo-700 mb-2">Belum Ada Produk</h3>
              <p className="text-indigo-500">Produk akan segera ditambahkan.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {products.map((product) => (
                  <ProductCard 
                    key={product.id}
                    id={product.id}
                    name={product.name}
                    price={product.price}
                    promo_price={product.promo_price}
                    poster_url={product.poster_url}
                    is_official={product.is_official}
                    rating={product.rating}
                    description={product.description}
                    category_name={product.category_name}
                    stock={product.stock}
                  />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center mt-10">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className={`px-4 py-2 rounded-md ${
                        currentPage === 1
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                      }`}
                    >
                      Sebelumnya
                    </button>
                    
                    {[...Array(totalPages)].map((_, index) => {
                      const page = index + 1;
                      // Show current page, first, last, and pages around current
                      if (
                        page === 1 ||
                        page === totalPages ||
                        (page >= currentPage - 1 && page <= currentPage + 1)
                      ) {
                        return (
                          <button
                            key={page}
                            onClick={() => handlePageChange(page)}
                            className={`w-10 h-10 rounded-md ${
                              currentPage === page
                                ? 'bg-indigo-600 text-white'
                                : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                            }`}
                          >
                            {page}
                          </button>
                        );
                      } else if (
                        page === currentPage - 2 ||
                        page === currentPage + 2
                      ) {
                        return (
                          <button
                            key={page}
                            className="w-10 h-10 bg-indigo-100 text-indigo-700 rounded-md"
                          >
                            ...
                          </button>
                        );
                      }
                      return null;
                    })}
                    
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className={`px-4 py-2 rounded-md ${
                        currentPage === totalPages
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                      }`}
                    >
                      Selanjutnya
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
} 