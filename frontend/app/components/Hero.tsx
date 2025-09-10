"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, ChevronRight, Zap, ShoppingBag, Briefcase } from "lucide-react";

// Definisi tipe untuk particle
interface Particle {
  id: number;
  top: string;
  left: string;
  animationDuration: number;
  animationDelay: number;
}

const Hero = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [particles, setParticles] = useState<Particle[]>([]);
  const [isClient, setIsClient] = useState(false);
  const router = useRouter();

  // Daripada menggunakan Math.random() saat render, gunakan useEffect untuk meng-generate partikel
  useEffect(() => {
    // Tandai bahwa kita sudah di client-side
    setIsClient(true);
    
    // Generate array of particles dengan posisi random yang konsisten
    const newParticles = Array.from({ length: 15 }, (_, i) => ({
      id: i,
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      animationDuration: 3 + Math.random() * 2,
      animationDelay: Math.random() * 2,
    }));
    
    setParticles(newParticles);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <div className="relative bg-gradient-to-br from-indigo-900 via-purple-800 to-blue-900 h-[600px] overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-20 bg-[url('/grid-pattern.svg')] bg-repeat"></div>
      
      {/* Animated Particles - Hanya render di client-side */}
      <div className="absolute inset-0">
        {isClient && particles.map((particle) => (
          <motion.div
            key={particle.id}
            className="absolute w-2 h-2 rounded-full bg-white/30"
            style={{
              top: particle.top,
              left: particle.left,
            }}
            animate={{
              y: [0, -20, 0],
              opacity: [0.2, 0.5, 0.2],
            }}
            transition={{
              duration: particle.animationDuration,
              repeat: Infinity,
              delay: particle.animationDelay,
            }}
          />
        ))}
      </div>
      
      {/* Animated Waves */}
      <div className="absolute bottom-0 left-0 right-0">
        <motion.div
          initial={{ y: 100, opacity: 0.3 }}
          animate={{ y: 0, opacity: 0.4 }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            repeatType: "reverse",
            ease: "easeInOut",
          }}
          className="w-full h-32 bg-white/10 rounded-t-[100%]"
        ></motion.div>
        <motion.div
          initial={{ y: 70, opacity: 0.3 }}
          animate={{ y: 0, opacity: 0.2 }}
          transition={{
            duration: 3,
            repeat: Infinity,
            repeatType: "reverse",
            ease: "easeInOut",
            delay: 0.3,
          }}
          className="w-full h-32 mt-[-20px] bg-white/10 rounded-t-[100%]"
        ></motion.div>
      </div>

      {/* Hero Content */}
      <div className="container mx-auto px-4 relative z-10 h-full flex items-center justify-center">
        <div className="max-w-3xl text-center">
          <motion.h1
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6"
          >
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-300 via-pink-300 to-purple-300">
              Marketplace Digital
            </span>{" "}
            <br />
            Terlengkap di Indonesia
          </motion.h1>
          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-xl text-indigo-100 mb-8 max-w-2xl mx-auto"
          >
            Platform marketplace terkemuka untuk lelang digital, produk digital, dan jasa digital berkualitas di Indonesia
          </motion.p>

          {/* Search Box */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="relative max-w-xl mx-auto"
          >
            <form onSubmit={handleSearch} className="relative">
              <div className="relative">
                <Search className="w-5 h-5 absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Cari produk, jasa, atau lelang digital..."
                  className="w-full py-4 pl-12 pr-32 rounded-full shadow-xl focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-gray-800"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white py-2 px-6 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                >
                  Cari
                </button>
              </div>
            </form>
          </motion.div>

          {/* Quick Category Links */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-wrap justify-center gap-4 mt-8"
          >
            <Link 
              href="/auctions" 
              category="Lelang Digital" 
              icon={<Zap size={18} />} 
              primary={true} 
            />
            <Link 
              href="/products" 
              category="Produk Digital" 
              icon={<ShoppingBag size={18} />} 
            />
            <Link 
              href="/services" 
              category="Jasa Digital" 
              icon={<Briefcase size={18} />} 
            />
          </motion.div>
        </div>
      </div>
    </div>
  );
};

const Link = ({ 
  href, 
  category, 
  icon, 
  primary = false 
}: { 
  href: string; 
  category: string; 
  icon?: React.ReactNode;
  primary?: boolean;
}) => {
  const router = useRouter();
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={() => router.push(href)}
      className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-white transition-all shadow-md ${
        primary 
          ? "bg-gradient-to-r from-pink-600 to-purple-600 font-semibold" 
          : "bg-white/10 hover:bg-white/20"
      }`}
    >
      {icon}
      <span>{category}</span>
      <ChevronRight className="w-4 h-4" />
    </motion.button>
  );
};

export default Hero; 