import { Suspense } from "react";
import Hero from "./components/Hero";
import ProductSection from "./components/ProductSection";
import ServiceSection from "./components/ServiceSection";
import AuctionSection from "./components/AuctionSection";
import Link from "next/link";
import { 
  fetchAllProducts, 
  fetchPopularServices,
  fetchActiveAuctions 
} from "./lib/api";

export default async function Home() {
  // Fetch data for homepage
  const featuredProducts = await fetchAllProducts(10, 1);
  
  // Fetch featured services with logging
  console.log("[DEBUG] Fetching popular services...");
  const featuredServices = await fetchPopularServices(8);
  console.log("[DEBUG] Popular services response:", featuredServices);
  
  const activeAuctions = await fetchActiveAuctions(8);

  return (
    <>
      <Hero />
      
      {/* Lelang Digital - Dipindahkan ke posisi paling atas */}
      <Suspense fallback={<div className="h-32 flex items-center justify-center">Memuat Lelang...</div>}>
        <AuctionSection 
          title="Lelang Digital Sedang Berlangsung" 
          auctions={activeAuctions.data || []}
          viewAllLink="/auctions"
          description="Ikuti lelang digital menarik yang sedang berlangsung saat ini dan dapatkan penawaran terbaik"
        />
      </Suspense>
      
      <Suspense fallback={<div className="h-32 flex items-center justify-center">Memuat Produk...</div>}>
        <ProductSection 
          title="Produk Digital Terpopuler" 
          products={featuredProducts.data || []}
          viewAllLink="/products"
          description="Produk digital berkualitas tinggi yang paling diminati"
        />
      </Suspense>
      
      {/* Menambahkan tampilan Jasa Digital Terpopuler */}
      <Suspense fallback={<div className="h-32 flex items-center justify-center">Memuat Jasa...</div>}>
        <ServiceSection 
          title="Jasa Digital Terpopuler" 
          services={featuredServices.data || []}
          viewAllLink="/services"
          description="Temukan jasa digital berkualitas tinggi dari para profesional terbaik"
        />
      </Suspense>
    </>
  );
}
