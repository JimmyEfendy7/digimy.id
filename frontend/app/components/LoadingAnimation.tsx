"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

// Interface untuk partikel
interface Particle {
  top: string;
  left: string;
  duration: number;
  delay: number;
}

// Fungsi untuk menghasilkan partikel dengan posisi acak
const generateParticles = (count: number): Particle[] => {
  return Array.from({ length: count }).map(() => ({
    top: `${Math.random() * 100}%`,
    left: `${Math.random() * 100}%`,
    duration: 2 + Math.random() * 3,
    delay: Math.random() * 2,
  }));
};

export default function LoadingAnimation() {
  const [progress, setProgress] = useState(0);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  
  // Track mounting status untuk menghindari hydration error
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  // Buat partikel hanya di sisi client
  useEffect(() => {
    if (isMounted) {
      setParticles(generateParticles(20));
    }
  }, [isMounted]);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      if (progress < 100) {
        setProgress(prev => Math.min(prev + 2, 100));
      }
    }, 20);
    
    return () => clearTimeout(timer);
  }, [progress]);
  
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-blue-900">
      {/* Animated particles - hanya ditampilkan setelah client-side hydration */}
      <div className="absolute inset-0 overflow-hidden">
        {isMounted && particles.map((particle, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 rounded-full bg-white/30"
            style={{
              top: particle.top,
              left: particle.left,
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.1, 0.5, 0.1],
            }}
            transition={{
              duration: particle.duration,
              repeat: Infinity,
              delay: particle.delay,
            }}
          />
        ))}
      </div>
      
      {/* Logo animation */}
      <div className="relative mb-12">
        <motion.div
          className="w-24 h-24 rounded-full border-t-4 border-l-4 border-r-4 border-transparent border-b-4 border-purple-500"
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute inset-0 w-24 h-24 rounded-full border-t-4 border-l-4 border-transparent border-r-4 border-purple-300"
          animate={{ rotate: -360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
          initial={{ scale: 0.8, opacity: 0.5 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1, repeat: Infinity, repeatType: "reverse" }}
        >
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M12 2L4 6V18L12 22L20 18V6L12 2Z"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M12 22V12"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M20 6L12 12L4 6"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </motion.div>
      </div>
      
      {/* Progress bar */}
      <div className="w-64 h-1 bg-gray-700 rounded-full overflow-hidden mb-4">
        <motion.div
          className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500"
          style={{ width: `${progress}%` }}
          initial={{ width: "0%" }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
      
      {/* Loading text */}
      <div className="relative">
        <motion.p 
          className="text-white/90 text-lg font-medium"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          Memuat DIGIPRO
        </motion.p>
        
        <motion.div
          className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-purple-400 to-transparent"
          animate={{
            scaleX: [0, 1, 0],
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
          }}
        />
      </div>
    </div>
  );
} 