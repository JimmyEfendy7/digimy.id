"use client";

import React from 'react';
import { useEffect, useState, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { 
  Star, 
  Clock, 
  ShoppingBag, 
  ArrowLeft, 
  Shield,
  Info,
  CheckCircle,
  BadgeCheck,
  Play,
  Store
} from "lucide-react";
import { motion } from "framer-motion";
import { 
  fetchProductById, 
  fetchProductReviews, 
  getImageUrl, 
  fetchStoreDetails,
  checkTransactionStatus
} from "../../lib/api";
import Image from "next/image";
import PurchaseForm from "../../components/PurchaseForm";
import PurchaseStatus from "../../components/PurchaseStatus";

// Mendefinisikan tipe untuk produk
interface ProductType {
  id: string;
  name: string;
  description: string;
  price: number;
  promo_price?: number | null;
  poster_url: string;
  is_official: boolean;
  rating?: number;
  store_id?: string;
  category_id: string;
  sales_count?: number;
  stock?: number;
}

// Mendefinisikan tipe untuk store
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

// Mendefinisikan tipe untuk review
interface ReviewType {
  id: string;
  product_id: string;
  file_url: string;
  file_type: "image" | "video";
}

// Halaman detail produk
export default function ProductDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  
  const [product, setProduct] = useState<ProductType | null>(null);
  const [store, setStore] = useState<StoreType | null>(null);
  const [storeLoading, setStoreLoading] = useState(false);
  const [storeError, setStoreError] = useState<string | null>(null);
  const [reviews, setReviews] = useState<ReviewType[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState<string | null>(null);
  const [activeVideo, setActiveVideo] = useState<string | null>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  // Thumbnail slider state
  const [thumbnailIndex, setThumbnailIndex] = useState(0);
  
  // State untuk form pembelian
  const [showPurchaseForm, setShowPurchaseForm] = useState(false);
  const [purchaseData, setPurchaseData] = useState<null | {
    id: string;
    status: string;
    transactionStatus?: string;
    payment_type?: string;
    payment_url?: string;
    payment_token?: string;
    snap_token?: string;
    webhook_notified?: boolean;
    callback_received?: boolean;
    [key: string]: unknown;
  }>(null);
  
  // Status check interval
  const statusCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    const fetchProductData = async () => {
      setLoading(true);
      try {
        // Mengambil detail produk
        const productData = await fetchProductById(id);
        
        if (productData && productData.product) {
          setProduct(productData.product);
          
          if (productData.store) {
            setStore(productData.store);
            
            // Jika store_id ada dan tidak official, fetch detail store tambahan
            if (productData.product.store_id && !productData.product.is_official) {
              try {
                setStoreLoading(true);
                setStoreError(null);
                const storeDetails = await fetchStoreDetails(productData.product.store_id);
                if (storeDetails) {
                  setStore(prev => ({
                    ...(prev || {}),
                    ...storeDetails
                  }));
                } else {
                  console.warn(`No store details returned for store ID: ${productData.product.store_id}`);
                  setStoreError("Informasi toko tidak tersedia");
                }
              } catch (error) {
                console.error("Error fetching store details:", error);
                setStoreError("Gagal memuat informasi toko");
              } finally {
                setStoreLoading(false);
              }
            }
          }
        }
        
        // Mengambil review produk
        const reviewsData = await fetchProductReviews(id);
        if (reviewsData && reviewsData.length > 0) {
          setReviews(reviewsData);
          
          // Prioritaskan video jika ada
          const videoReview = reviewsData.find((review: ReviewType) => review.file_type === "video");
          if (videoReview) {
            setActiveVideo(getImageUrl(videoReview.file_url, 'review'));
          } else {
            // Jika tidak ada video, gunakan poster produk
            if (productData?.product?.poster_url) {
              setActiveImage(getImageUrl(productData.product.poster_url, 'product'));
            }
          }
        } else if (productData?.product?.poster_url) {
          // Jika tidak ada review, gunakan poster produk
          setActiveImage(getImageUrl(productData.product.poster_url, 'product'));
        }
      } catch (error) {
        console.error("Error fetching product data:", error);
      } finally {
        setLoading(false);
      }
    };
    
    if (id) {
      fetchProductData();
    }
  }, [id]);

  // Determine out-of-stock state safely (only if stock is provided)
  const isOutOfStock = typeof product?.stock === 'number' && (product?.stock as number) <= 0;
  
  // Check URL params for payment status
  useEffect(() => {
    const paymentStatus = searchParams.get('payment_status') || searchParams.get('status');
    const orderId = searchParams.get('order_id');
    const transactionStatus = searchParams.get('transaction_status');
    
    // Tambahkan flag untuk menandai apakah modal telah ditutup secara manual
    const isModalClosedManually = !paymentStatus && !orderId && !transactionStatus;
    
    // Jangan set purchaseData jika sudah null (sudah ditutup oleh pengguna)
    // atau jika tidak ada parameter URL yang relevan
    if (orderId && product && !isModalClosedManually) {
      // Langsung gunakan data dari URL tanpa API call
      let derivedStatus = 'pending';
            
      // Prioritaskan transaction_status dari URL
      if (transactionStatus) {
        if (['settlement', 'capture'].includes(transactionStatus)) {
          derivedStatus = 'success';
        } else if (['deny', 'cancel', 'expire', 'failure'].includes(transactionStatus)) {
          derivedStatus = 'failed';
          } else {
          derivedStatus = 'pending';
        }
      } else if (paymentStatus === 'success') {
        derivedStatus = 'success';
      } else if (paymentStatus === 'failed' || paymentStatus === 'error') {
        derivedStatus = 'failed';
      }
            
      const paymentData = {
        id: orderId,
        status: derivedStatus,
        transactionStatus: transactionStatus || 'pending',
        payment_type: 'Menunggu pembayaran',
        payment_url: searchParams.get('payment_url') || '',
        payment_token: searchParams.get('payment_token') || searchParams.get('snap_token') || '',
        snap_token: searchParams.get('snap_token') || searchParams.get('payment_token') || '',
      };
            
      console.log('Status transaksi dari URL:', paymentData);
      setPurchaseData(paymentData);
    }
  }, [searchParams, product]);
  
  // Nonaktifkan interval checking untuk menghindari error
  useEffect(() => {
    // Tidak perlu melakukan polling untuk status transaksi
    if (statusCheckIntervalRef.current) {
      clearInterval(statusCheckIntervalRef.current);
      statusCheckIntervalRef.current = null;
    }
  }, [purchaseData]);
  
  // Format currency to IDR
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(value);
  };
  
  // Format deskripsi dengan label khusus untuk teks dalam kurung kurawal
  const formatDescription = (description: string) => {
    if (!description) return '';
    
    // Mencari pola teks dalam kurung kurawal {label}
    const regex = /{([^{}]+)}/g;
    
    // Ekstrak teks biasa (tanpa kurung kurawal)
    const plainText = description.replace(regex, '').trim();
    
    // Ekstrak semua label
    const labels = [];
    let match;
    while ((match = regex.exec(description)) !== null) {
      labels.push(match[1].trim());
    }
    
    // Jika tidak ada label, tampilkan teks biasa saja
    if (labels.length === 0) {
      return <p>{plainText}</p>;
    }
    
    // Jika ada label, tampilkan dalam dua paragraf
    return (
      <>
        <p className="mb-3">{plainText}</p>
        <div className="flex flex-wrap gap-2">
          {labels.map((label, index) => (
            <span 
              key={`label-${index}`} 
              className="inline-block bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-800 text-xs font-medium px-2 py-1 rounded-md border border-indigo-200"
            >
              {label}
            </span>
          ))}
        </div>
      </>
    );
  };
  
  // Set active image dan reset video
  const handleSetActiveImage = (imageUrl: string) => {
    // Pastikan video berhenti diputar sebelum mengganti gambar
    if (activeVideo) {
      setIsVideoPlaying(false);
      setTimeout(() => {
        setActiveVideo(null);
        setActiveImage(imageUrl);
      }, 50); // Kecil delay untuk transisi yang lebih halus
    } else {
      setActiveImage(imageUrl);
    }
  };

  // Set active video dan reset image
  const handleSetActiveVideo = (videoUrl: string) => {
    if (activeImage) {
      setActiveImage(null);
      setTimeout(() => {
        setActiveVideo(videoUrl);
      }, 50); // Kecil delay untuk transisi yang lebih halus
    } else {
      setActiveVideo(videoUrl);
    }
  };
  
  // Buka WhatsApp
  const openWhatsApp = () => {
    if (store?.phone_number) {
      const phoneNumber = store.phone_number.startsWith('+') 
        ? store.phone_number.substring(1) 
        : store.phone_number;
      
      const message = encodeURIComponent(`Halo, saya tertarik dengan produk "${product?.name}" di DIGIPRO`);
      window.open(`https://wa.me/${phoneNumber}?text=${message}`, '_blank');
    }
  };
  
  // Filter reviews by type
  const imageReviews = reviews.filter(review => review.file_type === "image");
  const videoReviews = reviews.filter(review => review.file_type === "video");
  
  // Get all thumbnails (poster + reviews)
  const allThumbnails = product ? [
    { id: 'poster', file_url: product.poster_url || '', file_type: 'image' as const },
    ...videoReviews,
    ...imageReviews
  ] : [];
  
  // Get visible thumbnails for slider (max 5)
  const visibleThumbnails = allThumbnails.slice(thumbnailIndex, thumbnailIndex + 5);
  
  // Handle buka form pembelian
  const handleOpenForm = () => {
    setShowPurchaseForm(true);
  };
  
  // Handle tutup form pembelian
  const handleCloseForm = () => {
    setShowPurchaseForm(false);
  };
  
  // Handle sukses pembelian
  const handlePurchaseSuccess = (data: { id: string; status: string; [key: string]: unknown }) => {
    console.log('Purchase success data:', data);
    
    // Log token yang diterima
    if (data.payment_token || data.snap_token) {
      console.log('Token pembayaran tersedia:', data.payment_token || data.snap_token);
    } else {
      console.warn('Token pembayaran tidak tersedia di data pembelian');
    }
    
    // Pastikan data memiliki semua properti yang diperlukan
    const completeData = {
      ...data,
      // Pastikan payment_token selalu tersedia dari salah satu sumber
      payment_token: 
        typeof data.payment_token === 'string' && data.payment_token.trim() !== '' ? data.payment_token : 
        typeof data.snap_token === 'string' && data.snap_token.trim() !== '' ? data.snap_token :
        typeof data.token === 'string' && data.token.trim() !== '' ? data.token : '',
      
      // Pastikan payment_url juga tersedia
      payment_url: 
        typeof data.payment_url === 'string' && data.payment_url.trim() !== '' ? data.payment_url : 
        typeof data.redirect_url === 'string' && data.redirect_url.trim() !== '' ? data.redirect_url : '',
    };
    
    // Log hasil akhir token
    console.log('Final payment token:', completeData.payment_token);
    
    // Setel polling interval untuk memeriksa status setiap 5 detik
    if (statusCheckIntervalRef.current) {
      clearInterval(statusCheckIntervalRef.current);
    }
    
    // Mulai polling status transaksi
    if (completeData.id) {
      statusCheckIntervalRef.current = setInterval(async () => {
        try {
          const response = await checkTransactionStatus(completeData.id.toString());
          if (response.success && response.data) {
            // Update status jika berubah
            const updatedStatus = response.data.transaction_status || response.data.payment_status;
            if (updatedStatus && updatedStatus !== completeData.status) {
              console.log(`Status transaksi berubah: ${completeData.status} -> ${updatedStatus}`);
              setPurchaseData(prev => {
                if (!prev) return completeData;
                return {
                  ...prev,
                  status: updatedStatus,
                  transactionStatus: updatedStatus,
                  payment_type: response.data.payment_type || prev.payment_type
                };
              });
            }
            
            // Jika pembayaran selesai, hentikan polling
            if (['settlement', 'capture', 'success', 'paid'].includes(updatedStatus)) {
              console.log('Pembayaran selesai, menghentikan polling');
              clearInterval(statusCheckIntervalRef.current!);
            }
          }
        } catch (error) {
          console.error('Error checking transaction status:', error);
        }
      }, 5000); // Check setiap 5 detik
    }
    
    setPurchaseData(completeData);
    setShowPurchaseForm(false);
  };
  
  // Handle close sukses pembelian
  const handleClosePurchaseSuccess = () => {
    // Bersihkan interval status check
    if (statusCheckIntervalRef.current) {
      clearInterval(statusCheckIntervalRef.current);
      statusCheckIntervalRef.current = null;
    }
    
    // Hapus setTimeout untuk menghindari race condition
    // dan langsung set purchaseData ke null
    setPurchaseData(null);
  };
  
  // Deteksi kembali dari Midtrans dan hindari loading screen
  useEffect(() => {
    // Ketika halaman dimuat, periksa apakah ada parameter URL yang menunjukkan kembali dari Midtrans
    const hasPaymentParams = 
      searchParams.get('order_id') || 
      searchParams.get('transaction_status') || 
      searchParams.get('payment_status');
    
    if (hasPaymentParams) {
      console.log('Terdeteksi kembali dari halaman pembayaran Midtrans, melewati animasi loading');
      // Set loading langsung ke false untuk melewati animasi loading
      setLoading(false);
    }
  }, [searchParams]);
  
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-t-indigo-600 border-b-indigo-600 border-l-transparent border-r-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat informasi produk...</p>
        </div>
      </div>
    );
  }
  
  if (!product) {
    return (
      <div className="container mx-auto px-4 py-16 min-h-screen">
        <div className="bg-red-50 p-8 rounded-lg text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-2">Produk Tidak Ditemukan</h2>
          <p className="text-gray-600 mb-6">Produk yang Anda cari tidak dapat ditemukan atau telah dihapus.</p>
          <Link href="/products" className="inline-flex items-center px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali ke Daftar Produk
          </Link>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 pt-8 pb-16">
      <div className="container mx-auto px-4">
        {/* Breadcrumb */}
        <div className="mb-8">
          <div className="flex items-center text-sm text-gray-500">
            <Link href="/" className="hover:text-indigo-600 transition-colors">Beranda</Link>
            <span className="mx-2">/</span>
            <Link href="/products" className="hover:text-indigo-600 transition-colors">Produk Digital</Link>
            <span className="mx-2">/</span>
            <span className="text-gray-800 font-medium">{product.name}</span>
          </div>
        </div>
        
        {/* Product Info Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {/* Left side - Product Images/Videos */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            {/* Main Media Container */}
            <div className="bg-gradient-to-br from-indigo-900 to-purple-900 rounded-2xl overflow-hidden shadow-xl relative aspect-square">
              {/* Video Display */}
              {activeVideo && (
                <div className="absolute inset-0 w-full h-full bg-black">
                  {!isVideoPlaying ? (
                    <>
                      <div className="absolute inset-0 flex items-center justify-center z-20">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => setIsVideoPlaying(true)}
                          className="w-20 h-20 rounded-full bg-white/30 flex items-center justify-center backdrop-blur-sm shadow-lg"
                          aria-label="Putar video"
                        >
                          <Play className="w-10 h-10 text-white fill-white ml-1" />
                        </motion.button>
                      </div>
                      <div className="absolute inset-0 bg-black/30 z-10"></div>
                      <div className="relative w-full h-full">
                        <Image 
                          src={getImageUrl(product.poster_url, 'product')} 
                          alt={product.name} 
                          className="object-cover opacity-80"
                          fill
                          sizes="(max-width: 768px) 100vw, 50vw"
                          priority
                        />
                      </div>
                    </>
                  ) : (
                    <video 
                      src={activeVideo} 
                      className="w-full h-full object-contain"
                      controls 
                      autoPlay
                      onEnded={() => setIsVideoPlaying(false)}
                    />
                  )}
                </div>
              )}
              
              {/* Image Display */}
              {activeImage && !activeVideo && (
                <div className="absolute inset-0 w-full h-full">
                  <Image 
                    src={activeImage} 
                    alt={product.name} 
                    className="object-contain z-10"
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    priority
                    onError={(e) => {
                      // Tangani error tanpa mengubah state
                      const target = e.target as HTMLImageElement;
                      target.src = "/product-placeholder.jpg";
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-tr from-indigo-600/20 to-purple-600/10 z-0"></div>
                </div>
              )}
              
              {/* Official tag - highest z-index */}
              {product.is_official ? (
                <motion.div 
                  initial={{ y: -5 }}
                  animate={{ y: 5 }}
                  transition={{ 
                    repeat: Infinity, 
                    repeatType: "reverse", 
                    duration: 1.5 
                  }}
                  className="absolute top-4 left-4 z-10 bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-sm py-1.5 px-4 rounded-full font-medium flex items-center shadow-lg"
                >
                  <BadgeCheck className="w-4 h-4 mr-1.5" />
                  Produk Official
                </motion.div>
              ) : null}
            </div>
            
            {/* Asset Thumbnails with Slider */}
            <div className="flex items-center space-x-2">
              {/* Left Navigation Button */}
              {thumbnailIndex > 0 && (
                <button 
                  onClick={() => setThumbnailIndex(Math.max(0, thumbnailIndex - 5))}
                  className="p-2 rounded-full bg-white shadow-md hover:bg-gray-50 transition-colors z-10"
                  aria-label="Geser ke kiri"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
              
              {/* Thumbnails Container */}
              <div className="flex space-x-3 overflow-hidden flex-1 justify-center">
                {visibleThumbnails.map((item) => {
                  // Check if this is the poster
                  if (item.id === 'poster') {
                    return (
                      <motion.button 
                        key="poster"
                        whileHover={{ y: -5, scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className={`aspect-square rounded-xl overflow-hidden border-2 ${
                          !activeVideo && activeImage === getImageUrl(item.file_url, 'product') 
                            ? 'border-indigo-600 shadow-md shadow-indigo-200' 
                            : 'border-transparent'
                        }`}
                        onClick={() => handleSetActiveImage(getImageUrl(item.file_url, 'product'))}
                        title="Gambar utama produk"
                      >
                        <div className="relative w-full h-full">
                          <Image 
                            src={getImageUrl(item.file_url, 'product')} 
                            alt={product?.name || 'Produk'} 
                            className="object-contain"
                            width={100}
                            height={100}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = "/product-placeholder.jpg";
                            }}
                          />
                        </div>
                      </motion.button>
                    );
                  }
                  
                  // Check if this is a video review
                  if (item.file_type === 'video') {
                    return (
                      <motion.button 
                        key={item.id}
                        whileHover={{ y: -5, scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className={`aspect-square rounded-xl overflow-hidden border-2 relative ${
                          activeVideo === getImageUrl(item.file_url, 'review') 
                            ? 'border-indigo-600 shadow-md shadow-indigo-200' 
                            : 'border-transparent'
                        }`}
                        onClick={() => handleSetActiveVideo(getImageUrl(item.file_url, 'review'))}
                        title="Preview video produk"
                      >
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10">
                          <Play className="w-8 h-8 text-white" />
                        </div>
                        <div className="relative w-full h-full">
                          <Image 
                            src={getImageUrl(product?.poster_url || '', 'product')} 
                            alt={`Video preview ${product?.name || 'produk'}`}
                            className="object-contain"
                            width={100}
                            height={100}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = "/product-placeholder.jpg";
                            }}
                          />
                        </div>
                      </motion.button>
                    );
                  }
                  
                  // Image review
                  return (
                    <motion.button 
                      key={item.id}
                      whileHover={{ y: -5, scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className={`aspect-square rounded-xl overflow-hidden border-2 ${
                        !activeVideo && activeImage === getImageUrl(item.file_url, 'review') 
                          ? 'border-indigo-600 shadow-md shadow-indigo-200' 
                          : 'border-transparent'
                      }`}
                      onClick={() => handleSetActiveImage(getImageUrl(item.file_url, 'review'))}
                      title="Preview gambar produk"
                    >
                      <div className="relative w-full h-full">
                        <Image 
                          src={getImageUrl(item.file_url, 'review')} 
                          alt="Gambar produk" 
                          className="object-contain"
                          width={100}
                          height={100}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = "/product-placeholder.jpg";
                          }}
                        />
                      </div>
                    </motion.button>
                  );
                })}
              </div>
              
              {/* Right Navigation Button */}
              {thumbnailIndex + 5 < allThumbnails.length && (
                <button 
                  onClick={() => setThumbnailIndex(Math.min(allThumbnails.length - 5, thumbnailIndex + 5))}
                  className="p-2 rounded-full bg-white shadow-md hover:bg-gray-50 transition-colors z-10"
                  aria-label="Geser ke kanan"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
            </div>
          </motion.div>
          
          {/* Right side - Product Info */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="space-y-6"
          >
            <div className="bg-white rounded-2xl shadow-xl p-6 border border-indigo-100/50 backdrop-blur-sm">
              <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-indigo-700 to-purple-700 bg-clip-text text-transparent mb-4">{product.name}</h1>
              
              {/* Store Information */}
              {product.is_official ? (
                <div className="flex items-center mb-4 bg-gradient-to-r from-indigo-50 to-purple-50 p-3 rounded-xl border border-indigo-100">
                  <div className="h-12 w-12 rounded-full overflow-hidden mr-3 bg-white flex items-center justify-center border border-indigo-200">
                    <Image 
                      src={getImageUrl("digipro-official.png", 'store')}
                      alt="DIGIPRO Official"
                      width={40}
                      height={40}
                      className="object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = "/product-placeholder.jpg";
                      }}
                    />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">DIGIPRO Official</p>
                    <div className="flex items-center text-xs text-indigo-600">
                      <BadgeCheck className="w-3.5 h-3.5 mr-1" />
                      <span>Toko Resmi</span>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Link 
                      href="/stores/official" 
                      className="px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-200 transition-colors"
                    >
                      Lihat Toko
                    </Link>
                    <button
                      onClick={() => {
                        const message = encodeURIComponent(`Halo, saya tertarik dengan produk "${product?.name}" di DIGIPRO`);
                        window.open(`https://wa.me/085271654890?text=${message}`, '_blank');
                      }}
                      className="p-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center"
                      title="Hubungi via WhatsApp"
                      aria-label="Hubungi penjual via WhatsApp"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="0" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                    </button>
                  </div>
                </div>
              ) : (
                <>
                {storeLoading ? (
                  <div className="flex items-center justify-center mb-4 bg-indigo-50 p-4 rounded-xl h-16">
                    <div className="w-5 h-5 border-2 border-t-indigo-600 border-b-indigo-600 border-l-transparent border-r-transparent rounded-full animate-spin mr-2"></div>
                    <p className="text-sm text-indigo-600">Memuat informasi toko...</p>
                  </div>
                ) : storeError ? (
                  <div className="flex items-center mb-4 bg-red-50 p-4 rounded-xl">
                    <p className="text-sm text-red-600">{storeError}</p>
                  </div>
                ) : store ? (
                  <div className="flex items-center mb-4 bg-indigo-50 p-3 rounded-xl">
                    <div className="h-12 w-12 rounded-full overflow-hidden mr-3 bg-white flex items-center justify-center">
                      {store.logo ? (
                        <Image 
                          src={getImageUrl(store.logo, 'store')} 
                          alt={store.name}
                          width={40}
                          height={40}
                          className="object-cover"
                        />
                      ) : (
                        <Store className="w-6 h-6 text-indigo-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">{store.name}</p>
                      {store.is_verified && (
                        <div className="flex items-center text-xs text-indigo-600">
                          <BadgeCheck className="w-3.5 h-3.5 mr-1" />
                          <span>Mitra Terverifikasi</span>
                        </div>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <Link 
                        href={`/stores/${store.id}`} 
                        className="px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-200 transition-colors"
                      >
                        Lihat Toko
                      </Link>
                      {store.phone_number && (
                        <button
                          onClick={openWhatsApp}
                          className="p-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center"
                          title="Hubungi via WhatsApp"
                          aria-label="Hubungi penjual via WhatsApp"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="0" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                ) : null}
                </>
              )}
              
              {/* Ratings & Sales */}
              <div className="flex items-center space-x-4 mb-6">
                {product.rating !== undefined && (
                  <div className="flex items-center space-x-1">
                    <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                    <span className="text-sm font-medium">{product.rating?.toFixed(1) || "N/A"}</span>
                  </div>
                )}
                
                {product.sales_count !== undefined && product.sales_count > 0 && (
                  <div className="text-sm text-gray-500">
                    <span className="font-medium text-gray-700">{product.sales_count}</span> terjual
                  </div>
                )}
              </div>
              
              {/* Price */}
              <div className="mb-6">
                {product.promo_price ? (
                  <>
                    <div className="flex items-center gap-3 mb-1">
                      <div className="text-3xl font-bold text-rose-600">{formatCurrency(product.promo_price)}</div>
                      <div className="text-xl text-gray-500 line-through">{formatCurrency(product.price)}</div>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="bg-rose-100 text-rose-700 rounded-full px-2 py-0.5 font-medium">Harga Promo</span>
                      <span className="bg-green-100 text-green-700 rounded-full px-2 py-0.5 font-medium">Termasuk semua pajak</span>
                    </div>
                  </>
                ) : (
                  <>
                <div className="text-3xl font-bold text-indigo-700 mb-1">{formatCurrency(product.price)}</div>
                <div className="flex items-center text-sm">
                  <span className="bg-green-100 text-green-700 rounded-full px-2 py-0.5 font-medium">Termasuk semua pajak</span>
                </div>
                  </>
                )}
              </div>
              
              {/* Description */}
              <div className="border-t border-gray-100 pt-6 mb-6">
                <h3 className="font-semibold text-gray-800 mb-3">Deskripsi Produk</h3>
                <div className="prose text-gray-600 max-w-none">
                  {formatDescription(product.description)}
                </div>
              </div>
              
              {/* Purchase Button */}
              <div className="mt-8">
                <motion.button 
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => { if (!isOutOfStock) handleOpenForm(); }}
                  disabled={isOutOfStock}
                  aria-disabled={isOutOfStock}
                  className={`w-full py-3 px-6 rounded-xl font-semibold flex items-center justify-center shadow-lg ${isOutOfStock ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700'}`}
                >
                  <ShoppingBag className="w-5 h-5 mr-2" />
                  {isOutOfStock ? 'Stok Habis' : 'Beli Sekarang'}
                </motion.button>
              </div>
            </div>
            
            {/* Security Information */}
            <div className="bg-white rounded-2xl shadow-xl p-6 border border-indigo-100/50">
              <h3 className="font-semibold text-gray-800 mb-4">Keamanan Bertransaksi</h3>
              <div className="space-y-3">
                <motion.div 
                  whileHover={{ x: 5 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center"
                >
                  <Shield className="w-5 h-5 text-green-600 mr-3" />
                  <span className="text-sm text-gray-600">Pembayaran aman dan terenkripsi</span>
                </motion.div>
                <motion.div 
                  whileHover={{ x: 5 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center"
                >
                  <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
                  <span className="text-sm text-gray-600">Produk dijamin asli dan berkualitas</span>
                </motion.div>
                <motion.div 
                  whileHover={{ x: 5 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center"
                >
                  <Clock className="w-5 h-5 text-green-600 mr-3" />
                  <span className="text-sm text-gray-600">Dukungan 24/7 untuk semua pembelian</span>
                </motion.div>
              </div>
            </div>
            
            {/* Additional Information */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-6 border border-indigo-100 shadow-lg"
            >
              <div className="flex items-start">
                <Info className="w-5 h-5 text-indigo-600 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-indigo-800 mb-1">Informasi Produk Digital</h4>
                  <p className="text-sm text-indigo-700 mb-2">
                    Setelah pembayaran berhasil, produk digital akan langsung tersedia untuk diunduh di halaman akun Anda. Pastikan mengunduh produk sesuai dengan petunjuk yang diberikan.
                  </p>
                  <p className="text-sm font-medium text-indigo-700">
                    Anda tidak perlu memiliki akun atau login untuk membeli produk digital ini.
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
      
      {/* Purchase Form Modal */}
      {showPurchaseForm && product && (
        <PurchaseForm 
          productId={String(params.id)}
          productName={product.name}
          productPrice={product.price}
          productPromoPrice={product.promo_price}
          storeId={product.store_id}
          onClose={handleCloseForm}
          onSuccess={handlePurchaseSuccess}
        />
      )}
      
      {/* Purchase Status Modal */}
      {purchaseData && (
        <PurchaseStatus
          transactionId={purchaseData.id.toString()}
          productName={product?.name || ''}
          status={purchaseData.status.toString()}
          paymentMethod={purchaseData.payment_type as string || 'Menunggu pembayaran'}
          amount={product?.promo_price || product?.price || 0}
          onClose={handleClosePurchaseSuccess}
          transactionStatus={purchaseData.transactionStatus as string}
          payment_url={purchaseData.payment_url as string}
          payment_token={
            typeof purchaseData.payment_token === 'string' && purchaseData.payment_token.trim() !== '' 
              ? purchaseData.payment_token 
              : typeof purchaseData.snap_token === 'string' && purchaseData.snap_token.trim() !== ''
                ? purchaseData.snap_token
                : undefined
          }
          productId={product?.id}
        />
      )}
    </div>
  );
} 