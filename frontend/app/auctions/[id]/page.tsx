"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { 
  Star, 
  Clock, 
  ArrowLeft, 
  Shield,
  Info,
  CheckCircle,
  BadgeCheck,
  Users,
  TrendingUp,
  Zap,
  Store
} from "lucide-react";
import { motion } from "framer-motion";
import { fetchAuctionById, fetchProductReviews, getImageUrl } from "../../lib/api";
import Image from "next/image";

// Tipe untuk produk lelang
interface AuctionType {
  id: string;
  product_id: string;
  name: string;
  description: string;
  poster_url: string;
  initial_price: number;
  current_price: number;
  min_bid_increment: number;
  start_date: string;
  end_date: string;
  status: "pending" | "active" | "ended" | "canceled";
  is_verified: boolean;
  winner_id?: string;
  store_id?: string;
}

// Tipe untuk produk
interface ProductType {
  id: string;
  name: string;
  description: string;
  price: number;
  poster_url: string;
  is_official: boolean;
  rating?: number;
}

// Tipe untuk store
interface StoreType {
  id: string;
  name: string;
  logo?: string;
  verified: boolean;
  phone_number?: string;
}

// Tipe untuk review
interface ReviewType {
  id: string;
  product_id: string;
  file_url: string;
  file_type: "image" | "video";
}

// Tipe untuk penawaran
interface BidType {
  id: string;
  auction_id: string;
  bidder_name: string;
  bid_amount: number;
  created_at: string;
}

