'use client';

import React, { useEffect, useState } from 'react';
import { fetchStoreDetails, fetchStoreStats, fetchSimilarProducts, fetchStoreProducts, getImageUrl } from '@/app/lib/api';
import ProductCard from '@/app/components/ProductCard';
import { BadgeCheck, Store, ShoppingBag, Phone, Mail, MapPin, CreditCard, Clock, ArrowRight } from 'lucide-react';
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
  store_id: string;
  store_name?: string;
  rating?: number;
}

interface StoreType {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  logo?: string;
  banner?: string;
  phone_number?: string;
  email?: string;
  address?: string;
  is_verified: boolean;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  product_count?: number;
}

// Now the component receives storeId directly as a prop instead of accessing params
export default function StorePageClient({ storeId }: { storeId: string }) {
  const [store, setStore] = useState<StoreType | null>(null);
  const [products, setProducts] = useState<ProductType[]>([]);
  const [similarProducts, setSimilarProducts] = useState<ProductType[]>([]);
  const [loading, setLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(true);
  const [similarLoading, setSimilarLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [stats, setStats] = useState({
    totalPaid: 0,
    totalPending: 0
  });

  // Mengambil data toko dan statistik
  useEffect(() => {
    const loadStoreData = async () => {
      setLoading(true);
      try {
        // Load store details using storeId prop
        const storeData = await fetchStoreDetails(storeId);
        setStore(storeData);
        
        // Load store stats
        const storeStats = await fetchStoreStats(storeId);
        setStats(storeStats);
        
        setError(null);
      } catch (err) {
        console.error('Error loading store data:', err);
        setError('Gagal memuat data toko. Silakan coba lagi nanti.');
      } finally {
        setLoading(false);
      }
    };

    loadStoreData();
  }, [storeId]);

  // Mengambil produk toko dengan pagination
  useEffect(() => {
    const loadStoreProducts = async () => {
      setProductsLoading(true);
      try {
        const response = await fetchStoreProducts(storeId, 12, currentPage);
        setProducts(response.data);
        setTotalProducts(response.pagination?.total || 0);
        setTotalPages(response.pagination?.totalPages || 1);
      } catch (err) {
        console.error('Error loading store products:', err);
      } finally {
        setProductsLoading(false);
      }
    };

    if (storeId) {
      loadStoreProducts();
    }
  }, [storeId, currentPage]);

  // Mengambil produk serupa
  useEffect(() => {
    const loadSimilarProducts = async () => {
      if (!storeId) return;
      
      setSimilarLoading(true);
      try {
        const similar = await fetchSimilarProducts(storeId);
        setSimilarProducts(similar);
      } catch (err) {
        console.error('Error loading similar products:', err);
      } finally {
        setSimilarLoading(false);
      }
    };
    
    loadSimilarProducts();
  }, [storeId]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo(0, 0);
    }
  };

  const openWhatsApp = () => {
    if (store?.phone_number) {
      const message = encodeURIComponent(`Halo, saya tertarik dengan produk di toko ${store.name} di DIGIPRO`);
      window.open(`https://wa.me/${store.phone_number.replace(/^0/, '62')}?text=${message}`, '_blank');
    }
  };

  // Format number with thousand separator
  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('id-ID').format(num);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-20 flex justify-center">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !store) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 p-6 rounded-xl text-center">
          <h2 className="text-xl font-semibold text-red-700 mb-2">Error</h2>
          <p className="text-red-600">{error || 'Toko tidak ditemukan'}</p>
          <Link href="/" className="mt-4 inline-block px-4 py-2 bg-indigo-600 text-white rounded-lg">
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 pt-8 pb-16">
      <div className="container mx-auto px-4">
        {/* Store Header */}
      <div className="bg-gradient-to-br from-indigo-900 to-purple-900 rounded-xl p-6 mb-8 relative overflow-hidden shadow-xl">
        {store.banner && (
          <div className="absolute inset-0 opacity-20">
            <Image 
              src={getImageUrl(store.banner, 'store')}
              alt={`${store.name} Banner`}
              fill
              className="object-cover"
            />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-tr from-indigo-600/20 to-purple-600/10 z-0"></div>
        <div className="flex items-center relative z-10">
          <div className="h-24 w-24 rounded-full overflow-hidden mr-6 bg-white flex items-center justify-center border-4 border-white shadow-lg">
            {store.logo ? (
              <Image 
                src={getImageUrl(store.logo, 'store')}
                alt={store.name}
                width={96}
                height={96}
                className="object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = "/product-placeholder.jpg";
                }}
              />
            ) : (
              <Store className="w-12 h-12 text-indigo-300" />
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-4">
              <h1 className="text-3xl font-bold text-white">{store.name}</h1>
              <button
                onClick={openWhatsApp}
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
            
            <div className="flex items-center mt-1">
              {store.is_verified ? (
                <div className="flex items-center text-green-200 bg-green-500/20 px-3 py-1 rounded-full border border-green-400/30">
                  <BadgeCheck className="w-4 h-4 mr-2" />
                  <span className="font-medium text-sm">Mitra Terverifikasi</span>
                </div>
              ) : (
                <div className="flex items-center text-yellow-200 bg-yellow-500/20 px-3 py-1 rounded-full border border-yellow-400/30">
                  <Clock className="w-4 h-4 mr-2" />
                  <span className="font-medium text-sm">Belum Terverifikasi</span>
                </div>
              )}
            </div>
            
            {/* Description and Contact Info */}
            <div className="mt-3 text-white/90">
              {store.description && (
                <p className="mb-3">{store.description}</p>
              )}
              
              {(store.phone_number || store.email || store.address) && (
                <div className="mt-3 bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {store.phone_number && (
                      <div className="flex items-center">
                        <div className="bg-blue-600/20 rounded-full p-2 mr-2">
                          <Phone className="w-4 h-4 text-white" />
                        </div>
                        <div className="text-sm">
                          <p className="text-white/60 text-xs">Telepon</p>
                          <p className="text-white font-medium">{store.phone_number}</p>
                        </div>
                      </div>
                    )}
                    
                    {store.email && (
                      <div className="flex items-center">
                        <div className="bg-purple-600/20 rounded-full p-2 mr-2">
                          <Mail className="w-4 h-4 text-white" />
                        </div>
                        <div className="text-sm">
                          <p className="text-white/60 text-xs">Email</p>
                          <p className="text-white font-medium">{store.email}</p>
                        </div>
                      </div>
                    )}
                    
                    {store.address && (
                      <div className="flex items-center">
                        <div className="bg-emerald-600/20 rounded-full p-2 mr-2">
                          <MapPin className="w-4 h-4 text-white" />
                        </div>
                        <div className="text-sm">
                          <p className="text-white/60 text-xs">Alamat</p>
                          <p className="text-white font-medium">{store.address}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Products Section */}
      <div className="mb-10">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-700 to-purple-700 bg-clip-text text-transparent">Produk dari {store.name}</h2>
          <div className="flex items-center">
            <div className="bg-indigo-100 rounded-full py-1 px-3 text-indigo-700 text-sm font-medium shadow-sm">
              {totalProducts} Produk
            </div>
          </div>
        </div>
        
        {productsLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : products.length === 0 ? (
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-8 text-center border border-indigo-100">
            <Store className="w-12 h-12 text-indigo-400 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-indigo-700 mb-2">Belum Ada Produk</h3>
            <p className="text-indigo-500">Toko ini belum menambahkan produk apapun.</p>
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
                  is_official={false}
                  rating={product.rating}
                  description={product.description}
                  category_name={product.category_name}
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

      {/* Similar Products Section */}
      {similarProducts.length > 0 && (
        <div className="mb-10 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-100">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-700 to-purple-700 bg-clip-text text-transparent">Produk Serupa</h2>
            <Link href="/products" className="bg-white text-indigo-600 hover:text-indigo-800 flex items-center text-sm font-medium py-1.5 px-3 rounded-full shadow-sm hover:shadow transition-all">
              Lihat Semua <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Link>
          </div>
          
          {similarLoading ? (
            <div className="flex justify-center items-center py-10">
              <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {similarProducts.slice(0, 4).map((product) => (
                <ProductCard 
                  key={product.id}
                  id={product.id}
                  name={product.name}
                  price={product.price}
                  promo_price={product.promo_price}
                  poster_url={product.poster_url}
                  is_official={false}
                  rating={product.rating}
                  description={product.description}
                  category_name={product.category_name}
                />
              ))}
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  );
} 