// Halaman detail lelang
export default function AuctionDetailPage() {
  const params = useParams();
  const id = params.id as string;
  
  const [auction, setAuction] = useState<AuctionType | null>(null);
  const [product, setProduct] = useState<ProductType | null>(null);
  const [store, setStore] = useState<StoreType | null>(null);
  const [reviews, setReviews] = useState<ReviewType[]>([]);
  const [bids, setBids] = useState<BidType[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState<string | null>(null);
  const [activeVideo, setActiveVideo] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isEnded: false,
  });
  
  useEffect(() => {
    const fetchAuctionData = async () => {
      setLoading(true);
      try {
        // Fetch auction data
        const auctionData = await fetchAuctionById(id);
        
        if (auctionData) {
          setAuction(auctionData.auction);
          setProduct(auctionData.product);
          setStore(auctionData.store);
          setReviews(auctionData.reviews || []);
          setBids(auctionData.bids || []);
          
          // Set initial active image
          if (auctionData.auction) {
            setActiveImage(getImageUrl(auctionData.auction.poster_url, 'auction'));
          }
        }
        
        // Fetch additional reviews if needed
        if (auctionData?.product?.id) {
          const productReviews = await fetchProductReviews(auctionData.product.id);
          if (productReviews && productReviews.length > 0) {
            setReviews(prevReviews => {
              // Filter out duplicates
              const existingIds = new Set(prevReviews.map((r: ReviewType) => r.id));
              const newReviews = productReviews.filter((r: ReviewType) => !existingIds.has(r.id));
              return [...prevReviews, ...newReviews];
            });
          }
        }
      } catch (error) {
        console.error("Error fetching auction data:", error);
      } finally {
        setLoading(false);
      }
    };
    
    if (id) {
      fetchAuctionData();
    }
  }, [id]);
  
  // Timer untuk menghitung waktu tersisa
  useEffect(() => {
    if (!auction) return;
    
    const updateTimer = () => {
      const now = new Date();
      const endTime = new Date(auction.end_date);
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
  }, [auction]);
  
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
  
  // Handle video modal
  const closeVideoModal = () => {
    setActiveVideo(null);
  };
  
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-t-indigo-600 border-b-indigo-600 border-l-transparent border-r-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat informasi lelang...</p>
        </div>
      </div>
    );
  }
  
  if (!auction || !product) {
    return (
      <div className="container mx-auto px-4 py-16 min-h-screen">
        <div className="bg-red-50 p-8 rounded-lg text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-2">Lelang Tidak Ditemukan</h2>
          <p className="text-gray-600 mb-6">Lelang yang Anda cari tidak dapat ditemukan atau telah dihapus.</p>
          <Link href="/auctions" className="inline-flex items-center px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali ke Daftar Lelang
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
            <Link href="/auctions" className="hover:text-indigo-600 transition-colors">Lelang Digital</Link>
            <span className="mx-2">/</span>
            <span className="text-gray-800 font-medium">{auction.name}</span>
          </div>
        </div>
        
        {/* Auction Info Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {/* Left side - Product Images */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            {/* Main image/video preview */}
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-gradient-to-br from-indigo-900 to-purple-900 mb-4 shadow-xl">
              {activeVideo ? (
                <video 
                  src={activeVideo} 
                  controls 
                  autoPlay 
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="relative w-full h-full">
                  <Image 
                    src={activeImage || ''} 
                    alt={auction?.name || 'Auction image'} 
                    className="object-contain z-10 relative"
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    priority
                  />
                  <div className="absolute inset-0 bg-gradient-to-tr from-indigo-600/20 to-purple-600/10 z-0"></div>
                </div>
              )}
              
              {/* Official Product tag */}
              {product?.is_official && (
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
              )}
            </div>
            
            {/* Thumbnails */}
            <div className="flex space-x-4 overflow-x-auto pb-2 px-1">
              {/* Auction poster as primary thumbnail */}
              <motion.button 
                whileHover={{ y: -5, scale: 1.05 }}
                transition={{ duration: 0.2 }}
                className={`aspect-square rounded-xl overflow-hidden border-2 ${activeImage === getImageUrl(auction?.poster_url || '', 'auction') ? 'border-indigo-600 shadow-md shadow-indigo-200' : 'border-transparent'}`}
                onClick={() => setActiveImage(getImageUrl(auction?.poster_url || '', 'auction'))}
                aria-label="Lihat gambar utama lelang"
              >
                <Image 
                  src={getImageUrl(auction?.poster_url || '', 'auction')} 
                  alt={auction?.name || ''} 
                  className="w-full h-full object-cover"
                  width={100}
                  height={100}
                />
              </motion.button>
              
              {/* Photo review thumbnails */}
              {reviews.filter(r => r.file_url && !r.file_url.includes('.mp4')).map(review => (
                <motion.button 
                  key={review.id} 
                  whileHover={{ y: -5, scale: 1.05 }}
                  transition={{ duration: 0.2 }}
                  className={`aspect-square rounded-xl overflow-hidden border-2 ${activeImage === getImageUrl(review.file_url, 'review') ? 'border-indigo-600 shadow-md shadow-indigo-200' : 'border-transparent'}`}
                  onClick={() => {
                    setActiveImage(getImageUrl(review.file_url, 'review'));
                    setActiveVideo(null);
                  }}
                  aria-label="Lihat foto review"
                >
                  <Image 
                    src={getImageUrl(review.file_url, 'review')} 
                    alt="Review produk lelang" 
                    className="w-full h-full object-cover"
                    width={100}
                    height={100}
                  />
                </motion.button>
              ))}
            </div>
          </motion.div>
          
          {/* Right side - Auction Info */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="space-y-6"
          >
            <div className="bg-white rounded-2xl shadow-xl p-6 border border-indigo-100/50 backdrop-blur-sm">
              <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-indigo-700 to-purple-700 bg-clip-text text-transparent mb-4">{auction?.name}</h1>
              
              {/* Informasi Toko */}
              {product?.is_official ? (
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
                        const message = encodeURIComponent(`Halo, saya tertarik dengan lelang "${auction?.name}" di DIGIPRO`);
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
                    {store.verified && (
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
                    <button
                      onClick={() => {
                        const message = encodeURIComponent(`Halo, saya tertarik dengan lelang "${auction?.name}" di DIGIPRO`);
                        window.open(`https://wa.me/${store.phone_number || '085271654890'}?text=${message}`, '_blank');
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
              ) : null}
              
              <div className="flex items-center space-x-4 mb-6">
                {product?.rating !== undefined && (
                  <div className="flex items-center space-x-1">
                    <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                    <span className="text-sm font-medium">{product.rating?.toFixed(1) || "N/A"}</span>
                  </div>
                )}
              </div>
              
              {!timeRemaining.isEnded ? (
                <motion.div 
                  initial={{ scale: 0.95 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.3 }}
                  className="mb-6 bg-gradient-to-br from-indigo-100 to-purple-100 p-4 rounded-xl border border-indigo-200/50"
                >
                  <p className="text-sm text-indigo-600 font-medium mb-3 flex items-center">
                    <Clock className="w-4 h-4 mr-1.5" />
                    Waktu tersisa:
                  </p>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="bg-white py-2 px-1 rounded-lg shadow-sm border border-indigo-100">
                      <motion.span 
                        key={timeRemaining.days}
                        initial={{ scale: 1.2, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="block text-xl font-bold bg-gradient-to-br from-indigo-700 to-purple-700 bg-clip-text text-transparent"
                      >
                        {timeRemaining.days}
                      </motion.span>
                      <span className="text-xs text-gray-500 uppercase font-medium">Hari</span>
                    </div>
                    <div className="bg-white py-2 px-1 rounded-lg shadow-sm border border-indigo-100">
                      <motion.span 
                        key={timeRemaining.hours}
                        initial={{ scale: 1.2, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="block text-xl font-bold bg-gradient-to-br from-indigo-700 to-purple-700 bg-clip-text text-transparent"
                      >
                        {timeRemaining.hours}
                      </motion.span>
                      <span className="text-xs text-gray-500 uppercase font-medium">Jam</span>
                    </div>
                    <div className="bg-white py-2 px-1 rounded-lg shadow-sm border border-indigo-100">
                      <motion.span 
                        key={timeRemaining.minutes}
                        initial={{ scale: 1.2, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="block text-xl font-bold bg-gradient-to-br from-indigo-700 to-purple-700 bg-clip-text text-transparent"
                      >
                        {timeRemaining.minutes}
                      </motion.span>
                      <span className="text-xs text-gray-500 uppercase font-medium">Menit</span>
                    </div>
                    <div className="bg-white py-2 px-1 rounded-lg shadow-sm border border-indigo-100">
                      <motion.span 
                        key={timeRemaining.seconds}
                        initial={{ scale: 1.2, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="block text-xl font-bold bg-gradient-to-br from-indigo-700 to-purple-700 bg-clip-text text-transparent"
                      >
                        {timeRemaining.seconds}
                      </motion.span>
                      <span className="text-xs text-gray-500 uppercase font-medium">Detik</span>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <div className="mb-6 py-4 text-center bg-gray-100 rounded-xl">
                  <p className="text-gray-600 font-medium">Lelang ini telah berakhir</p>
                </div>
              )}
              
              <div className="mb-6 space-y-3">
                {/* Penawaran tertinggi */}
                <motion.div 
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.2 }}
                  className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-3 flex justify-between items-center border border-green-100"
                >
                  <div className="flex items-center">
                    <TrendingUp className="w-4 h-4 text-green-600 mr-2" />
                    <span className="text-sm text-gray-700">Penawaran Tertinggi</span>
                  </div>
                  <span className="text-sm font-bold text-green-700">
                    {formatCurrency(auction?.current_price || 0)}
                  </span>
                </motion.div>
                
                {/* Jumlah penawaran */}
                <motion.div 
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.2 }}
                  className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl p-3 flex justify-between items-center border border-indigo-100"
                >
                  <div className="flex items-center">
                    <Users className="w-4 h-4 text-indigo-600 mr-2" />
                    <span className="text-sm text-gray-700">Jumlah Penawaran</span>
                  </div>
                  <span className="text-sm font-bold text-indigo-700">{bids.length}</span>
                </motion.div>
                
                {/* Kenaikan minimum */}
                <motion.div 
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.2 }}
                  className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-3 flex justify-between items-center border border-purple-100"
                >
                  <div className="flex items-center">
                    <Zap className="w-4 h-4 text-purple-600 mr-2" />
                    <span className="text-sm text-gray-700">Kenaikan Minimum</span>
                  </div>
                  <span className="text-sm font-bold text-purple-700">{formatCurrency(auction?.min_bid_increment || 0)}</span>
                </motion.div>
              </div>
              
              <div className="border-t border-gray-100 pt-6 mb-6">
                <h3 className="font-semibold text-gray-800 mb-3">Deskripsi Produk</h3>
                <div className="prose text-gray-600 max-w-none">
                  {formatDescription(auction?.description || '')}
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 mb-6 border border-indigo-100">
                <div className="flex items-start">
                  <Info className="w-5 h-5 text-indigo-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-indigo-800 mb-1">Informasi Lelang</h4>
                    <p className="text-sm text-indigo-700">
                      Untuk mengikuti lelang, Anda perlu melakukan penawaran dengan nilai minimal {formatCurrency((auction?.current_price || 0) + (auction?.min_bid_increment || 0))}.
                      Penawaran tertinggi saat lelang berakhir akan menjadi pemenang.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="mt-8">
                <motion.button 
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                  className={`w-full py-3 px-6 text-white rounded-xl font-semibold flex items-center justify-center shadow-lg ${
                    timeRemaining.isEnded 
                      ? "bg-gray-500 cursor-not-allowed" 
                      : "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 transition-all"
                  }`}
                  disabled={timeRemaining.isEnded}
                >
                  <Zap className="w-5 h-5 mr-2" />
                  {timeRemaining.isEnded ? "Lelang Telah Berakhir" : "Ikuti Lelang"}
                </motion.button>
              </div>
            </div>
            
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
                  <span className="text-sm text-gray-600">Pembayaran hanya dilakukan jika menang lelang</span>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>
        
        {/* Recent Bids Section */}
        {bids.length > 0 && (
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mb-16"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-700 to-purple-700 bg-clip-text text-transparent">Penawaran Terakhir</h2>
            </div>
            
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-indigo-100/50">
              <div className="overflow-x-auto">
                <table className="w-full min-w-full divide-y divide-gray-200">
                  <thead className="bg-gradient-to-r from-indigo-50 to-purple-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Penawar
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Nilai Penawaran
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Waktu
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {bids.slice(0, 5).map((bid, index) => (
                      <motion.tr 
                        key={bid.id} 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: 0.1 * index }}
                        className="hover:bg-indigo-50/50 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{bid.bidder_name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-bold text-green-600">{formatCurrency(bid.bid_amount)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(bid.created_at).toLocaleString('id-ID', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.section>
        )}
        
        {/* Video Modal */}
        {activeVideo && (
          <div 
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
            onClick={closeVideoModal}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative w-full max-w-4xl" 
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                className="absolute -top-12 right-0 text-white p-2"
                onClick={closeVideoModal}
                aria-label="Tutup"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <div className="rounded-xl overflow-hidden shadow-2xl bg-black">
                <video 
                  src={activeVideo} 
                  className="w-full aspect-video" 
                  controls 
                  autoPlay
                ></video>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
} 